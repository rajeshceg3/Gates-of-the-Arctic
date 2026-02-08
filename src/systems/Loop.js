import { Clock } from 'three';

const clock = new Clock();

class Loop {
  constructor(camera, scene, renderer) {
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.updatables = [];
  }

  setRenderCallback(callback) {
    this.renderCallback = callback;
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      this.tick();
      if (this.renderCallback) {
        this.renderCallback();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    });
  }

  stop() {
    this.renderer.setAnimationLoop(null);
  }

  tick() {
    // Delta time in seconds
    const delta = clock.getDelta();
    for (const object of this.updatables) {
      if (object.tick) {
          object.tick(delta);
      }
    }
  }
}

export { Loop };
