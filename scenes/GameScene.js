/**
 * Core trail run: pseudo-3D world, Dan, obstacles, win/lose.
 */
var GameScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function GameScene() {
    Phaser.Scene.call(this, { key: "GameScene" });
  },

  create: function () {
    this.events.off("scoreAdd");
    this.events.off("playerHit");
    this.events.off("beginRun");
    this.events.off("danLand");
    this.input.off("pointerdown");

    this.W = this.scale.width;
    this.H = this.scale.height;

    this.playerZ = 0;
    this.runSpeed = 118;
    this.gameOver = false;
    this.won = false;

    this.registry.set("running", false);

    this.trail = new TrailRenderer(this);
    this.obstacleManager = new ObstacleManager(this, this.W, this.H);

    var danX = this.W * 0.5;
    var danY = this.H * 0.88;
    this.dan = new DanCharacter(this, danX, danY);

    this.camBobPhase = 0;

    this.dustEmitter = this.add.particles(0, 0, "particle", {
      lifespan: 400,
      speed: { min: 35, max: 100 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      angle: { min: 210, max: 330 },
      gravityY: 200,
      emitting: false,
      tint: [0xd7ccc8, 0x8d6e63],
    });
    this.dustEmitter.setDepth(3600);

    this.events.on("scoreAdd", this.onScoreAdd, this);
    this.events.on("playerHit", this.onPlayerHit, this);
    this.events.on("beginRun", this.resetRun, this);
    this.events.on("danLand", this.onDanLand, this);

    this.input.on("pointerdown", this.onPointerDown, this);

    var ui = this.scene.get("UIScene");
    if (ui) {
      ui.events.emit("fullResetToTitle");
    }
  },

  resetRun: function () {
    this.playerZ = 0;
    this.runSpeed = 118;
    this.gameOver = false;
    this.won = false;
    this.registry.set("score", 0);
    this.obstacleManager.reset();
    this.dan.reset(this.W * 0.5, this.H * 0.88);
    this.registry.set("running", true);
    var ui = this.scene.get("UIScene");
    if (ui) ui.events.emit("resetHud");
  },

  onScoreAdd: function (pts) {
    var s = this.registry.get("score") + pts;
    this.registry.set("score", s);
    var ui = this.scene.get("UIScene");
    if (ui) ui.events.emit("scoreChanged", s);
  },

  /**
   * @param {string} [reason] obstacle type: snake | soda | stream | runner | edge
   */
  onPlayerHit: function (reason) {
    if (this.gameOver || this.won || !this.registry.get("running")) return;
    this.gameOver = true;
    this.registry.set("running", false);
    this.dan.triggerFall();
    var ui = this.scene.get("UIScene");
    if (ui) ui.events.emit("playerDeath", this.registry.get("score"), reason || "hazard");
  },

  onDanLand: function () {
    if (!this.registry.get("running") || this.gameOver) return;
    this.dustEmitter.setPosition(this.dan.container.x, this.dan.container.y + 10);
    this.dustEmitter.explode(12);
  },

  onPointerDown: function () {
    if (!this.registry.get("running") || this.gameOver || this.won) return;
    this.dan.setInput(this.input.activePointer.x, this.W, true);
  },

  update: function (time, delta) {
    var running = this.registry.get("running");
    var dt = delta / 1000;

    if (!running) {
      this.playerZ += 35 * dt;
      this.trail.draw(this.playerZ, 70);
      this.dan.setInput(this.input.activePointer.x, this.W, false);
      this.dan.update(time, delta, 70);
      return;
    }

    if (this.gameOver || this.won) return;

    this.playerZ += this.runSpeed * dt;

    var diff = this.playerZ / this.obstacleManager.TOTAL_TRAIL;
    this.runSpeed = 118 + diff * 58;

    this.camBobPhase += delta * 0.004;
    this.cameras.main.setScroll(0, Math.sin(this.camBobPhase) * 3.5);

    var ptrX = this.input.activePointer.x;
    this.dan.setInput(ptrX, this.W, false);

    this.dan.update(time, delta, this.runSpeed);

    var jumpClear = !this.dan.isGrounded || this.dan.jumpY > 14;

    if (Math.abs(this.dan.lane) > 0.94) {
      this.onPlayerHit("edge");
      return;
    }

    this.obstacleManager.update(
      time,
      delta,
      this.playerZ,
      this.dan.lane,
      this.runSpeed,
      jumpClear
    );

    if (this.playerZ >= this.obstacleManager.TOTAL_TRAIL) {
      this.won = true;
      this.registry.set("running", false);
      var ui = this.scene.get("UIScene");
      if (ui) {
        ui.events.emit("progressChanged", 100);
        ui.events.emit("showWin", this.registry.get("score"));
      }
      return;
    }

    this.trail.draw(this.playerZ, this.runSpeed);
    this.obstacleManager.drawObstacles(this.playerZ, this.dan.lane, time);

    var prog = Math.floor((this.playerZ / this.obstacleManager.TOTAL_TRAIL) * 100);
    var ui = this.scene.get("UIScene");
    if (ui) ui.events.emit("progressChanged", prog);
  },
});
