class ZoneManager {
  constructor(scene) {
    this.scene = scene;
    this.currentZone = null;
    this.zones = {};
  }

  register(name, zoneClass) {
    this.zones[name] = zoneClass;
  }

  async switchTo(name) {
    console.log(`Switching to zone: ${name}`);
    if (this.currentZone) {
      this.scene.remove(this.currentZone);
      this.currentZone.unload();
      this.currentZone = null;
    }

    const ZoneClass = this.zones[name];
    if (ZoneClass) {
      const zone = new ZoneClass();
      await zone.load();
      this.scene.add(zone);
      this.currentZone = zone;
    } else {
      console.error(`Zone ${name} not found.`);
    }
  }

  tick(delta) {
    if (this.currentZone) {
      this.currentZone.tick(delta);
    }
  }
}

export { ZoneManager };
