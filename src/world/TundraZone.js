import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';
import { TerrainHelper } from '../utils/TerrainHelper.js';
import { GrassSystem } from './GrassSystem.js';
import { CloudSystem } from './CloudSystem.js';

class TundraZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xdbe9f4);
        scene.fog = new THREE.FogExp2(0xdbe9f4, 0.0005); // Reduced fog density for vastness
    }

    // Lighting
    // Warmer, lower sun for "Gates of the Arctic" golden hour feel
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffccaa, 1.0); // Warmer light
    dirLight.position.set(-50, 15, -50); // Much lower sun angle (15 degrees)
    dirLight.castShadow = true;
    dirLight.shadow.bias = -0.0005;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    // Configure shadow camera
    const d = 200;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 4000;

    this.add(dirLight);
    this.dirLight = dirLight;

    // Ensure target is added so we can move it
    this.add(dirLight.target);

    // Terrain
    const size = 5000;
    const segments = 1024; // Increased resolution and size

    // Height Function
    const heightFn = (x, y) => {
       // Perlin noise for height (y is world Z)
       let z = noise(x * 0.05, y * 0.05) * 2;
       z += noise(x * 0.1, y * 0.1) * 0.5;
       z += noise(x * 0.5, y * 0.5) * 0.1;
       z += noise(x * 2.0, y * 2.0) * 0.05; // Extra detail
       return z;
    };

    // Placement Function for Grass
    const placementFn = (x, z, h) => {
        // Place grass where height is low (tundra plains)
        // Avoid water level (h < 0) and high peaks (h > 1.5)
        // Add noise to make it patchy

        let n = noise(x * 0.2, z * 0.2); // Same scale as colorFn
        let detail = noise(x * 1.0, z * 1.0) * 0.2;

        let heightFactor = h + n * 0.5 + detail;

        // Matches the "Green" area of colorFn roughly
        if (h > -0.5 && heightFactor < 1.6) {
            // Further reduce density based on noise to create patches
            // Only place if noise is > 0
            return (n + detail) > -0.2;
        }
        return false;
    };

    // Initialize Grass System
    this.grassSystem = new GrassSystem(this, size, segments, heightFn, placementFn);
    this.grassSystem.generate();

    // Initialize Cloud System
    this.cloudSystem = new CloudSystem();
    this.add(this.cloudSystem);

    // Color Function
    const colorRock = new THREE.Color(0x555555);
    const colorGrass = new THREE.Color(0x5da130);
    const colorSnow = new THREE.Color(0xffffff);
    const tempColor = new THREE.Color();

    const colorFn = (x, y, h, slope) => {
       // Coloring based on height and noise
       let n = noise(x * 0.2, y * 0.2);
       let detail = noise(x * 1.0, y * 1.0) * 0.2; // High freq detail

       let heightFactor = h + n * 0.5 + detail;

       if (heightFactor > 2.2) {
           return colorSnow;
       } else if (heightFactor > 1.5) {
           let t = (heightFactor - 1.5) / 0.7;
           t = Math.max(0, Math.min(1, t));
           return tempColor.copy(colorRock).lerp(colorSnow, t);
       } else {
           let t = Math.max(0, n + detail + 0.5); // Mix rock and grass based on noise
           t = Math.max(0, Math.min(1, t));
           return tempColor.copy(colorGrass).lerp(colorRock, t);
       }
    };

    const { geometry, heightData } = TerrainHelper.generate(size, segments, heightFn, colorFn);
    this.heightData = heightData;
    this.terrainSize = size;
    this.terrainSegments = segments;

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: false, // Smooth shading
        side: THREE.DoubleSide
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);

    // Scattered elements (Rocks)
    // Distort a dodecahedron
    let rockGeo = new THREE.IcosahedronGeometry(0.8, 0);
    rockGeo = distortGeometry(rockGeo, 2, 0.3);

    // Use white material so we can tint via instance colors
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false, roughness: 0.8 });

    // Poisson Sampling
    const sampleSize = 4900;
    const offset = sampleSize / 2;
    const pds = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30); // Increased spacing to manage count
    const points = pds.fill();

    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, points.length);
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    const baseRockColor = new THREE.Color(0x666666);
    const rockVarColor = new THREE.Color(0x888888);

    // Pebbles (Small rocks)
    const pdsPebbles = new PoissonDiskSampling(sampleSize, sampleSize, 15, 15);
    const pebblePoints = pdsPebbles.fill();
    let pebbleGeo = new THREE.IcosahedronGeometry(0.15, 0);
    pebbleGeo = distortGeometry(pebbleGeo, 5, 0.05);
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false, roughness: 0.9 });
    const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebblePoints.length);
    pebbles.receiveShadow = true;
    pebbles.castShadow = true;

    const basePebbleColor = new THREE.Color(0x444444);


    const dummy = new THREE.Object3D();
    const instColor = new THREE.Color();

    // Setup Rocks
    points.forEach((p, i) => {
        const x = p.x - offset;
        const z = p.y - offset;

        // Use precise height from helper
        const yHeight = TerrainHelper.getHeightAt(x, z, this.heightData, this.terrainSize, this.terrainSegments);

        dummy.position.set(x, yHeight, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const scale = 0.5 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);
        // Slightly sink
        dummy.position.y -= 0.1 * scale;

        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);

        // Color variation
        instColor.copy(baseRockColor).lerp(rockVarColor, Math.random() * 0.5).multiplyScalar(0.8 + Math.random() * 0.4);
        rocks.setColorAt(i, instColor);
    });

    // Setup Pebbles
    pebblePoints.forEach((p, i) => {
        const x = p.x - offset;
        const z = p.y - offset;

        const yHeight = TerrainHelper.getHeightAt(x, z, this.heightData, this.terrainSize, this.terrainSegments);

        dummy.position.set(x, yHeight + 0.05, z); // Slightly above ground
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const scale = 0.5 + Math.random() * 0.5;
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();
        pebbles.setMatrixAt(i, dummy.matrix);

        instColor.copy(basePebbleColor).multiplyScalar(0.8 + Math.random() * 0.4);
        pebbles.setColorAt(i, instColor);
    });

    this.add(rocks);
    this.add(pebbles);
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

          this.dirLight.position.set(x - 50, 15, z - 50); // Keep low angle
          this.dirLight.target.position.set(x, 0, z);
          this.dirLight.target.updateMatrixWorld();
      }
  }
}

export { TundraZone };
