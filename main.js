/**
 * Phaser 3 entry — pseudo-3D trail runner (Atlanta loop).
 */
var config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: "game-container",
  transparent: true,
  backgroundColor: "#1a2f1e",
  input: {
    activePointers: 3,
    topOnly: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, UIScene],
};

var game = new Phaser.Game(config);
