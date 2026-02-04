import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';

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
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.add(dirLight);

    // Terrain (Valley with river bed)
    const geometry = new THREE.PlaneGeometry(200, 200, 256, 256);
    const count = geometry.attributes.position.count;
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;

    const colorGrass = new THREE.Color(0x3a5f0b);
    const colorSand = new THREE.Color(0x8b7e66); // Muddy/sandy bank
    const tempColor = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i); // World Z

        // River path meander
        // Use noise to offset the center of the river based on Y (Z)
        const meander = noise(y * 0.02) * 30; // +/- 15 units

        const distFromRiver = Math.abs(x - meander);

        let height = 0;

        // River channel profile
        if (distFromRiver < 8) {
            // Deep river bed
            // Smoothly curve down
            // cos interpolation from -1 to 1 scaled
            const normalized = distFromRiver / 8; // 0 center, 1 bank
            height = -3 + Math.pow(normalized, 2) * 3;
        } else if (distFromRiver < 15) {
            // Banks rising
            height = (distFromRiver - 8) * 0.5;
        } else {
            // Plains/Hills
            // Base height + noise
            height = 3.5 + noise(x * 0.05, y * 0.05) * 1.5;
        }

        positions.setZ(i, height);

        // Colors
        if (height < 0.5) {
             // Underwater / Shore
             tempColor.copy(colorSand);
        } else if (height < 2.0) {
             // Transition
             const t = (height - 0.5) / 1.5;
             tempColor.copy(colorSand).lerp(colorGrass, t);
        } else {
             tempColor.copy(colorGrass);
        }

        // Add some noise variation to color
        const n = noise(x * 0.2, y * 0.2);
        tempColor.r += n * 0.05;
        tempColor.g += n * 0.05;
        tempColor.b += n * 0.05;

        colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1.0,
        flatShading: false
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);

    // Water Plane
    // Large enough to cover all meanders
    const waterGeo = new THREE.PlaneGeometry(200, 200, 32, 32);
    const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x4682B4,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.5, // Glass-like transmission
        thickness: 1.0,
        opacity: 0.8,
        transparent: true,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5; // Water level
    this.add(water);
  }
}

export { RiverZone };
