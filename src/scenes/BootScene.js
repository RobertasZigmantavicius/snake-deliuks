class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Assets loaded here as the game grows
  }

  create() {
    this.scene.start('GameScene');
  }
}
