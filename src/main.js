import * as THREE from 'three';
import { Loop } from './systems/Loop.js';
import { InputController } from './systems/InputController.js';
import { CameraRig } from './systems/CameraRig.js';
import { ZoneManager } from './world/ZoneManager.js';
import { TundraZone } from './world/TundraZone.js';
import { MountainZone } from './world/MountainZone.js';
import { RiverZone } from './world/RiverZone.js';
import { ForestZone } from './world/ForestZone.js';
import { SkyZone } from './world/SkyZone.js';
import { AudioManager } from './systems/AudioManager.js';
import { PostProcessingManager } from './systems/PostProcessing.js';

async function main() {
  const container = document.querySelector('#app');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdbe9f4); // Pale atmospheric blue
  scene.fog = new THREE.FogExp2(0xdbe9f4, 0.02);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadows
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
  container.appendChild(renderer.domElement);

  // Systems
  const loop = new Loop(camera, scene, renderer);
  const input = new InputController();
  const rig = new CameraRig(camera, input, scene);
  const audio = new AudioManager(camera);
  const zoneManager = new ZoneManager(scene, camera, audio);
  const postProcessing = new PostProcessingManager(scene, camera, renderer);
  loop.setRenderCallback(() => postProcessing.render());

  // Initialize audio and hide Landing Screen on button click
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
      startBtn.addEventListener('click', () => {
          audio.init();

          // Hide Landing Screen
          const landing = document.getElementById('landing-screen');
          if (landing) {
              landing.classList.add('fade-out');
              setTimeout(() => { landing.style.display = 'none'; }, 2000);
          }

          // Show HUD
          const ui = document.getElementById('ui');
          if (ui) {
              ui.classList.remove('hidden');
              ui.classList.add('visible');

              // Trigger Zone Label
              zoneManager.showLabel('tundra');
          }

          // Request Pointer Lock (Desktop)
          document.body.requestPointerLock();
      });
  }

  // Settings & Pause Menu Logic
  const settingsBtn = document.getElementById('settings-btn');
  const settingsMenu = document.getElementById('settings-menu');
  const resumeBtn = document.getElementById('resume-btn');
  const audioBtn = document.getElementById('audio-btn');

  if (settingsBtn && settingsMenu) {
    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsMenu.classList.remove('hidden');
      input.setPaused(true);
      document.exitPointerLock();
    });
  }

  if (resumeBtn && settingsMenu) {
    resumeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsMenu.classList.add('hidden');
      input.setPaused(false);
      // Only request lock if not touch (simple heuristic)
      if (!('ontouchstart' in window) || window.innerWidth > 768) {
        document.body.requestPointerLock();
      }
    });
  }

  if (audioBtn) {
    audioBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = audio.toggleMute();
      audioBtn.textContent = isMuted ? "UNMUTE AUDIO" : "MUTE AUDIO";
    });
  }

  // Register Zones
  zoneManager.register('tundra', TundraZone);
  zoneManager.register('mountain', MountainZone);
  zoneManager.register('river', RiverZone);
  zoneManager.register('forest', ForestZone);
  zoneManager.register('sky', SkyZone);

  // Initial Zone
  await zoneManager.switchTo('tundra');

  // Dev controls to switch zones
  window.addEventListener('keydown', (e) => {
    switch (e.key) {
      case '1': zoneManager.switchTo('tundra'); break;
      case '2': zoneManager.switchTo('mountain'); break;
      case '3': zoneManager.switchTo('river'); break;
      case '4': zoneManager.switchTo('forest'); break;
      case '5': zoneManager.switchTo('sky'); break;
    }
  });

  loop.updatables.push(rig);
  loop.updatables.push(zoneManager);
  loop.updatables.push(audio);

  loop.start();

  // Handle Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postProcessing.resize(window.innerWidth, window.innerHeight);
  });
}

main();
