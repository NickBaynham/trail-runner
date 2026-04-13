/** Generates shared textures (shadow, dust particle). Dan is drawn in DanCharacter. */
var BootScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function BootScene() {
    Phaser.Scene.call(this, { key: "BootScene" });
  },

  create: function () {
    this.makeTextures();
    this.scene.start("GameScene");
    this.scene.launch("UIScene");
  },

  makeTextures: function () {
    var g = this.make.graphics({ x: 0, y: 0, add: false });

    /* --- shadow --- */
    g.fillStyle(0x000000, 0.38);
    g.fillEllipse(40, 22, 72, 22);
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(40, 24, 88, 26);
    g.generateTexture("shadow", 80, 48);
    g.clear();

    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("particle", 8, 8);
    g.destroy();
  },
});
