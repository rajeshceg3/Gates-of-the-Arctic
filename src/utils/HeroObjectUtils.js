import * as THREE from 'three';
import { distortGeometry } from './GeometryUtils.js';

export function createInukshuk() {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.9,
        flatShading: true
    });

    // Base (large flat stone)
    let baseGeo = new THREE.BoxGeometry(1.2, 0.4, 0.8);
    baseGeo = distortGeometry(baseGeo, 1, 0.1);
    const base = new THREE.Mesh(baseGeo, material);
    base.position.set(0, 0.2, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Legs (two vertical stones)
    let legGeo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
    legGeo = distortGeometry(legGeo, 1, 0.1); // Reuse geometry for organic feel? No, create new if needed. But here reusing is fine as they are transformed differently.

    const leg1 = new THREE.Mesh(legGeo.clone(), material); // Clone to allow independent potential mods later
    leg1.position.set(-0.3, 0.8, 0);
    leg1.rotation.z = 0.1;
    leg1.castShadow = true;
    leg1.receiveShadow = true;
    group.add(leg1);

    const leg2 = new THREE.Mesh(legGeo.clone(), material);
    leg2.position.set(0.3, 0.8, 0);
    leg2.rotation.z = -0.1;
    leg2.castShadow = true;
    leg2.receiveShadow = true;
    group.add(leg2);

    // Body (Horizontal stone)
    let bodyGeo = new THREE.BoxGeometry(1.0, 0.5, 0.4);
    bodyGeo = distortGeometry(bodyGeo, 1, 0.1);
    const body = new THREE.Mesh(bodyGeo, material);
    body.position.set(0, 1.4, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head (Small stone)
    let headGeo = new THREE.IcosahedronGeometry(0.25, 0);
    headGeo = distortGeometry(headGeo, 1, 0.1);
    const head = new THREE.Mesh(headGeo, material);
    head.position.set(0, 1.8, 0);
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    return group;
}
