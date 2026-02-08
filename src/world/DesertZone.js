import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';
import { TerrainHelper } from '../utils/TerrainHelper.js';

class DesertZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xeedcb3); // Hazy hot sky
        scene.fog = new THREE.FogExp2(0xeedcb3, 0.0005); // Low fog for vastness
    }

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(6000, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false
    });
    const sCount = skyGeo.attributes.position.count;
    const sColors = new Float32Array(sCount * 3);
    const sPos = skyGeo.attributes.position;
    const topColor = new THREE.Color(0x4488bb); // Deep blue zenith
    const horizonColor = new THREE.Color(0xeedcb3); // Hazy horizon
    const tempColor = new THREE.Color();

    for(let i=0; i<sCount; i++) {
        const y = sPos.getY(i);
        const t = Math.max(0, (y + 1000) / 7000); // Normalize
        tempColor.copy(horizonColor).lerp(topColor, Math.pow(t, 0.5));
        sColors[i*3] = tempColor.r;
        sColors[i*3+1] = tempColor.g;
        sColors[i*3+2] = tempColor.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(sColors, 3));
    this.add(new THREE.Mesh(skyGeo, skyMat));


    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x884422, 0.6);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(50, 100, 50); // High sun
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
       // Dunes
       let h = noise(x * 0.002, y * 0.002) * 40;

       // Ridges (dune crests)
       let n = noise(x * 0.005, y * 0.005);
       let ridge = Math.sin(x * 0.01 + n * 2.0); // Directional waves
       h += ridge * 10;

       // Detail
       h += noise(x * 0.02, y * 0.02) * 2.0;
       h += noise(x * 0.1, y * 0.1) * 0.5;
       return h;
    };

    const colorSand = new THREE.Color(0xd2b48c);
    const colorDarkSand = new THREE.Color(0xaa8866);
    const colorRock = new THREE.Color(0x805040);

    const colorFn = (x, y, h, slope) => {
       // Recompute ridge for coloring logic
       let n = noise(x * 0.005, y * 0.005);
       let ridge = Math.sin(x * 0.01 + n * 2.0);

       // Colors
       // Crests are lighter, troughs are darker/redder
       let t = (h + 20) / 60; // Normalize roughly
       t = Math.max(0, Math.min(1, t));

       // Add noise to color mix
       let cNoise = noise(x * 0.05, y * 0.05);

       if (h > 15 && ridge > 0.5) {
           // Peak
           return tempColor.copy(colorSand).lerp(new THREE.Color(0xffeebb), 0.2);
       } else {
           tempColor.copy(colorDarkSand).lerp(colorSand, t + cNoise * 0.1);
       }

       // Rocky patches
       if (noise(x * 0.01, y * 0.01) > 0.6) {
           tempColor.lerp(colorRock, 0.5);
       }
       return tempColor;
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
        flatShading: false,
        side: THREE.DoubleSide
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);

    // Cacti
    let cactusGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 6);
    cactusGeo = distortGeometry(cactusGeo, 2, 0.1);
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }); // White for tint

    // Dry Bushes
    let bushGeo = new THREE.IcosahedronGeometry(0.4, 0);
    bushGeo = distortGeometry(bushGeo, 3, 0.2);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0 });

    // Rocks
    let rockGeo = new THREE.IcosahedronGeometry(0.8, 0);
    rockGeo = distortGeometry(rockGeo, 2, 0.2);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

    // Poisson Sampling
    const sampleSize = 4900;
    const offset = sampleSize / 2;
    const pds = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30); // Sparse vegetation
    const points = pds.fill();

    const cactusMesh = new THREE.InstancedMesh(cactusGeo, cactusMat, points.length);
    const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, points.length);
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, points.length);

    cactusMesh.castShadow = true; cactusMesh.receiveShadow = true;
    bushMesh.castShadow = true; bushMesh.receiveShadow = true;
    rockMesh.castShadow = true; rockMesh.receiveShadow = true;

    let cCount = 0, bCount = 0, rCount = 0;
    const dummy = new THREE.Object3D();
    const instColor = new THREE.Color();

    const cactusBase = new THREE.Color(0x4a6a3a);
    const bushBase = new THREE.Color(0x665544);
    const rockBase = new THREE.Color(0x805040);

    points.forEach((p) => {
        const x = p.x - offset;
        const z = p.y - offset;

        const h = TerrainHelper.getHeightAt(x, z, this.heightData, this.terrainSize, this.terrainSegments);

        dummy.position.set(x, h, z);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);

        const rand = Math.random();
        if (rand < 0.1) {
            // Cactus
            const s = 1 + Math.random();
            dummy.scale.set(s, s, s);
            dummy.position.y += s; // Pivot at bottom
            dummy.updateMatrix();
            cactusMesh.setMatrixAt(cCount, dummy.matrix);

            instColor.copy(cactusBase).multiplyScalar(0.8 + Math.random() * 0.4);
            cactusMesh.setColorAt(cCount, instColor);
            cCount++;
        } else if (rand < 0.4) {
            // Bush
            const s = 0.5 + Math.random() * 0.5;
            dummy.scale.set(s, s, s);
            dummy.position.y += s * 0.4;
            dummy.updateMatrix();
            bushMesh.setMatrixAt(bCount, dummy.matrix);

            instColor.copy(bushBase).multiplyScalar(0.8 + Math.random() * 0.4);
            bushMesh.setColorAt(bCount, instColor);
            bCount++;
        } else if (rand < 0.5) {
            // Rock
            const s = 0.5 + Math.random();
            dummy.scale.set(s, s, s);
            dummy.position.y += s * 0.4;
            dummy.updateMatrix();
            rockMesh.setMatrixAt(rCount, dummy.matrix);

            instColor.copy(rockBase).multiplyScalar(0.8 + Math.random() * 0.4);
            rockMesh.setColorAt(rCount, instColor);
            rCount++;
        }
    });

    cactusMesh.count = cCount;
    bushMesh.count = bCount;
    rockMesh.count = rCount;

    this.add(cactusMesh);
    this.add(bushMesh);
    this.add(rockMesh);
  }

  tick(delta, camera) {
      if (camera && this.dirLight) {
          const x = camera.position.x;
          const z = camera.position.z;
          this.dirLight.position.set(x + 50, 100, z + 50);
          this.dirLight.target.position.set(x, 0, z);
          this.dirLight.target.updateMatrixWorld();
      }
  }
}

export { DesertZone };
