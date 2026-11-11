import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';

export class PostProcessingManager {
  constructor(scene, camera, renderer) {
    this.composer = new EffectComposer(renderer);

    // Render Pass
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);

    // Unreal Bloom Pass
    // Resolution, strength, radius, threshold
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2, // Strength
      0.5, // Radius
      1.0  // Threshold - pale arctic sky (dbe9f4) must not bloom into a white blob
    );
    this.composer.addPass(bloomPass);

    // Film Pass (Grain)
    // noise intensity, scanlines, scanlines intensity, grayscale
    const filmPass = new FilmPass(0.08, 0, 0, false);
    this.composer.addPass(filmPass);

    // Vignette Pass
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms["offset"].value = 0.95;
    vignettePass.uniforms["darkness"].value = 0.7; // 1.0 crushed the lower frame to black
    this.composer.addPass(vignettePass);
  }

  render() {
    this.composer.render();
  }

  resize(width, height) {
    this.composer.setSize(width, height);
  }
}
