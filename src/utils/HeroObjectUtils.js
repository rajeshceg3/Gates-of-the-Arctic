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

export function createStandingStones() {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.9,
        flatShading: true
    });

    const count = 5 + Math.floor(Math.random() * 3); // 5 to 7 stones
    const radius = 5;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5; // Jitter angle
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Tall stone geometry
        let geo = new THREE.BoxGeometry(0.8 + Math.random() * 0.4, 3.5 + Math.random() * 1.5, 0.8 + Math.random() * 0.4);
        geo = distortGeometry(geo, 1, 0.2); // Heavy distortion for ancient look

        const stone = new THREE.Mesh(geo, material);

        // Position on circle
        // Height is roughly 3.5 to 5. Center is at half height (approx 2).
        // Push it down a bit so it's buried (y=1.5).
        stone.position.set(x, 1.5, z);

        // Rotate randomly
        stone.rotation.y = Math.random() * Math.PI * 2;
        stone.rotation.x = (Math.random() - 0.5) * 0.2; // Slight tilt
        stone.rotation.z = (Math.random() - 0.5) * 0.2;

        stone.castShadow = true;
        stone.receiveShadow = true;
        group.add(stone);
    }

    return group;
}

export function createCairn() {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0x666666,
        roughness: 0.9,
        flatShading: true
    });

    const stones = 3 + Math.floor(Math.random() * 3); // 3-5 stones
    let currentY = 0;
    let prevScale = 1.0;

    for (let i = 0; i < stones; i++) {
        const scale = prevScale * (0.6 + Math.random() * 0.3); // Get smaller
        const radius = 0.4 * scale;

        let geo = new THREE.IcosahedronGeometry(radius, 0);
        geo = distortGeometry(geo, 2, 0.15); // Rough distortion

        const stone = new THREE.Mesh(geo, material);

        // Stack logic: Center + slight offset for balance
        const offsetX = (Math.random() - 0.5) * 0.1 * scale;
        const offsetZ = (Math.random() - 0.5) * 0.1 * scale;

        stone.position.set(offsetX, currentY + radius * 0.8, offsetZ);
        stone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        stone.castShadow = true;
        stone.receiveShadow = true;

        group.add(stone);

        currentY += radius * 1.4; // Stack up
        prevScale = scale;
    }

    return group;
}

export function createDriftwood() {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0xaaccbb, // Bleached / Grey-ish wood
        roughness: 1.0,
        flatShading: true
    });

    const pieces = 2 + Math.floor(Math.random() * 2); // 2-3 pieces

    for (let i = 0; i < pieces; i++) {
        const length = 2.0 + Math.random() * 2.0;
        const thickness = 0.15 + Math.random() * 0.1;

        let geo = new THREE.CylinderGeometry(thickness, thickness * 0.7, length, 6);
        geo = distortGeometry(geo, 4, 0.1); // Twisting/warping

        const wood = new THREE.Mesh(geo, material);

        // Lay flat-ish
        wood.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        wood.rotation.y = Math.random() * Math.PI * 2;

        wood.position.set((Math.random() - 0.5) * 1.0, thickness, (Math.random() - 0.5) * 1.0);

        wood.castShadow = true;
        wood.receiveShadow = true;

        group.add(wood);
    }

    return group;
}
