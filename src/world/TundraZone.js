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
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.add(dirLight);

    // Terrain
    const geometry = new THREE.PlaneGeometry(200, 200, 128, 128); // Standard resolution
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

       positions.setZ(i, z);

       // Coloring
       // Mix grass and rock based on noise and height
       let n = noise(x * 0.1, y * 0.1);
       if (z > 2.0) {
           tempColor.copy(colorSnow);
       } else if (z > 1.5) {
           tempColor.copy(colorRock).lerp(colorSnow, (z - 1.5) * 2);
       } else {
           tempColor.copy(colorGrass).lerp(colorRock, Math.max(0, n));
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
    const pds = new PoissonDiskSampling(180, 180, 5, 30);
    const points = pds.fill();

    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, points.length);
    rocks.castShadow = true;
    rocks.receiveShadow = true;

    const dummy = new THREE.Object3D();

    points.forEach((p, i) => {
        const x = p.x - 90;
        const z = p.y - 90;

        let yHeight = noise(x * 0.05, z * 0.05) * 2;
        yHeight += noise(x * 0.1, z * 0.1) * 0.5;
        yHeight += noise(x * 0.5, z * 0.5) * 0.1;

        dummy.position.set(x, yHeight, z);
        dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const scale = 0.5 + Math.random() * 1.5;
        dummy.scale.set(scale, scale, scale);

        dummy.position.y += scale * 0.4;

        dummy.updateMatrix();
        rocks.setMatrixAt(i, dummy.matrix);
    });

    this.add(rocks);
  }
}

export { TundraZone };
