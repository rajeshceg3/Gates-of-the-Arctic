import { Zone } from './Zone.js';
import * as THREE from 'three';

class RiverZone extends Zone {
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
    dirLight.position.set(0, 50, -50);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    this.add(dirLight);

    // Terrain (Valley with river bed)
    const geometry = new THREE.PlaneGeometry(200, 200, 64, 64);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);

        // River bed in the middle
        let height = 0;
        const dist = Math.abs(x);

        if (dist < 10) {
            height = -2; // River bed depth
        } else if (dist < 20) {
            // Banks
            height = -2 + (dist - 10) * 0.4;
        } else {
            // Plains/Hills
            height = 2 + Math.random() * 0.5;
        }

        positions.setZ(i, height);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x3a5f0b, // Darker vegetation
        roughness: 1.0,
        flatShading: true
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    this.add(terrain);

    // Water Plane
    const waterGeo = new THREE.PlaneGeometry(200, 20, 1, 1); // Narrow strip
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x4682B4,
        roughness: 0.1,
        metalness: 0.8,
        opacity: 0.8,
        transparent: true
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5; // Water level
    this.add(water);
  }
}

export { RiverZone };
