import * as THREE from 'three';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcccccc);
scene.fog = new THREE.Fog(0xcccccc, 10, 50);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// Renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

// Ground plane
const geometry = new THREE.PlaneGeometry(1000, 1000);
const material = new THREE.MeshStandardMaterial({ color: 0x5d6042 });
const plane = new THREE.Mesh(geometry, material);
plane.rotation.x = - Math.PI / 2;
scene.add(plane);

// Mountains (Distant)
const mountainGeometry = new THREE.ConeGeometry(20, 40, 4);
const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });

for (let i = 0; i < 10; i++) {
    const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
    const x = (Math.random() - 0.5) * 800;
    const z = -Math.random() * 400 - 100;
    mountain.position.set(x, 20, z);
    scene.add(mountain);
}


// River
const riverGeometry = new THREE.PlaneGeometry(10, 1000);
const riverMaterial = new THREE.MeshStandardMaterial({ color: 0x4444aa, transparent: true, opacity: 0.8 });
const river = new THREE.Mesh(riverGeometry, riverMaterial);
river.rotation.x = - Math.PI / 2;
river.position.set(50, 0.01, 0); // Slightly above the ground
scene.add(river);

// Audio Setup
const listener = new THREE.AudioListener();
camera.add(listener);

const windSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
// audioLoader.load('path/to/wind.mp3', (buffer) => {
//     windSound.setBuffer(buffer);
//     windSound.setLoop(true);
//     windSound.setVolume(0.5);
//     windSound.play();
// });

// Camera Movement
const clock = new THREE.Clock();
const velocity = new THREE.Vector3();
const moveSpeed = 5; // units per second

const keyStates = {};

document.addEventListener('keydown', (event) => {
    keyStates[event.code] = true;
});

document.addEventListener('keyup', (event) => {
    keyStates[event.code] = false;
});

function updateCameraPosition(deltaTime) {
    velocity.set(0, 0, 0);

    if (keyStates['ArrowUp'] || keyStates['KeyW']) {
        velocity.z = -moveSpeed * deltaTime;
    }
    if (keyStates['ArrowDown'] || keyStates['KeyS']) {
        velocity.z = moveSpeed * deltaTime;
    }
    if (keyStates['ArrowLeft'] || keyStates['KeyA']) {
        velocity.x = -moveSpeed * deltaTime;
    }
    if (keyStates['ArrowRight'] || keyStates['KeyD']) {
        velocity.x = moveSpeed * deltaTime;
    }

    camera.position.add(velocity);
}

// Zone Management
const mountains = [];
scene.traverse((object) => {
    if (object.geometry instanceof THREE.ConeGeometry) {
        mountains.push(object);
    }
});

function updateZones() {
    // Simple logic: as you move towards mountains, they become more visible
    // As you move towards the river, it becomes clearer
    const distanceToRiver = Math.abs(camera.position.x - river.position.x);

    // Example: change fog density based on position
    if (camera.position.z < -100) {
        scene.fog.near = 20;
        scene.fog.far = 100; // clearer in the mountains
    } else {
        scene.fog.near = 10;
        scene.fog.far = 50; // foggier in the tundra
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();
    updateCameraPosition(deltaTime);
    updateZones();

    renderer.render(scene, camera);
}

animate();
