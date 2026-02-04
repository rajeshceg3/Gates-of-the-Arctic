import { Zone } from './Zone.js';
import * as THREE from 'three';

class ForestZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0x223344); // Dark blue/grey
        scene.fog = new THREE.FogExp2(0x223344, 0.03); // More fog
    }

    // Lighting (Darker, moody)
    const hemiLight = new THREE.HemisphereLight(0x445566, 0x112211, 0.4);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffaa88, 0.6); // Sunset/Sunrise feel
    dirLight.position.set(-50, 30, -50);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    this.add(dirLight);

    // Terrain
    const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getY(i); // Y in local is Z in world due to rotation
        // Rolling hills
        const height = Math.sin(x * 0.05) * 2 + Math.cos(z * 0.05) * 2;
        positions.setZ(i, height);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x1e3f20, // Dark Forest Green
        roughness: 0.9,
        flatShading: true
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.add(terrain);

    // Trees (Instanced)
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817 });

    // Leaves (Cone)
    const leavesGeo = new THREE.ConeGeometry(1.5, 4, 6);
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x2d4c1e });

    // Merged geometry for simpler instancing or just two instanced meshes?
    // Two instanced meshes is easier to manage colors.

    const count = 300;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves = new THREE.InstancedMesh(leavesGeo, leavesMat, count);

    trunks.castShadow = true;
    leaves.castShadow = true;

    const dummy = new THREE.Object3D();
    const _position = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        // Random position, avoid center slightly
        const angle = Math.random() * Math.PI * 2;
        const radius = 5 + Math.random() * 90;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Height at this position
        const y = Math.sin(x * 0.05) * 2 + Math.cos(z * 0.05) * 2;

        // Trunk
        dummy.position.set(x, y + 1, z); // Center of trunk (height 2) is at y=1 relative to ground
        dummy.rotation.set(0, Math.random() * Math.PI, 0);
        const scale = 0.8 + Math.random() * 0.5;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);

        // Leaves
        dummy.position.set(x, y + 1 + 2 * scale, z); // Sit on top of trunk
        dummy.updateMatrix();
        leaves.setMatrixAt(i, dummy.matrix);
    }

    this.add(trunks);
    this.add(leaves);
  }
}

export { ForestZone };
