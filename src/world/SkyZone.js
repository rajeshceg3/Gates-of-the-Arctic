import { Zone } from './Zone.js';
import * as THREE from 'three';
import { noise } from '../utils/Noise.js';

class SkyZone extends Zone {
  async load(scene) {
    await super.load();

    // Environment
    if (scene) {
        scene.background = new THREE.Color(0x050510); // Almost black
        scene.fog = new THREE.FogExp2(0x050510, 0.01); // Less fog to see stars
    }

    // Lighting (Night)
    const hemiLight = new THREE.HemisphereLight(0x0a0a20, 0x000000, 1.0);
    this.add(hemiLight);

    // No direct sun, maybe a moon?
    const moonLight = new THREE.DirectionalLight(0xaaccff, 0.2);
    moonLight.position.set(0, 50, -50);
    this.add(moonLight);

    // Terrain (Ice sheet, very dark)
    const geometry = new THREE.PlaneGeometry(300, 300, 64, 64); // Slightly better res
    // Add some subtle noise to ice
    const pos = geometry.attributes.position;
    for(let i=0; i<pos.count; i++){
        const x = pos.getX(i);
        const y = pos.getY(i);
        pos.setZ(i, noise(x*0.1, y*0.1)*0.5);
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
    const starCount = 3000;
    const starPos = new Float32Array(starCount * 3);

    for(let i=0; i<starCount; i++) {
        const x = (Math.random() - 0.5) * 400;
        const y = 10 + Math.random() * 150;
        const z = (Math.random() - 0.5) * 400;

        starPos[i*3] = x;
        starPos[i*3+1] = y;
        starPos[i*3+2] = z;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));

    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, transparent: true, opacity: 0.8, sizeAttenuation: true });
    const stars = new THREE.Points(starsGeo, starsMat);
    this.add(stars);

    // Aurora (Simple ribbons)
    const auroraGroup = new THREE.Group();
    const auroraCount = 6;

    for (let k = 0; k < auroraCount; k++) {
        const ribbonGeo = new THREE.PlaneGeometry(150, 40, 64, 4);
        const ribbonPos = ribbonGeo.attributes.position;

        // Wavy ribbon driven by noise
        for (let i = 0; i < ribbonPos.count; i++) {
            const x = ribbonPos.getX(i);
            const y = ribbonPos.getY(i); // Height of ribbon

            // Offset Z based on X and Y and ID
            const z = noise(x * 0.02, k + y * 0.05) * 20;

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
        ribbon.position.set((Math.random()-0.5)*50, 40 + Math.random()*10, (Math.random()-0.5)*50);
        // Tilt to follow sky dome curvature roughly
        ribbon.rotation.x = (Math.random()-0.5) * 0.5;
        ribbon.rotation.y = (Math.random()-0.5) * 1.0;

        auroraGroup.add(ribbon);
    }
    this.add(auroraGroup);
  }
}

export { SkyZone };
