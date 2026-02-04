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
        tempColor.copy(colorDarkGreen).lerp(colorBrown, Math.max(0, n * 0.5));

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
    // Trunk - distort it slightly
    let trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 2, 7);
    trunkGeo = distortGeometry(trunkGeo, 3, 0.1);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, flatShading: false });

    // Leaves (Cone) - distort significantly
    let leavesGeo = new THREE.ConeGeometry(1.5, 4, 7);
    leavesGeo = distortGeometry(leavesGeo, 2, 0.5);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false });

    // Poisson Sampling
    const pds = new PoissonDiskSampling(180, 180, 4, 30);
    const points = pds.fill();

    const treeCount = points.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    const leaves = new THREE.InstancedMesh(leavesGeo, leavesMat, treeCount);

    trunks.castShadow = true;
    leaves.castShadow = true;

    // Instance Colors for leaves
    const colorBase = new THREE.Color(0x2d4c1e);
    const colorAutumn = new THREE.Color(0x556622); // Slightly yellowish

    const dummy = new THREE.Object3D();

    points.forEach((p, i) => {
        const x = p.x - 90;
        const z = p.y - 90;

        // Height at this position
        let y = noise(x * 0.03, z * 0.03) * 3;
        y += noise(x * 0.1, z * 0.1) * 0.5;

        // Trunk
        dummy.position.set(x, y + 1, z);
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        // Tilt slightly
        dummy.rotation.x = (Math.random() - 0.5) * 0.2;
        dummy.rotation.z = (Math.random() - 0.5) * 0.2;

        const scale = 0.8 + Math.random() * 0.6;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);

        // Leaves
        // Follow trunk rotation/position
        const trunkPos = dummy.position.clone();
        const trunkRot = dummy.rotation.clone();

        // Offset relative to trunk
        dummy.position.set(0, 2 * scale, 0);
        dummy.position.applyEuler(trunkRot);
        dummy.position.add(trunkPos);

        // dummy.rotation is already set to trunk rotation (which is fine)

        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);

        // Color variation
        tempColor.copy(colorBase).lerp(colorAutumn, Math.random() * 0.5);
        // Vary brightness
        tempColor.multiplyScalar(0.8 + Math.random() * 0.4);

        leaves.setColorAt(i, tempColor);
    });

    this.add(trunks);
    this.add(leaves);
  }
}

export { ForestZone };
