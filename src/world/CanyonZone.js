import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';
import { TerrainHelper } from '../utils/TerrainHelper.js';

class CanyonZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xffdcb3); // Warm hazy sky
        scene.fog = new THREE.FogExp2(0xffdcb3, 0.0005);
    }

    // Sky
    const skyGeo = new THREE.SphereGeometry(6000, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false
    });
    const sCount = skyGeo.attributes.position.count;
    const sColors = new Float32Array(sCount * 3);
    const sPos = skyGeo.attributes.position;
    const topColor = new THREE.Color(0x336699);
    const horizonColor = new THREE.Color(0xffdcb3);
    const tempColor = new THREE.Color();

    for(let i=0; i<sCount; i++) {
        const y = sPos.getY(i);
        const t = Math.max(0, (y + 1000) / 7000);
        tempColor.copy(horizonColor).lerp(topColor, Math.pow(t, 0.5));
        sColors[i*3] = tempColor.r;
        sColors[i*3+1] = tempColor.g;
        sColors[i*3+2] = tempColor.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(sColors, 3));
    this.add(new THREE.Mesh(skyGeo, skyMat));

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffccaa, 0x553322, 0.5);
    hemiLight.position.set(0, 50, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(-50, 80, -20);
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
       // Canyon logic
       let n = noise(x * 0.001, y * 0.001);
       let riverPath = Math.abs(n); // 0 at "river", 1 at peaks

       // Wide canyon floor
       let h = 0;
       if (riverPath < 0.1) {
           h = -20 + riverPath * 50; // Riverbed
       } else {
           // Steep walls
           let t = (riverPath - 0.1) / 0.9;
           // Step function for terraced look
           let steps = 5;
           let stepped = Math.floor(t * steps) / steps;
           // Smooth slightly
           stepped += (t - stepped) * 0.2;

           h = -15 + stepped * 300; // 300 units high cliffs

           // Add noise to walls
           h += noise(x * 0.02, y * 0.02) * 5.0;
       }

       // Detail
       h += noise(x * 0.05, y * 0.05) * 2.0;
       return h;
    };

    const colorTop = new THREE.Color(0xb06040); // Terracotta
    const colorBand = new THREE.Color(0x904030); // Darker red
    const colorBottom = new THREE.Color(0x703020);

    const colorFn = (x, y, h, slope) => {
       // Colors based on height (strata)
       let strata = h + noise(x * 0.05, y * 0.05) * 10.0;
       let band = Math.sin(strata * 0.1); // banding frequency

       if (h < -10) {
           return tempColor.copy(colorBottom).lerp(colorBand, Math.max(0, band));
       } else {
           tempColor.copy(colorTop);
           if (band > 0.5) tempColor.lerp(colorBand, 0.5);
           return tempColor;
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
        flatShading: false, // Smooth shading for organic feel, though canyons are sharp
        side: THREE.DoubleSide
    });

    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);

    // Boulders
    const sampleSize = 4900;
    const pds = new PoissonDiskSampling(sampleSize, sampleSize, 30, 30);
    const points = pds.fill();
    const offset = sampleSize / 2;

    let rockGeo = new THREE.IcosahedronGeometry(1.5, 0);
    rockGeo = distortGeometry(rockGeo, 2, 0.3);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, points.length);
    rocks.castShadow = true; rocks.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let rCount = 0;
    const instColor = new THREE.Color();
    const rockBase = new THREE.Color(0x804030);

    points.forEach((p) => {
        const x = p.x - offset;
        const z = p.y - offset;

        // Recompute filter
        let n = noise(x * 0.001, z * 0.001);
        let riverPath = Math.abs(n);

        // Place rocks mostly in riverbed or top
        if (riverPath < 0.15 || riverPath > 0.8) {
             const h = TerrainHelper.getHeightAt(x, z, this.heightData, this.terrainSize, this.terrainSegments);

             dummy.position.set(x, h + 1, z);
             dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
             const s = 1 + Math.random() * 2;
             dummy.scale.set(s,s,s);
             dummy.updateMatrix();
             rocks.setMatrixAt(rCount, dummy.matrix);

             instColor.copy(rockBase).multiplyScalar(0.8 + Math.random() * 0.4);
             rocks.setColorAt(rCount, instColor);

             rCount++;
        }
    });
    rocks.count = rCount;
    this.add(rocks);
  }

  tick(delta, camera) {
      if (camera && this.dirLight) {
          const x = camera.position.x;
          const z = camera.position.z;
          this.dirLight.position.set(x - 50, 80, z - 20);
          this.dirLight.target.position.set(x, 0, z);
          this.dirLight.target.updateMatrixWorld();
      }
  }
}

export { CanyonZone };
