import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { TerrainHelper } from '../utils/TerrainHelper.js';
import { GrassSystem } from './GrassSystem.js';
import { CloudSystem } from './CloudSystem.js';
import { createInukshuk, createCairn } from '../utils/HeroObjectUtils.js';

class MountainZone extends Zone {
  async load(scene, fieldNotes) {
    await super.load(scene, fieldNotes);

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xdbe9f4);
        scene.fog = new THREE.FogExp2(0xdbe9f4, 0.0005); // Reduced fog for vastness
    }

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xeef0ff, 0x443333, 0.6); // Warmer ambient
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffeebb, 1.0); // Warmer sun
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    const d = 200;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 4000;

    this.add(dirLight);
    this.dirLight = dirLight;
    this.add(dirLight.target);

    // Functions
    const heightFn = (x, y) => {
        const distFromCenter = Math.abs(x);

        // Ridged noise for sharp peaks
        let nBase = noise(x * 0.001, y * 0.001); // Reduced freq for larger mountains
        let ridged = 1.0 - Math.abs(nBase);
        ridged = Math.pow(ridged, 3.0); // Sharpen ridges

        let height = ridged * 500; // Taller peaks for vastness

        // Secondary shapes
        height += noise(x * 0.005, y * 0.005) * 50;

        // Detail
        height += noise(x * 0.05, y * 0.05) * 5.0;
        height += noise(x * 0.2, y * 0.2) * 1.0;

        // Valley masking
        const valleyWidth = 600.0;
        let valley = Math.min(1.0, distFromCenter / valleyWidth);
        valley = valley * valley * (3 - 2 * valley); // Smoothstep

        height *= valley; // Flatten near center

        // General slope up away from center to enclose valley
        const slopeStart = 200;
        if (distFromCenter > slopeStart) {
            height += (distFromCenter - slopeStart) * 0.3;
        }

        // Add random slight variation to break perfect valley floor
        if (distFromCenter < slopeStart) {
            height += noise(x * 0.05, y * 0.05) * 2.0;
        }
        return height;
    };

    const colorRock = new THREE.Color(0x444455);
    const colorSnow = new THREE.Color(0xffffff);
    const colorLow = new THREE.Color(0x556655); // Greenish grey at bottom
    const tempColor = new THREE.Color();

    const colorFn = (x, y, h, slope) => {
        // Snow based on height and noise
        let snowNoise = noise(x * 0.01, y * 0.01) * 20;
        let detailNoise = noise(x * 0.1, y * 0.1);

        let snowLine = 150 + snowNoise; // Higher snow line

        // Less snow on steep slopes
        if (slope > 0.6) snowLine += 50;

        // Rock/Grass transition at bottom
        let lowLine = 30 + noise(x * 0.02, y * 0.02) * 10;

        if (h > snowLine) {
             // Pure snow or mixed
             let t = (h - snowLine) / 50.0;
             t = Math.min(1, t + detailNoise * 0.2);
             return tempColor.copy(colorRock).lerp(colorSnow, t);
        } else if (h > lowLine) {
             // Rock
             let t = (h - lowLine) / (snowLine - lowLine);
             // Mix in some snow patches
             if (detailNoise > 0.6 && h > 120) {
                 return tempColor.copy(colorRock).lerp(colorSnow, 0.5);
             } else {
                 return tempColor.copy(colorLow).lerp(colorRock, t);
             }
        } else {
             // Low (grass/moss)
             return tempColor.copy(colorLow).multiplyScalar(0.9 + detailNoise * 0.2);
        }
    };

    const size = 5000;
    const segments = 1024;
    const { geometry, heightData } = TerrainHelper.generate(size, segments, heightFn, colorFn);
    this.heightData = heightData;
    this.terrainSize = size;
    this.terrainSegments = segments;

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

    // Initialize Grass System
    const placementFn = (x, z, h) => {
        // Place grass in valleys (low height)
        // Avoid very steep slopes if possible (we don't have slope here easily, but h < 50 is safe valley)
        // Also add some noise to patchiness
        let n = noise(x * 0.1, z * 0.1);
        return h < 50 && n > -0.2;
    };

    this.grassSystem = new GrassSystem(this, size, segments, heightFn, placementFn);
    this.grassSystem.generate();

    // Initialize Cloud System
    this.cloudSystem = new CloudSystem();
    this.add(this.cloudSystem);

    // Hero Object
    const inukshuk = createInukshuk();
    inukshuk.scale.set(5, 5, 5);
    // Get height at 20, 20
    const iy = TerrainHelper.getHeightAt(20, 20, this.heightData, this.terrainSize, this.terrainSegments);
    inukshuk.position.set(20, iy, 20);
    this.add(inukshuk);

    // Hero Object: Cairn
    const cairn = createCairn();
    const cx = 50;
    const cz = 50;
    const cy = TerrainHelper.getHeightAt(cx, cz, this.heightData, this.terrainSize, this.terrainSegments);
    cairn.position.set(cx, cy, cz);
    this.add(cairn);

    // Field Notes
    if (fieldNotes) {
        setTimeout(() => {
            if (!this.parent) return; // Prevent race condition if unloaded
            const addNote = (x, z, text) => {
                 const h = TerrainHelper.getHeightAt(x, z, this.heightData, this.terrainSize, this.terrainSegments);
                 fieldNotes.addNote(new THREE.Vector3(x, h + 5.0, z), text);
            };

            addNote(100, 100, "The spine of the world. Peaks older than memory.");
            addNote(-50, 200, "Where eagles dare not fly. The air is thin here.");
            addNote(0, -150, "Stone ancient as time. Listening.");
            addNote(20, 20, "A marker. Someone stood here before.");
            addNote(50, 50, "Stones piled high. A prayer to the mountain spirits.");
            addNote(-100, -50, "The silence is not empty. It is waiting.");
        }, 1000);
    }
  }

  tick(delta, camera) {
      if (this.grassSystem) {
          this.grassSystem.tick(delta);
      }
      if (this.cloudSystem) {
          this.cloudSystem.tick(delta);
      }

      if (camera && this.dirLight) {
          const x = camera.position.x;
          const z = camera.position.z;

          this.dirLight.position.set(x + 20, 50, z + 20);
          this.dirLight.target.position.set(x, 0, z);
          this.dirLight.target.updateMatrixWorld();
      }
  }
}

export { MountainZone };
