import { Group } from 'three';

class Zone extends Group {
  constructor() {
    super();
  }

  // To be implemented by subclasses
  async load(scene, fieldNotes) {
    console.log('Loading zone...');
    this.fieldNotes = fieldNotes;
  }

  unload() {
    console.log('Unloading zone...');
    // Traverse and dispose geometries/materials to avoid memory leaks
    this.traverse((object) => {
      if (object.isMesh) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            for (let i = 0, l = object.material.length; i < l; i++) {
              object.material[i].dispose();
            }
          } else {
            object.material.dispose();
          }
        }
      }
    });
    this.clear();
  }

  tick(delta) {
    // Optional per-frame updates
  }
}

export { Zone };
