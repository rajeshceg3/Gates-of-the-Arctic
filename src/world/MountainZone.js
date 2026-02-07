import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';

class MountainZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xdbe9f4);
        scene.fog = new THREE.FogExp2(0xdbe9f4, 0.025); // Slightly denser fog for depth
    }

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xeef0ff, 0x222222, 0.5);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.add(dirLight);

    // Terrain
    const geometry = new THREE.PlaneGeometry(300, 300, 256, 256);
    const count = geometry.attributes.position.count;

    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;

    const colorRock = new THREE.Color(0x444455);
    const colorSnow = new THREE.Color(0xffffff);
    const colorLow = new THREE.Color(0x556655); // Greenish grey at bottom
    const tempColor = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i); // Z in world

        const distFromCenter = Math.abs(x);

        // Ridged noise for sharp peaks
        // 1 - abs(noise) creates ridges
        let nBase = noise(x * 0.015, y * 0.015);
        let ridged = 1.0 - Math.abs(nBase);
        ridged = Math.pow(ridged, 3.0); // Sharpen ridges

        let height = ridged * 50;

        // Secondary shapes
        height += noise(x * 0.05, y * 0.05) * 5;

        // Detail
        height += noise(x * 0.2, y * 0.2) * 1.0;
        height += noise(x * 0.5, y * 0.5) * 0.2;

        // Valley masking
        // Smooth step function to flat valley floor
        let valley = Math.min(1.0, distFromCenter / 60.0);
        valley = valley * valley * (3 - 2 * valley); // Smoothstep

        height *= valley; // Flatten near center

        // General slope up away from center to enclose valley
        if (distFromCenter > 20) {
            height += (distFromCenter - 20) * 0.4;
        }

        // Add random slight variation to break perfect valley floor
        if (distFromCenter < 20) {
            height += noise(x * 0.1, y * 0.1) * 0.5;
        }

        positions.setZ(i, height);

        // Colors
        // Snow based on height and noise
        let snowNoise = noise(x * 0.05, y * 0.05) * 8; // Large variation
        let detailNoise = noise(x * 0.5, y * 0.5);

        let snowLine = 20 + snowNoise;

        // Rock/Grass transition at bottom
        let lowLine = 5 + noise(x * 0.1, y * 0.1) * 3;

        if (height > snowLine) {
             // Pure snow or mixed
             let t = (height - snowLine) / 5.0;
             t = Math.min(1, t + detailNoise * 0.2);
             tempColor.copy(colorRock).lerp(colorSnow, t);
        } else if (height > lowLine) {
             // Rock
             let t = (height - lowLine) / (snowLine - lowLine);
             // Mix in some snow patches
             if (detailNoise > 0.6 && height > 15) {
                 tempColor.copy(colorRock).lerp(colorSnow, 0.5);
             } else {
                 tempColor.copy(colorLow).lerp(colorRock, t);
             }
        } else {
             // Low (grass/moss)
             tempColor.copy(colorLow);
             // Variation
             tempColor.multiplyScalar(0.9 + detailNoise * 0.2);
        }

        colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: false
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);
  }
}

export { MountainZone };
