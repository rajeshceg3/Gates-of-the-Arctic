class ZoneManager {
  constructor(scene, camera, audioManager) {
    this.scene = scene;
    this.camera = camera;
    this.audioManager = audioManager;
    this.currentZone = null;
    this.zones = {};
    this.labelTimeout = null;
  }

  register(name, zoneClass) {
    this.zones[name] = zoneClass;
  }

  async switchTo(name) {
    console.log(`Switching to zone: ${name}`);
    const overlay = document.getElementById('transition-overlay');

    // Fade to black
    if (overlay) overlay.classList.add('active-transition');

    // Wait for fade out
    if (overlay) await new Promise(resolve => setTimeout(resolve, 1000));

    if (this.currentZone) {
      this.scene.remove(this.currentZone);
      this.currentZone.unload();
      this.currentZone = null;
    }

    const ZoneClass = this.zones[name];
    if (ZoneClass) {
      const zone = new ZoneClass();
      await zone.load(this.scene);
      this.scene.add(zone);
      this.currentZone = zone;

      // Update Audio
      if (this.audioManager) {
        this.audioManager.setTheme(name);
      }
    } else {
      console.error(`Zone ${name} not found.`);
    }

    // Fade back in
    if (overlay) {
        // Short delay to ensure render happens
        setTimeout(() => {
            overlay.classList.remove('active-transition');
        }, 100);
    }

    // Update Zone Label
    const label = document.getElementById('zone-label');
    if (label) {
        if (this.labelTimeout) clearTimeout(this.labelTimeout);

        label.textContent = name.toUpperCase() + ' ZONE';
        label.classList.add('visible');

        // Remove label after a delay
        this.labelTimeout = setTimeout(() => {
            label.classList.remove('visible');
        }, 4000);
    }
  }

  tick(delta) {
    if (this.currentZone) {
      this.currentZone.tick(delta, this.camera);
    }
  }
}

export { ZoneManager };
