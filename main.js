/**
 * Phaser 3 entry — Baby Bouncing Dan: Extreme Trail Runner (Atlanta loop).
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
/** Playwright / devtools: read GameScene state while running. */
window.__trailRunnerGame = game;
