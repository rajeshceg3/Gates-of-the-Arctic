import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';
import { distortGeometry } from '../utils/GeometryUtils.js';
import { PoissonDiskSampling } from '../utils/PoissonDiskSampling.js';

class RiverZone extends Zone {
  constructor() {
    super();
    this.time = 0;
  }

  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0xdbe9f4);
        scene.fog = new THREE.FogExp2(0xaaccdd, 0.0005); // Reduced fog
    }

    // Sky Sphere
    const skyGeo = new THREE.SphereGeometry(6000, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        fog: false
    });
    const sCount = skyGeo.attributes.position.count;
    const sColors = new Float32Array(sCount * 3);
    const sPos = skyGeo.attributes.position;
    const topColor = new THREE.Color(0x5588aa); // Blue sky
    const horizonColor = new THREE.Color(0xaaccdd); // Fog color
    const bottomColor = new THREE.Color(0x334455);
    const tempColor = new THREE.Color();

    for(let i=0; i<sCount; i++) {
        const y = sPos.getY(i);
        const t = (y + 3000) / 6000;
        if (t > 0.5) {
            const factor = (t - 0.5) * 2;
            tempColor.copy(horizonColor).lerp(topColor, Math.pow(factor, 0.5));
        } else {
            const factor = t * 2;
            tempColor.copy(bottomColor).lerp(horizonColor, factor);
        }
        sColors[i*3] = tempColor.r;
        sColors[i*3+1] = tempColor.g;
        sColors[i*3+2] = tempColor.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(sColors, 3));
    this.add(new THREE.Mesh(skyGeo, skyMat));

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 20, 0);
    this.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(20, 50, -30);
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

    const colorGrass = new THREE.Color(0x3a5f0b);
    const colorSand = new THREE.Color(0x8b7e66);
    const colorRock = new THREE.Color(0x555555);

    // Store original Z for water calculation reference
    this.terrainHeights = new Float32Array(count);

    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);

        // Scaled up river
        const meander = noise(y * 0.001) * 800; // Wider meander
        const distFromRiver = Math.abs(x - meander);

        let height = 0;
        const riverWidth = 150; // Wider river
        const bankWidth = 400;

        if (distFromRiver < riverWidth) {
            const normalized = distFromRiver / riverWidth;
            height = -15 + Math.pow(normalized, 2) * 15; // Deeper river
        } else if (distFromRiver < (riverWidth + bankWidth)) {
            height = (distFromRiver - riverWidth) * 0.1; // Gentle slope
            height += noise(x * 0.1, y * 0.1) * 2.0;
        } else {
            height = 25.0 + noise(x * 0.01, y * 0.01) * 30.0;
            height += noise(x * 0.1, y * 0.1) * 2.0;
        }

        positions.setZ(i, height);
        this.terrainHeights[i] = height;

        // Colors
        let n = noise(x * 0.1, y * 0.1);
        let detail = noise(x * 0.5, y * 0.5);

        if (height < -5.0) {
             tempColor.copy(colorSand).lerp(colorRock, 0.3);
        } else if (height < 10.0) {
             let t = (height + 5.0) / 15.0;
             t += n * 0.2;
             t = Math.max(0, Math.min(1, t));
             tempColor.copy(colorSand).lerp(colorGrass, t);
        } else {
             tempColor.copy(colorGrass);
             tempColor.lerp(colorRock, Math.max(0, detail * 0.5));
        }

        colors.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.8,
        flatShading: false,
        side: THREE.DoubleSide
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    terrain.name = 'terrain';
    this.add(terrain);

    // Water Plane
    // Use lower res for CPU animation perf, but cover full area
    const waterGeo = new THREE.PlaneGeometry(size, size, 150, 150);
    const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x55aaff,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.8,
        thickness: 1.5,
        opacity: 0.9,
        transparent: true,
        ior: 1.33
    });
    this.water = new THREE.Mesh(waterGeo, waterMat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = -5.0; // Slightly lower water level
    this.add(this.water);

    // Store original water positions for wave calculation
    this.waterBaseZ = Float32Array.from(waterGeo.attributes.position.array);

    // Rocks
    // Large Boulders
    const sampleSize = 4900;
    const offset = sampleSize / 2;
    const pdsLarge = new PoissonDiskSampling(sampleSize, sampleSize, 60, 30);
    this.addRocks(pdsLarge.fill(), 3.0, 6.0, 0x666666, offset);

    // Small Rocks
    const pdsSmall = new PoissonDiskSampling(sampleSize, sampleSize, 30, 15);
    this.addRocks(pdsSmall.fill(), 0.5, 1.5, 0x555555, offset);
  }

  addRocks(points, minScale, maxScale, colorHex, offset) {
      let geo = new THREE.IcosahedronGeometry(1, 0);
      geo = distortGeometry(geo, 2, 0.2);
      const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.8 });
      const mesh = new THREE.InstancedMesh(geo, mat, points.length);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const dummy = new THREE.Object3D();
      let count = 0;

      points.forEach((p, i) => {
          const x = p.x - offset;
          const z = p.y - offset;

          // Recompute height or approx
          const meander = noise(z * 0.001) * 800;
          const dist = Math.abs(x - meander);

          // Place rocks on banks or shallow water
          // River width 150.
          if (dist > 50 && dist < 450) {
               // Calculate height roughly
               let h = 0;
               if (dist < 150) h = -15 + Math.pow(dist/150, 2)*15;
               else h = (dist - 150) * 0.1;
               h += noise(x*0.1, z*0.1)*2.0;

               dummy.position.set(x, h + minScale * 0.5, z);
               dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
               const s = minScale + Math.random() * (maxScale - minScale);
               dummy.scale.set(s, s, s);
               dummy.updateMatrix();
               mesh.setMatrixAt(count++, dummy.matrix);
          }
      });
      mesh.count = count; // Update count to skip unused instances
      this.add(mesh);
  }

  tick(delta, camera) {
      this.time += delta;

      // Animate Water
      if (this.water) {
          const pos = this.water.geometry.attributes.position;

          for(let i=0; i<pos.count; i++) {
              const x = pos.getX(i);
              const y = pos.getY(i);

              // Wave function (Scaled for larger world)
              let z = Math.sin(x * 0.02 + this.time) * 0.5;
              z += Math.sin(y * 0.01 + this.time * 0.8) * 0.5;
              z += noise(x * 0.01 + this.time, y * 0.01) * 0.5;

              pos.setZ(i, z);
          }
          pos.needsUpdate = true;
          this.water.geometry.computeVertexNormals();
      }

      if (camera && this.dirLight) {
          const x = camera.position.x;
          const z = camera.position.z;

          this.dirLight.position.set(x + 20, 50, z - 30);
          this.dirLight.target.position.set(x, 0, z);
          this.dirLight.target.updateMatrixWorld();
      }
  }
}

export { RiverZone };
