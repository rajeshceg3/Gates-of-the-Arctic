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
    const geometry = new THREE.PlaneGeometry(300, 300, 128, 128);
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

        // Create a valley path in the middle (x near 0)
        // Mountains on sides
        const distFromCenter = Math.abs(x);

        // Multi-octave noise for mountains
        let n = noise(x * 0.03, y * 0.03) * 15;
        n += noise(x * 0.1, y * 0.1) * 4;
        n += noise(x * 0.2, y * 0.2) * 1;

        let height = 0;

        // Valley factor
        // Smooth step function to flat valley floor
        let valley = Math.pow(Math.min(1.0, distFromCenter / 40.0), 2.0);

        height = n * valley; // Flatten near center

        // General slope up away from center
        if (distFromCenter > 10) {
            height += (distFromCenter - 10) * 0.3;
        }

        positions.setZ(i, height);

        // Colors
        if (height > 15) {
             tempColor.copy(colorSnow);
        } else if (height > 8) {
             let t = (height - 8) / 7.0;
             tempColor.copy(colorRock).lerp(colorSnow, t);
        } else {
             let t = Math.max(0, height / 8.0);
             tempColor.copy(colorLow).lerp(colorRock, t);
        }

        colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
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
