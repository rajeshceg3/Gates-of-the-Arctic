import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';

class SkyZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0x050510); // Almost black
        scene.fog = new THREE.FogExp2(0x050510, 0.0005); // Less fog to see stars
    }

    // Lighting (Night)
    const hemiLight = new THREE.HemisphereLight(0x0a0a20, 0x000000, 1.0);
    this.add(hemiLight);

    // No direct sun, maybe a moon?
    const moonLight = new THREE.DirectionalLight(0xaaccff, 0.2);
    moonLight.position.set(0, 50, -50);
    this.add(moonLight);
    this.moonLight = moonLight;
    this.add(moonLight.target);

    // Terrain (Ice sheet, very dark)
    const size = 5000;
    const geometry = new THREE.PlaneGeometry(size, size, 512, 512); // Slightly better res
    // Add some subtle noise to ice
    const pos = geometry.attributes.position;
    for(let i=0; i<pos.count; i++){
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, noise(x*0.05, y*0.05)*1.0);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: 0x05101a,
        roughness: 0.2,
        metalness: 0.8,
        flatShading: false
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    terrain.name = 'terrain'; // Name for raycasting
    this.add(terrain);

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 20000; // More stars for vast sky
    const starPos = new Float32Array(starCount * 3);

    for(let i=0; i<starCount; i++) {
        const x = (Math.random() - 0.5) * 8000;
        const y = 10 + Math.random() * 2000;
        const z = (Math.random() - 0.5) * 8000;

        starPos[i*3] = x;
        starPos[i*3+1] = y;
        starPos[i*3+2] = z;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0.8, sizeAttenuation: true });
    const stars = new THREE.Points(starsGeo, starsMat);
    this.add(stars);

    // Aurora (Simple ribbons)
    const auroraGroup = new THREE.Group();
    const auroraCount = 15;

    for (let k = 0; k < auroraCount; k++) {
        const width = 2000 + Math.random() * 2000;
        const ribbonGeo = new THREE.PlaneGeometry(width, 400, 256, 4);
        const ribbonPos = ribbonGeo.attributes.position;

        // Wavy ribbon driven by noise
        for (let i = 0; i < ribbonPos.count; i++) {
            const x = ribbonPos.getX(i);
            const y = ribbonPos.getY(i); // Height of ribbon

            // Offset Z based on X and Y and ID
            const z = noise(x * 0.002, k + y * 0.01) * 100;

            ribbonPos.setZ(i, z);
        }
        ribbonGeo.computeVertexNormals();

        const ribbonMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.4 + k * 0.05, 1.0, 0.5), // Varied greens/teals
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.position.set((Math.random()-0.5)*4000, 400 + Math.random()*200, (Math.random()-0.5)*4000);
        // Tilt to follow sky dome curvature roughly
        ribbon.rotation.x = (Math.random()-0.5) * 0.5;
        ribbon.rotation.y = (Math.random()-0.5) * 3.0; // Random yaw

        auroraGroup.add(ribbon);
    }
    this.add(auroraGroup);
  }

  tick(delta, camera) {
      if (camera && this.moonLight) {
          const x = camera.position.x;
          const z = camera.position.z;

          this.moonLight.position.set(x, 50, z - 50);
          this.moonLight.target.position.set(x, 0, z);
          this.moonLight.target.updateMatrixWorld();
      }
  }
}

export { SkyZone };
