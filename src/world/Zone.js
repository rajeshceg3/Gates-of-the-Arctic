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
            object.material.forEach((m) => m.dispose());
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
