import * as THREE from 'three';

class FieldNoteSystem {
  constructor(camera) {
    this.camera = camera;
    this.notes = [];
    this.activeNote = null;
    this.container = document.getElementById('field-note-container');
    this.textElement = document.getElementById('field-note-text');
  }

  /**
   * Add a field note trigger.
   * @param {THREE.Vector3} position - World position of the note trigger.
   * @param {string} text - The text to display.
   * @param {number} radius - Detection radius (default 15).
   */
  addNote(position, text, radius = 15) {
    this.notes.push({
      position: position.clone(),
      text: text,
      radius: radius
    });
  }

  /**
   * Clear all notes (e.g., when switching zones).
   */
  clear() {
    this.notes = [];
    this.hideNote();
  }

  tick(delta) {
    if (!this.camera) return;

    // Lazy init DOM elements if missing (in case created before DOM ready)
    if (!this.container) {
        this.container = document.getElementById('field-note-container');
        this.textElement = document.getElementById('field-note-text');
        if (!this.container) return;
    }

    let nearestNote = null;
    let minDistanceSq = Infinity;

    for (const note of this.notes) {
      const distanceSq = this.camera.position.distanceToSquared(note.position);

      // Use a hysteresis: trigger at radius, leave at radius + 5
      const threshold = (this.activeNote === note) ? note.radius + 5 : note.radius;

      const thresholdSq = threshold * threshold;

      if (distanceSq < thresholdSq && distanceSq < minDistanceSq) {
        minDistanceSq = distanceSq;
        nearestNote = note;
      }
    }

    if (nearestNote) {
      this.showNote(nearestNote);
    } else {
      this.hideNote();
    }
  }

  showNote(note) {
    if (this.activeNote === note) return; // Already showing this note

    this.activeNote = note;

    if (this.container && this.textElement) {
        // Update content
        this.textElement.innerHTML = '';
        const words = note.text.split(' ');
        words.forEach((word, index) => {
            const span = document.createElement('span');
            span.textContent = word + ' ';
            span.className = 'fade-in-word';
            span.style.animationDelay = `${index * 0.15}s`;
            this.textElement.appendChild(span);
        });

        // Show container
        this.container.classList.add('visible');
    }
  }

  hideNote() {
    if (!this.activeNote) return;

    this.activeNote = null;

    if (this.container) {
      this.container.classList.remove('visible');
    }
  }
}

export { FieldNoteSystem };
