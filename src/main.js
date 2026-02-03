import * as THREE from 'three';
import { Loop } from './systems/Loop.js';
import { InputController } from './systems/InputController.js';
import { CameraRig } from './systems/CameraRig.js';
import { ZoneManager } from './world/ZoneManager.js';
import { TundraZone } from './world/TundraZone.js';
import { MountainZone } from './world/MountainZone.js';
import { RiverZone } from './world/RiverZone.js';
import { AudioManager } from './systems/AudioManager.js';

async function main() {
  const container = document.querySelector('#app');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdbe9f4); // Pale atmospheric blue
  scene.fog = new THREE.FogExp2(0xdbe9f4, 0.02);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadows
  container.appendChild(renderer.domElement);

  // Systems
  const loop = new Loop(camera, scene, renderer);
  const input = new InputController();
  const rig = new CameraRig(camera, input);
  const zoneManager = new ZoneManager(scene);
  const audio = new AudioManager();

  // Initialize audio and hide UI on first user interaction
  const initInteraction = () => {
    audio.init();

    const ui = document.getElementById('instructions');
    if (ui) {
        ui.classList.add('fade-out');
    }

    window.removeEventListener('click', initInteraction);
    window.removeEventListener('keydown', initInteraction);
    window.removeEventListener('touchstart', initInteraction);
  };
  window.addEventListener('click', initInteraction);
  window.addEventListener('keydown', initInteraction);
  window.addEventListener('touchstart', initInteraction);

  // Register Zones
  zoneManager.register('tundra', TundraZone);
  zoneManager.register('mountain', MountainZone);
  zoneManager.register('river', RiverZone);

  // Initial Zone
  await zoneManager.switchTo('tundra');

  loop.updatables.push(rig);
  loop.updatables.push(zoneManager);

  loop.start();

  // Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

main();
