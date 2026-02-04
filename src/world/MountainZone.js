import { Zone } from './Zone.js';
import * as THREE from 'three';

class MountainZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xdbe9f4);
        scene.fog = new THREE.FogExp2(0xdbe9f4, 0.02);
    }

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xeef0ff, 0x222222, 0.5);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    this.add(dirLight);

    // Terrain
    const geometry = new THREE.PlaneGeometry(300, 300, 64, 64);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i); // Z in world

        // Create a valley path in the middle (x near 0)
        // Mountains on sides
        const distFromCenter = Math.abs(x);

        let height = 0;
        if (distFromCenter > 20) {
            height = (distFromCenter - 20) * 0.5; // Slope up
            height += Math.random() * 3; // jaggedness
        } else {
            height = Math.random() * 0.5; // Rough path
        }

        positions.setZ(i, height);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x8899aa, // Light Steel Blue / Grey
        roughness: 0.9,
        flatShading: true
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.add(terrain);
  }
}

export { MountainZone };
