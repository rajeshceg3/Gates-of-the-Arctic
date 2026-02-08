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
      0.9  // Threshold
    );
    this.composer.addPass(bloomPass);

    // Film Pass (Grain)
    // noise intensity, scanlines, scanlines intensity, grayscale
    const filmPass = new FilmPass(0.15, 0, 0, false);
    this.composer.addPass(filmPass);

    // Vignette Pass
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms["offset"].value = 0.95;
    vignettePass.uniforms["darkness"].value = 1.6;
    this.composer.addPass(vignettePass);
  }

  render() {
    this.composer.render();
  }

  resize(width, height) {
    this.composer.setSize(width, height);
  }
}
