import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TerrainHelper } from '../utils/TerrainHelper.js';
import { GrassSystem } from './GrassSystem.js';
import { CloudSystem } from './CloudSystem.js';

class ForestZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0x223344);
        scene.fog = new THREE.FogExp2(0x445566, 0.0005);
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
    const topColor = new THREE.Color(0x0a1a2a);
    const horizonColor = new THREE.Color(0x445566);
    const bottomColor = new THREE.Color(0x1a1a1a);
    const tempColor = new THREE.Color();

    for(let i=0; i<count; i++) {
        const y = pos.getY(i);
        const t = (y + 3000) / 6000;
        if (t > 0.5) {
            const factor = (t - 0.5) * 2;
            tempColor.copy(horizonColor).lerp(topColor, Math.pow(factor, 0.5));
        } else {
            const factor = t * 2;
            tempColor.copy(bottomColor).lerp(horizonColor, factor);
        }
        colors[i*3] = tempColor.r;
        colors[i*3+1] = tempColor.g;
        colors[i*3+2] = tempColor.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.add(new THREE.Mesh(skyGeo, skyMat));

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0x445566, 0x112211, 0.3);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffbb99, 1.0); // Slightly warmer
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

    // Functions
    const heightFn = (x, y) => {
        // Rolling hills with noise
        let height = noise(x * 0.03, y * 0.03) * 6;
        height += noise(x * 0.1, y * 0.1) * 1.5;
        return height;
    };

    const colorDarkGreen = new THREE.Color(0x1e3f20);
    const colorBrown = new THREE.Color(0x3d2817);

    const colorFn = (x, y, h, slope) => {
        let n = noise(x * 0.1, y * 0.1);
        let detail = noise(x * 0.5, y * 0.5) * 0.3;
        let mixFactor = Math.max(0, n * 0.5 + detail);
        return tempColor.copy(colorDarkGreen).lerp(colorBrown, mixFactor);
    };

    const size = 5000;
    const segments = 1024;
    const { geometry, heightData } = TerrainHelper.generate(size, segments, heightFn, colorFn);
    this.heightData = heightData;
    this.terrainSize = size;
    this.terrainSegments = segments;

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: false,
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

    // Materials
    // Set base colors to white/neutral so we can tint them via instance color
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({
        vertexColors: true, // Multiplied by instance color
        flatShading: false,
        roughness: 0.8,
        side: THREE.DoubleSide
    });

    // Poisson Sampling
    const sampleSize = 4900;
    const offset = sampleSize / 2;
    const pds = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30);
    const points = pds.fill();

    const pointsByType = Array(numTypes).fill().map(() => []);
    points.forEach(p => {
        const typeIdx = Math.floor(Math.random() * numTypes);
        pointsByType[typeIdx].push(p);
    });

    const dummy = new THREE.Object3D();
    const instColor = new THREE.Color();
    const woodBaseColor = new THREE.Color(0x3d2817);
    const leafBaseColor = new THREE.Color(0xffffff); // Neutral, vertex colors handle hue

    for (let t = 0; t < numTypes; t++) {
        const typePoints = pointsByType[t];
        const { wood, leaves } = treeTypes[t];

        if (typePoints.length === 0) continue;

        const woodMesh = new THREE.InstancedMesh(wood, woodMat, typePoints.length);
        const leafMesh = new THREE.InstancedMesh(leaves, leafMat, typePoints.length);

        woodMesh.castShadow = true; woodMesh.receiveShadow = true;
        leafMesh.castShadow = true; leafMesh.receiveShadow = true;

        typePoints.forEach((p, i) => {
             const x = p.x - offset;
             const z = p.y - offset;
             const y = TerrainHelper.getHeightAt(x, z, this.heightData, this.terrainSize, this.terrainSegments);

             dummy.position.set(x, y, z);
             dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
             const s = 0.8 + Math.random() * 0.4;
             dummy.scale.set(s, s, s);
             dummy.updateMatrix();

             woodMesh.setMatrixAt(i, dummy.matrix);
             leafMesh.setMatrixAt(i, dummy.matrix);

             // Tint Wood
             instColor.copy(woodBaseColor).multiplyScalar(0.8 + Math.random() * 0.4);
             woodMesh.setColorAt(i, instColor);

             // Tint Leaves (Variation in brightness/temperature)
             // Slightly warmer or cooler
             instColor.setHSL(Math.random() * 0.1, 0, 1.0); // Slight tint?
             // Actually just brightness
             instColor.copy(leafBaseColor).multiplyScalar(0.8 + Math.random() * 0.4);
             leafMesh.setColorAt(i, instColor);
        });

        this.add(woodMesh);
        this.add(leafMesh);
    }

    // Rocks
    const pdsRocks = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30);
    const rockPoints = pdsRocks.fill();
    let rockGeo = new THREE.DodecahedronGeometry(0.2);
    rockGeo = distortGeometry(rockGeo, 10, 0.1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false, roughness: 0.8 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockPoints.length);
    rocks.receiveShadow = true;
    rocks.castShadow = true;

    const rockBaseColor = new THREE.Color(0x555555);

    rockPoints.forEach((p, i) => {
         const x = p.x - offset;
         const z = p.y - offset;
         const y = TerrainHelper.getHeightAt(x, z, this.heightData, this.terrainSize, this.terrainSegments);

         dummy.position.set(x, y, z);
         dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
         const scale = 0.5 + Math.random();
         dummy.scale.set(scale, scale, scale);
         dummy.updateMatrix();
         rocks.setMatrixAt(i, dummy.matrix);

         instColor.copy(rockBaseColor).multiplyScalar(0.8 + Math.random() * 0.4);
         rocks.setColorAt(i, instColor);
    });
    this.add(rocks);

    // Initialize Grass System
    const placementFn = (x, z, h) => {
        // Cover ground but with some noise patchiness
        let n = noise(x * 0.1, z * 0.1);
        return h < 10.0 && n > -0.3;
    };

    this.grassSystem = new GrassSystem(this, size, segments, heightFn, placementFn);
    this.grassSystem.generate();

    // Initialize Cloud System
    this.cloudSystem = new CloudSystem();
    this.add(this.cloudSystem);
  }

  createTreeGeometry(seed) {
     const woodGeos = [];
     const leafGeos = [];
     const h = 4 + Math.random() * 3;

     // Trunk
     const trunk = new THREE.CylinderGeometry(0.2, 0.4, h, 10);
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

            const branch = new THREE.CylinderGeometry(0.04, 0.1, len, 6);
            branch.translate(0, len/2, 0);
            branch.rotateZ(Math.PI / 2 + 0.1);
            branch.rotateY(angle);
            branch.translate(0, y, 0);
            distortGeometry(branch, 3, 0.02);
            woodGeos.push(branch);

            const clusters = 2;
            for (let k=0; k<clusters; k++) {
                const leaf = new THREE.ConeGeometry(0.5, 1.0, 5);
                leaf.translate(0, 0.5, 0);

                const mix = Math.random();
                tempColor.copy(colorBase).lerp(colorVar, mix).multiplyScalar(0.8 + Math.random() * 0.4);

                const count = leaf.attributes.position.count;
                const colors = new Float32Array(count * 3);
                for(let c=0; c<count; c++) {
                    colors[c*3] = tempColor.r;
                    colors[c*3+1] = tempColor.g;
                    colors[c*3+2] = tempColor.b;
                }
                leaf.setAttribute('color', new THREE.BufferAttribute(colors, 3));

                const distAlong = len * (0.7 + Math.random() * 0.3);
                const vec = new THREE.Vector3(0, 1, 0);
                vec.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2 + 0.1);
                vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
                vec.multiplyScalar(distAlong);

                leaf.rotateX(Math.random());
                leaf.rotateY(Math.random());
                leaf.translate(vec.x, y + vec.y, vec.z);

                distortGeometry(leaf, 2, 0.1);
                leafGeos.push(leaf);
            }
        }
     }

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
      if (this.grassSystem) {
          this.grassSystem.tick(delta);
      }
      if (this.cloudSystem) {
          this.cloudSystem.tick(delta);
      }

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
