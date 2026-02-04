import { Zone } from './Zone.js';
import * as THREE from 'three';

class TundraZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xdbe9f4);
        scene.fog = new THREE.FogExp2(0xdbe9f4, 0.02);
    }

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-50, 20, -50); // Low sun angle
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    this.add(dirLight);

    // Terrain
    const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);

    // Simple noise for unevenness
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
       // Just some random noise for now
       const z = Math.random() * 0.5;
       positions.setZ(i, z);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x5da130, // Desaturated green
        roughness: 1.0,
        flatShading: true
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.add(terrain);

    // Scattered elements (Rocks)
    const rockGeo = new THREE.DodecahedronGeometry(0.8); // Simple geometric shapes
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, flatShading: true });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 100);

    const dummy = new THREE.Object3D();
    for(let i=0; i<100; i++) {
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        dummy.position.set(x, 0, z); // We need to offset y based on scale?

        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const scale = 0.5 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);

        // Adjust Y so it sits on ground roughly
        dummy.position.y = scale * 0.5;

        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
    }
    this.add(rocks);
  }
}

export { TundraZone };
