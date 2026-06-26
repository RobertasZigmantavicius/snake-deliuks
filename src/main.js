const config = {
  type: Phaser.AUTO,
  width: 480,
  height: 480,
  backgroundColor: '#000000',
  parent: 'game-container',
  scene: [BootScene, GameScene],
  pixelArt: true,
};

window.game = new Phaser.Game(config);
