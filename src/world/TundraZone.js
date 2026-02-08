import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';

class TundraZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xdbe9f4);
        scene.fog = new THREE.FogExp2(0xdbe9f4, 0.0005); // Reduced fog density for vastness
    }

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(-50, 50, -50); // Low sun angle
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
    const geometry = new THREE.PlaneGeometry(size, size, 1024, 1024); // Increased resolution and size
    const count = geometry.attributes.position.count;

    // Create color attribute
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;

    const colorRock = new THREE.Color(0x555555);
    const colorGrass = new THREE.Color(0x5da130);
    const colorSnow = new THREE.Color(0xffffff);
    const tempColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
       const x = positions.getX(i);
       const y = positions.getY(i); // Local Y is world Z before rotation

       // Perlin noise for height
       // Multiple octaves
       let z = noise(x * 0.05, y * 0.05) * 2;
       z += noise(x * 0.1, y * 0.1) * 0.5;
       z += noise(x * 0.5, y * 0.5) * 0.1;
       z += noise(x * 2.0, y * 2.0) * 0.05; // Extra detail

       positions.setZ(i, z);

       // Coloring
       // Mix based on height and noise
       let n = noise(x * 0.2, y * 0.2);
       let detail = noise(x * 1.0, y * 1.0) * 0.2; // High freq detail

       let heightFactor = z + n * 0.5 + detail;

       if (heightFactor > 2.2) {
           tempColor.copy(colorSnow);
       } else if (heightFactor > 1.5) {
           let t = (heightFactor - 1.5) / 0.7;
           t = Math.max(0, Math.min(1, t));
           tempColor.copy(colorRock).lerp(colorSnow, t);
       } else {
           let t = Math.max(0, n + detail + 0.5); // Mix rock and grass based on noise
           t = Math.max(0, Math.min(1, t));
           tempColor.copy(colorGrass).lerp(colorRock, t);
       }

       colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }
    geometry.computeVertexNormals();

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
    let rockGeo = new THREE.DodecahedronGeometry(0.8);
    rockGeo = distortGeometry(rockGeo, 2, 0.3);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, flatShading: false, roughness: 0.8 });

    // Poisson Sampling
    const sampleSize = 4900;
    const offset = sampleSize / 2;
    const pds = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30); // Increased spacing to manage count
    const points = pds.fill();

    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, points.length);
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    // Pebbles (Small rocks)
    const pdsPebbles = new PoissonDiskSampling(sampleSize, sampleSize, 15, 15);
    const pebblePoints = pdsPebbles.fill();
    let pebbleGeo = new THREE.DodecahedronGeometry(0.15);
    pebbleGeo = distortGeometry(pebbleGeo, 5, 0.05);
    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x444444, flatShading: false, roughness: 0.9 });
    const pebbles = new THREE.InstancedMesh(pebbleGeo, pebbleMat, pebblePoints.length);
    pebbles.receiveShadow = true;
    pebbles.castShadow = true;


    const dummy = new THREE.Object3D();

    // Setup Rocks
    points.forEach((p, i) => {
        const x = p.x - offset;
        const z = p.y - offset;

        let yHeight = noise(x * 0.05, z * 0.05) * 2;
        yHeight += noise(x * 0.1, z * 0.1) * 0.5;
        yHeight += noise(x * 0.5, z * 0.5) * 0.1;
        yHeight += noise(x * 2.0, z * 2.0) * 0.05;

        dummy.position.set(x, yHeight, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const scale = 0.5 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);

        dummy.position.y += scale * 0.4;

        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
    });

    // Setup Pebbles
    pebblePoints.forEach((p, i) => {
        const x = p.x - offset;
        const z = p.y - offset;

        let yHeight = noise(x * 0.05, z * 0.05) * 2;
        yHeight += noise(x * 0.1, z * 0.1) * 0.5;
        yHeight += noise(x * 0.5, z * 0.5) * 0.1;
        yHeight += noise(x * 2.0, z * 2.0) * 0.05;

        dummy.position.set(x, yHeight + 0.05, z); // Slightly above ground
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const scale = 0.5 + Math.random() * 0.5;
        dummy.scale.set(scale, scale, scale);

        dummy.updateMatrix();
        pebbles.setMatrixAt(i, dummy.matrix);
    });

    this.add(rocks);
    this.add(pebbles);
  }

  tick(delta, camera) {
      if (camera && this.dirLight) {
          const x = camera.position.x;
          const z = camera.position.z;

          this.dirLight.position.set(x - 50, 50, z - 50);
          this.dirLight.target.position.set(x, 0, z);
          this.dirLight.target.updateMatrixWorld();
      }
  }
}

export { TundraZone };
