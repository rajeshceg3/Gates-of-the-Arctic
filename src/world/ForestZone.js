import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';

class ForestZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0x223344); // Dark blue/grey
        scene.fog = new THREE.FogExp2(0x223344, 0.025);
    }

    // Lighting (Darker, moody)
    const hemiLight = new THREE.HemisphereLight(0x445566, 0x112211, 0.4);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffaa88, 0.6); // Sunset/Sunrise feel
    dirLight.position.set(-50, 30, -50);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.add(dirLight);

    // Terrain
    const geometry = new THREE.PlaneGeometry(200, 200, 256, 256);

    // Vertex Colors
    const count = geometry.attributes.position.count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;

    const colorDarkGreen = new THREE.Color(0x1e3f20);
    const colorBrown = new THREE.Color(0x3d2817);
    const tempColor = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i); // Y in local is Z in world

        // Rolling hills with noise
        let height = noise(x * 0.03, y * 0.03) * 3;
        height += noise(x * 0.1, y * 0.1) * 0.5;

        positions.setZ(i, height);

        // Colors
        let n = noise(x * 0.1, y * 0.1);
        // Add high frequency noise to break up gradients
        let detail = noise(x * 0.5, y * 0.5) * 0.3;

        let mixFactor = Math.max(0, n * 0.5 + detail);
        tempColor.copy(colorDarkGreen).lerp(colorBrown, mixFactor);

        colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: false // Smooth shading
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);

    // Trees (Instanced)
    // Trunk
    let trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 2, 7);
    trunkGeo = distortGeometry(trunkGeo, 3, 0.1);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, flatShading: false });

    // Leaves Layers (3 layers for pine tree look)
    let leavesBotGeo = new THREE.ConeGeometry(2.0, 2.5, 7);
    leavesBotGeo = distortGeometry(leavesBotGeo, 2, 0.4);

    let leavesMidGeo = new THREE.ConeGeometry(1.5, 2.5, 7);
    leavesMidGeo = distortGeometry(leavesMidGeo, 2, 0.4);

    let leavesTopGeo = new THREE.ConeGeometry(1.0, 2.0, 7);
    leavesTopGeo = distortGeometry(leavesTopGeo, 2, 0.4);

    const leavesMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false });

    // Poisson Sampling for trees
    const pds = new PoissonDiskSampling(180, 180, 5, 30); // Increased spacing slightly
    const points = pds.fill();
    const treeCount = points.length;

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const leavesBot = new THREE.InstancedMesh(leavesBotGeo, leavesMat, treeCount);
    const leavesMid = new THREE.InstancedMesh(leavesMidGeo, leavesMat, treeCount);
    const leavesTop = new THREE.InstancedMesh(leavesTopGeo, leavesMat, treeCount);

    trunks.castShadow = true;
    leavesBot.castShadow = true;
    leavesMid.castShadow = true;
    leavesTop.castShadow = true;

    // Small rocks/debris
    const pdsRocks = new PoissonDiskSampling(180, 180, 2, 10);
    const rockPoints = pdsRocks.fill();
    let rockGeo = new THREE.DodecahedronGeometry(0.2);
    rockGeo = distortGeometry(rockGeo, 10, 0.1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: false, roughness: 0.8 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, rockPoints.length);
    rocks.receiveShadow = true;
    rocks.castShadow = true;

    // Instance setup
    const colorBase = new THREE.Color(0x2d4c1e);
    const colorAutumn = new THREE.Color(0x556622);
    const dummy = new THREE.Object3D();

    // Setup Trees
    points.forEach((p, i) => {
        const x = p.x - 90;
        const z = p.y - 90;

        let y = noise(x * 0.03, z * 0.03) * 3;
        y += noise(x * 0.1, z * 0.1) * 0.5;

        // Trunk
        dummy.position.set(x, y + 1, z);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        // Tilt slightly
        const tiltX = (Math.random() - 0.5) * 0.2;
        const tiltZ = (Math.random() - 0.5) * 0.2;
        dummy.rotation.x = tiltX;
        dummy.rotation.z = tiltZ;

        const scale = 0.8 + Math.random() * 0.6;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);

        // Leaves Layers
        // Color variation
        tempColor.copy(colorBase).lerp(colorAutumn, Math.random() * 0.5);
        tempColor.multiplyScalar(0.8 + Math.random() * 0.4);

        // Helper to place layer
        const placeLayer = (mesh, yOffset) => {
             dummy.position.set(0, yOffset * scale, 0);
             dummy.position.applyEuler(new THREE.Euler(tiltX, Math.random() * Math.PI, tiltZ)); // Random Y rot for each layer
             dummy.position.add(new THREE.Vector3(x, y + 1, z)); // Relative to trunk base (y+1 is center of trunk)
             // Actually y+1 is center of 2 unit high trunk. Base is at y.
             // Trunk is 2 units high. Center at y+1. Top at y+2.
             // We want leaves to start around y+1 or so.

             dummy.rotation.set(tiltX, Math.random() * Math.PI, tiltZ); // Match tilt
             dummy.scale.set(scale, scale, scale);
             dummy.updateMatrix();
             mesh.setMatrixAt(i, dummy.matrix);
             mesh.setColorAt(i, tempColor);
        };

        // Bottom Layer
        placeLayer(leavesBot, 1.0);
        // Middle Layer
        placeLayer(leavesMid, 2.2);
        // Top Layer
        placeLayer(leavesTop, 3.2);
    });

    // Setup Rocks
    rockPoints.forEach((p, i) => {
         const x = p.x - 90;
         const z = p.y - 90;
         let y = noise(x * 0.03, z * 0.03) * 3;
         y += noise(x * 0.1, z * 0.1) * 0.5;

         dummy.position.set(x, y, z);
         dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
         const scale = 0.5 + Math.random();
         dummy.scale.set(scale, scale, scale);
         dummy.updateMatrix();
         rocks.setMatrixAt(i, dummy.matrix);
    });

    this.add(trunks);
    this.add(leavesBot);
    this.add(leavesMid);
    this.add(leavesTop);
    this.add(rocks);
  }
}

export { ForestZone };
