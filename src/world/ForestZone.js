import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

class ForestZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0x223344);
        // Fog color matches horizon for seamless blend
        scene.fog = new THREE.FogExp2(0x445566, 0.0005); // Reduced for vastness
    }

    // Sky
    const skyGeo = new THREE.SphereGeometry(6000, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false
    });

    const count = skyGeo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    const pos = skyGeo.attributes.position;

    const topColor = new THREE.Color(0x0a1a2a); // Deep night blue
    const horizonColor = new THREE.Color(0x445566); // Fog color
    const bottomColor = new THREE.Color(0x1a1a1a); // Ground darkness
    const tempColor = new THREE.Color();

    for(let i=0; i<count; i++) {
        const y = pos.getY(i);
        // y ranges from -3000 to 3000 (roughly with 6000 radius)
        const t = (y + 3000) / 6000;

        if (t > 0.5) {
            // Horizon (0.5) to Zenith (1.0)
            const factor = (t - 0.5) * 2;
            tempColor.copy(horizonColor).lerp(topColor, Math.pow(factor, 0.5));
        } else {
            // Bottom (0.0) to Horizon (0.5)
            const factor = t * 2;
            tempColor.copy(bottomColor).lerp(horizonColor, factor);
        }

        colors[i*3] = tempColor.r;
        colors[i*3+1] = tempColor.g;
        colors[i*3+2] = tempColor.b;
    }

    skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.add(sky);

    // Lighting (Darker, moody)
    const hemiLight = new THREE.HemisphereLight(0x445566, 0x112211, 0.3);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffaa88, 1.0); // Brighter sunset/sunrise feel
    dirLight.position.set(-50, 30, -50);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    const d = 200;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 4000;

    this.add(dirLight);
    this.dirLight = dirLight;
    this.add(dirLight.target);

    // Terrain
    const size = 5000;
    const geometry = new THREE.PlaneGeometry(size, size, 1024, 1024);

    // Vertex Colors
    const vCount = geometry.attributes.position.count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vCount * 3), 3));

    const positions = geometry.attributes.position;
    const vColors = geometry.attributes.color;

    const colorDarkGreen = new THREE.Color(0x1e3f20);
    const colorBrown = new THREE.Color(0x3d2817);

    // Improved terrain loop
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i); // Y in local is Z in world

        // Rolling hills with noise
        let height = noise(x * 0.03, y * 0.03) * 6; // Taller hills for vastness
        height += noise(x * 0.1, y * 0.1) * 1.5;

        positions.setZ(i, height);

        // Colors
        let n = noise(x * 0.1, y * 0.1);
        // Add high frequency noise to break up gradients
        let detail = noise(x * 0.5, y * 0.5) * 0.3;

        let mixFactor = Math.max(0, n * 0.5 + detail);
        tempColor.copy(colorDarkGreen).lerp(colorBrown, mixFactor);

        vColors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: false, // Smooth shading
        side: THREE.DoubleSide
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);

    // Create Tree Prototypes
    const treeTypes = [];
    const numTypes = 3;

    for (let t = 0; t < numTypes; t++) {
        treeTypes.push(this.createTreeGeometry(t));
    }

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, flatShading: false, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: false,
        roughness: 0.8,
        side: THREE.DoubleSide
    });

    // Poisson Sampling for trees
    const sampleSize = 4900;
    const offset = sampleSize / 2;
    const pds = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30); // Less dense for huge area
    const points = pds.fill();

    // Group points by type
    const pointsByType = Array(numTypes).fill().map(() => []);
    points.forEach(p => {
        const typeIdx = Math.floor(Math.random() * numTypes);
        pointsByType[typeIdx].push(p);
    });

    const dummy = new THREE.Object3D();

    // Create InstancedMeshes
    for (let t = 0; t < numTypes; t++) {
        const typePoints = pointsByType[t];
        const { wood, leaves } = treeTypes[t];

        if (typePoints.length === 0) continue;

        const woodMesh = new THREE.InstancedMesh(wood, woodMat, typePoints.length);
        const leafMesh = new THREE.InstancedMesh(leaves, leafMat, typePoints.length);

        woodMesh.castShadow = true;
        woodMesh.receiveShadow = true;
        leafMesh.castShadow = true;
        leafMesh.receiveShadow = true;

        typePoints.forEach((p, i) => {
             const x = p.x - offset;
             const z = p.y - offset;

             // Get height
             let y = noise(x * 0.03, z * 0.03) * 6;
             y += noise(x * 0.1, z * 0.1) * 1.5;

             dummy.position.set(x, y, z); // Tree base at ground

             // Random rotation
             dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
             // Slight random scale
             const s = 0.8 + Math.random() * 0.4;
             dummy.scale.set(s, s, s);

             dummy.updateMatrix();

             woodMesh.setMatrixAt(i, dummy.matrix);
             leafMesh.setMatrixAt(i, dummy.matrix);
        });

        this.add(woodMesh);
        this.add(leafMesh);
    }

    // Small rocks/debris (Recycled logic)
    const pdsRocks = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30); // Less dense rocks
    const rockPoints = pdsRocks.fill();
    let rockGeo = new THREE.DodecahedronGeometry(0.2);
    rockGeo = distortGeometry(rockGeo, 10, 0.1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: false, roughness: 0.8 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockPoints.length);
    rocks.receiveShadow = true;
    rocks.castShadow = true;

    rockPoints.forEach((p, i) => {
         const x = p.x - offset;
         const z = p.y - offset;
         let y = noise(x * 0.03, z * 0.03) * 6;
         y += noise(x * 0.1, z * 0.1) * 1.5;

         dummy.position.set(x, y, z);
         dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
         const scale = 0.5 + Math.random();
         dummy.scale.set(scale, scale, scale);
         dummy.updateMatrix();
         rocks.setMatrixAt(i, dummy.matrix);
    });
    this.add(rocks);
  }

  createTreeGeometry(seed) {
     const woodGeos = [];
     const leafGeos = [];

     // Randomness based on seed/loop
     const h = 4 + Math.random() * 3; // Height 4-7

     // Trunk
     const trunk = new THREE.CylinderGeometry(0.2, 0.4, h, 7);
     trunk.translate(0, h/2, 0);
     distortGeometry(trunk, 2, 0.05);
     woodGeos.push(trunk);

     // Branches
     const layers = 6;
     const colorBase = new THREE.Color(0x2d4c1e);
     const colorVar = new THREE.Color(0x556622);
     const tempColor = new THREE.Color();

     for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const y = 1.0 + t * (h - 1.5);
        const radius = 2.0 * (1 - t) + 0.5;

        const numBranches = 3 + Math.floor(Math.random() * 3);

        for (let j = 0; j < numBranches; j++) {
            const angle = (j / numBranches) * Math.PI * 2 + Math.random() * 0.5;
            const len = radius * (0.6 + Math.random() * 0.6);

            // Branch Wood
            const branch = new THREE.CylinderGeometry(0.04, 0.1, len, 4);
            branch.translate(0, len/2, 0);
            branch.rotateZ(Math.PI / 2 + 0.1); // Angle down
            branch.rotateY(angle);
            branch.translate(0, y, 0);
            distortGeometry(branch, 3, 0.02);
            woodGeos.push(branch);

            // Leaf Cluster
            // Multiple cones per branch end for volume
            const clusters = 2;
            for (let k=0; k<clusters; k++) {
                const leaf = new THREE.ConeGeometry(0.5, 1.0, 5);
                leaf.translate(0, 0.5, 0);

                // Randomize leaf color
                const mix = Math.random();
                tempColor.copy(colorBase).lerp(colorVar, mix).multiplyScalar(0.8 + Math.random() * 0.4);

                // Add color attribute
                const count = leaf.attributes.position.count;
                const colors = new Float32Array(count * 3);
                for(let c=0; c<count; c++) {
                    colors[c*3] = tempColor.r;
                    colors[c*3+1] = tempColor.g;
                    colors[c*3+2] = tempColor.b;
                }
                leaf.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                // Position at end of branch with some variation
                const distAlong = len * (0.7 + Math.random() * 0.3);

                // Calculate position of branch point
                // Branch was rotated Z by PI/2+0.1. So it points mostly in X (if Y rot is 0).
                // Then rotated Y by angle.

                // Local branch vector
                const vec = new THREE.Vector3(0, 1, 0); // Up
                vec.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2 + 0.1);
                vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                vec.multiplyScalar(distAlong);

                leaf.rotateX(Math.random());
                leaf.rotateY(Math.random());
                leaf.translate(vec.x, y + vec.y, vec.z); // Relative to trunk center at y

                distortGeometry(leaf, 2, 0.1);
                leafGeos.push(leaf);
            }
        }
     }

     // Top
     const top = new THREE.ConeGeometry(0.6, 1.5, 5);
     top.translate(0, h, 0);
     tempColor.copy(colorBase).lerp(colorVar, 0.5);
     const count = top.attributes.position.count;
     const colors = new Float32Array(count * 3);
     for(let c=0; c<count; c++) {
        colors[c*3] = tempColor.r;
        colors[c*3+1] = tempColor.g;
        colors[c*3+2] = tempColor.b;
     }
     top.setAttribute('color', new THREE.BufferAttribute(colors, 3));
     distortGeometry(top, 2, 0.1);
     leafGeos.push(top);

     return {
        wood: mergeGeometries(woodGeos),
        leaves: mergeGeometries(leafGeos)
     };
  }

  tick(delta, camera) {
      if (camera && this.dirLight) {
          const x = camera.position.x;
          const z = camera.position.z;

          this.dirLight.position.set(x - 50, 30, z - 50);
          this.dirLight.target.position.set(x, 0, z);
          this.dirLight.target.updateMatrixWorld();
      }
  }
}

export { ForestZone };
