import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';

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
    const colorRock = new THREE.Color(0x555555);
    const tempColor = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i); // World Z

        // River path meander
        // Use noise to offset the center of the river based on Y (Z)
        const meander = noise(y * 0.02) * 30; // +/- 30 units

        const distFromRiver = Math.abs(x - meander);

        let height = 0;
        let bankFactor = 0; // 0 = river, 1 = plain

        // River channel profile
        if (distFromRiver < 8) {
            // Deep river bed
            const normalized = distFromRiver / 8; // 0 center, 1 bank
            height = -3 + Math.pow(normalized, 2) * 3;
            bankFactor = 0;
        } else if (distFromRiver < 18) {
            // Banks rising
            height = (distFromRiver - 8) * 0.4;
            // Add some noise to bank shape
            height += noise(x * 0.2, y * 0.2) * 0.5;
            bankFactor = (distFromRiver - 8) / 10.0;
        } else {
            // Plains/Hills
            // Base height + noise
            height = 4.0 + noise(x * 0.05, y * 0.05) * 1.5;
            height += noise(x * 0.2, y * 0.2) * 0.2;
            bankFactor = 1;
        }

        positions.setZ(i, height);

        // Colors
        let n = noise(x * 0.1, y * 0.1);
        let detail = noise(x * 1.0, y * 1.0) * 0.2;

        // Height-based mixing with noise
        if (height < 0.5) {
             // Underwater / Shore
             tempColor.copy(colorSand);
             tempColor.lerp(colorRock, Math.max(0, detail * 2)); // Some muddy rocks
        } else if (height < 3.0) {
             // Transition Sand -> Grass
             let t = (height - 0.5) / 2.5;
             // Add noise to transition
             t += n * 0.2;
             t = Math.max(0, Math.min(1, t));
             tempColor.copy(colorSand).lerp(colorGrass, t);
        } else {
             // Grass
             tempColor.copy(colorGrass);
             // Variation
             tempColor.lerp(colorRock, Math.max(0, detail));
        }

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
    const waterGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
    const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x4682B4,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.6,
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

    // Rocks along bank
    let rockGeo = new THREE.DodecahedronGeometry(0.5);
    rockGeo = distortGeometry(rockGeo, 2, 0.2);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: false, roughness: 0.8 });

    const pds = new PoissonDiskSampling(180, 180, 3, 15);
    const points = pds.fill();

    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, points.length);
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    const dummy = new THREE.Object3D();

    points.forEach((p, i) => {
        const x = p.x - 90;
        const z = p.y - 90;

        // Calculate river pos
        const meander = noise(z * 0.02) * 30;
        const dist = Math.abs(x - meander);

        let visible = false;

        // Only place rocks near the bank/water edge (dist roughly 5 to 15)
        // Or scattered in the shallow water
        if (dist > 5 && dist < 18) {
             visible = true;
             // Check probability based on noise?
             if (Math.random() > 0.4) visible = false;
        }

        if (visible) {
             // Calculate height at this pos (duplicated logic from terrain loop, simplified)
             // We can just raycast or approximation.
             // Duplicating logic is safer for static generation
             let height = 0;
             if (dist < 8) {
                const normalized = dist / 8;
                height = -3 + Math.pow(normalized, 2) * 3;
             } else {
                height = (dist - 8) * 0.4;
                height += noise(x * 0.2, z * 0.2) * 0.5;
             }

             dummy.position.set(x, height + 0.2, z); // Embed slightly
             dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);

             const scale = 0.5 + Math.random() * 0.8;
             dummy.scale.set(scale, scale, scale);
        } else {
             dummy.scale.set(0,0,0);
             dummy.position.set(0, -100, 0); // Hide
        }

        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
    });

    this.add(rocks);
  }
}

export { RiverZone };
