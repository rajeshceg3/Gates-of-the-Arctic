import { Zone } from './Zone.js';
import * as THREE from 'three';

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
    const geometry = new THREE.PlaneGeometry(300, 300, 32, 32);
    const material = new THREE.MeshStandardMaterial({
        color: 0x05101a,
        roughness: 0.2,
        metalness: 0.8
    });
    const terrain = new THREE.Mesh(geometry, material);
    terrain.rotation.x = -Math.PI / 2;
    this.add(terrain);

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount*3; i++) {
        starPos[i] = (Math.random() - 0.5) * 400; // Wide spread
        if (i % 3 === 1 && starPos[i] < 10) starPos[i] = 10 + Math.random() * 100; // Keep Y above ground
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 });
    const stars = new THREE.Points(starsGeo, starsMat);
    this.add(stars);

    // Aurora (Simple ribbons)
    const auroraGroup = new THREE.Group();
    const auroraCount = 5;

    for (let k = 0; k < auroraCount; k++) {
        const ribbonGeo = new THREE.PlaneGeometry(100, 20, 32, 1);
        const ribbonPos = ribbonGeo.attributes.position;

        // Wavy ribbon
        for (let i = 0; i < ribbonPos.count; i++) {
            const x = ribbonPos.getX(i);
            const y = ribbonPos.getY(i);
            const z = Math.sin(x * 0.1 + k) * 5;
            ribbonPos.setZ(i, z);
        }
        ribbonGeo.computeVertexNormals();

        const ribbonMat = new THREE.MeshBasicMaterial({
            color: 0x00ffaa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbon.position.set((Math.random()-0.5)*100, 30 + Math.random()*20, (Math.random()-0.5)*100);
        ribbon.rotation.x = Math.random() * 0.5;
        ribbon.rotation.y = Math.random() * Math.PI;
        auroraGroup.add(ribbon);
    }
    this.add(auroraGroup);
  }
}

export { SkyZone };
