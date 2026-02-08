import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';

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

    // Terrain
    const size = 5000;
    const geometry = new THREE.PlaneGeometry(size, size, 1024, 1024);
    const count = geometry.attributes.position.count;

    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));

    const positions = geometry.attributes.position;
    const colors = geometry.attributes.color;

    const colorTop = new THREE.Color(0xb06040); // Terracotta
    const colorBand = new THREE.Color(0x904030); // Darker red
    const colorBottom = new THREE.Color(0x703020);

    for (let i = 0; i < count; i++) {
       const x = positions.getX(i);
       const y = positions.getY(i);

       // Canyon logic
       // Ridged noise
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

       positions.setZ(i, h);

       // Colors based on height (strata)
       let strata = h + noise(x * 0.05, y * 0.05) * 10.0;
       let band = Math.sin(strata * 0.1); // banding frequency

       if (h < -10) {
           tempColor.copy(colorBottom).lerp(colorBand, Math.max(0, band));
       } else {
           tempColor.copy(colorTop);
           if (band > 0.5) tempColor.lerp(colorBand, 0.5);
       }

       colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: false, // Smooth shading for organic feel, though canyons are sharp
        side: THREE.DoubleSide
    });
    // For canyon, flat shading might look better on low poly, but we have high poly now.
    // Let's stick to smooth.

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

    let rockGeo = new THREE.DodecahedronGeometry(1.5);
    rockGeo = distortGeometry(rockGeo, 2, 0.3);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x804030, roughness: 0.9 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, points.length);
    rocks.castShadow = true; rocks.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let rCount = 0;

    points.forEach((p) => {
        const x = p.x - offset;
        const z = p.y - offset;

        // Recompute h roughly
        let n = noise(x * 0.001, z * 0.001);
        let riverPath = Math.abs(n);

        // Place rocks mostly in riverbed or top
        if (riverPath < 0.15 || riverPath > 0.8) {
             let h = 0;
             // Simplified height calc for placement
             if (riverPath < 0.1) h = -20 + riverPath * 50;
             else {
                 let t = (riverPath - 0.1) / 0.9;
                 let steps = 5;
                 let stepped = Math.floor(t * steps) / steps;
                 stepped += (t - stepped) * 0.2;
                 h = -15 + stepped * 300;
             }
             h += noise(x*0.05, z*0.05)*2.0;

             dummy.position.set(x, h + 1, z);
             dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
             const s = 1 + Math.random() * 2;
             dummy.scale.set(s,s,s);
             dummy.updateMatrix();
             rocks.setMatrixAt(rCount++, dummy.matrix);
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
