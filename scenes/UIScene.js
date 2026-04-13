/**
 * HUD, title, instructions, game over / win overlays.
 */
var UIScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function UIScene() {
    Phaser.Scene.call(this, { key: "UIScene" });
  },

  create: function () {
    var w = this.scale.width;
    var h = this.scale.height;

    /** Transparent clear so GameScene stays visible underneath this overlay scene. */
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");

    this.overlayBg = this.add.rectangle(w / 2, h / 2, w, h, 0x1a2f1e, 0.92);
    this.overlayBg.setDepth(10000);
    this.overlayBg.setInteractive();

    var title = this.add
      .text(w / 2, h * 0.28, "Extreme Trail Runner", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "38px",
        color: "#7cfc8a",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(10001);

    var sub = this.add
      .text(
        w / 2,
        h * 0.38,
        "Guide Dan to the Atlanta loop trailhead.\n\n• Move mouse left/right to steer\n• Click to jump streams & hazards",
        {
          fontFamily: "Segoe UI, system-ui, sans-serif",
          fontSize: "18px",
          color: "#c8e6c9",
          align: "center",
        }
      )
      .setOrigin(0.5)
      .setDepth(10001);

    this.startBtn = this.add
      .text(w / 2, h * 0.58, "Start run", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "28px",
        color: "#ffffff",
        backgroundColor: "#2e7d32",
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setDepth(10001)
      .setInteractive({ useHandCursor: true });

    this.titleGroup = [this.overlayBg, title, sub, this.startBtn];

    this.startBtn.on("pointerdown", function () {
      this.hideTitle();
      var g = this.getGameScene();
      if (g) g.events.emit("beginRun");
    }, this);

    var hudDepth = 8500;
    this.hudBg = this.add
      .rectangle(16 + 140, 16 + 38, 280, 78, 0x0d160f, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x4caf50, 0.85)
      .setDepth(hudDepth)
      .setVisible(false);

    this.scoreTxt = this.add
      .text(28, 26, "Score: 0", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "24px",
        color: "#f1f8e9",
        fontStyle: "bold",
      })
      .setDepth(hudDepth + 1)
      .setStroke("#0d160f", 6)
      .setVisible(false);

    this.progTxt = this.add
      .text(28, 58, "Trail: 0%", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "18px",
        color: "#c8e6c9",
      })
      .setDepth(hudDepth + 1)
      .setStroke("#0d160f", 5)
      .setVisible(false);

    this.gameOverGroup = [];
    this.winGroup = [];
    this.hitFlashTxt = null;
    this._deathDelayTimer = null;

    this.events.on("resetHud", function () {
      this.clearDeathFlash();
      this.scoreTxt.setText("Score: 0");
      this.progTxt.setText("Trail: 0%");
      this.hideGameOver();
      this.hideWin();
    }, this);

    this.events.on("scoreChanged", function (s) {
      this.scoreTxt.setText("Score: " + s);
    }, this);

    this.events.on("progressChanged", function (p) {
      this.progTxt.setText("Trail: " + Phaser.Math.Clamp(p, 0, 100) + "%");
    }, this);

    this.events.on("playerDeath", function (score, reason) {
      this.flashHitThenGameOver(score, reason);
    }, this);

    this.events.on("showWin", function (score) {
      this.showWin(score);
    }, this);

    this.events.on("fullResetToTitle", function () {
      this.clearDeathFlash();
      this.hideGameOver();
      this.hideWin();
      this.showTitleAgain();
      this.hudBg.setVisible(false);
      this.scoreTxt.setVisible(false);
      this.progTxt.setVisible(false);
      var gs = this.getGameScene();
      if (gs && gs.hideGameHud) gs.hideGameHud();
    }, this);

    this.scene.bringToTop();

    /**
     * UIScene is on top of GameScene, so pointer events often never reach GameScene.
     * Forward clicks as jump while a run is active (title / modals skip).
     */
    this.input.on("pointerdown", this.forwardJumpIfPlaying, this);
  },

  /** After stop/start GameScene, prefer getScene(key) so we always get the current instance. */
  getGameScene: function () {
    return this.scene.getScene("GameScene") || this.scene.get("GameScene");
  },

  forwardJumpIfPlaying: function (pointer) {
    if (this.overlayBg.visible) return;
    var gs = this.getGameScene();
    if (!gs || !gs.registry.get("running")) return;
    if (gs.gameOver || gs.won) return;
    gs.dan.setInput(pointer.x, gs.scale.width, true);
  },

  clearDeathFlash: function () {
    if (this._deathDelayTimer) {
      this._deathDelayTimer.remove(false);
      this._deathDelayTimer = null;
    }
    if (this.hitFlashTxt) {
      this.tweens.killTweensOf(this.hitFlashTxt);
      this.hitFlashTxt.destroy();
      this.hitFlashTxt = null;
    }
  },

  hitMessageFor: function (reason) {
    var m = {
      snake: "You hit a snake!",
      soda: "You hit a can!",
      stream: "You landed in the stream!",
      runner: "You bumped another runner!",
      edge: "You ran off the trail!",
      hazard: "You hit an obstacle!",
    };
    return m[reason] || m.hazard;
  },

  flashHitThenGameOver: function (score, reason) {
    var self = this;
    this.clearDeathFlash();

    var w = this.scale.width;
    var h = this.scale.height;
    var msg = this.hitMessageFor(reason);

    this.hitFlashTxt = this.add
      .text(w / 2, h * 0.34, msg, {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "34px",
        color: "#ffccbc",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10500)
      .setStroke("#3e2723", 10);

    this.hitFlashTxt.setAlpha(0);
    this.hitFlashTxt.setScale(0.92);
    this.tweens.add({
      targets: this.hitFlashTxt,
      alpha: 1,
      scale: 1,
      duration: 200,
      ease: "Back.easeOut",
    });

    this._deathDelayTimer = this.time.delayedCall(2200, function () {
      self._deathDelayTimer = null;
      if (self.hitFlashTxt && self.hitFlashTxt.active) {
        self.tweens.add({
          targets: self.hitFlashTxt,
          alpha: 0,
          duration: 240,
          onComplete: function () {
            self.clearDeathFlash();
            self.showGameOver(score);
          },
        });
      } else {
        self.showGameOver(score);
      }
    });
  },

  hideTitle: function () {
    this.titleGroup.forEach(function (o) {
      o.setVisible(false);
    });
    this.overlayBg.disableInteractive();
    this.startBtn.disableInteractive();
    /* Score / trail HUD lives on GameScene (scrollFactor 0) so it always composites. */
    this.hudBg.setVisible(false);
    this.scoreTxt.setVisible(false);
    this.progTxt.setVisible(false);
  },

  showTitleAgain: function () {
    this.clearDeathFlash();
    this.titleGroup.forEach(function (o) {
      o.setVisible(true);
    });
    this.overlayBg.setInteractive();
    this.startBtn.setInteractive({ useHandCursor: true });
    this.hudBg.setVisible(false);
    this.scoreTxt.setVisible(false);
    this.progTxt.setVisible(false);
    var gs = this.getGameScene();
    if (gs && gs.hideGameHud) gs.hideGameHud();
  },

  hideGameOver: function () {
    this.gameOverGroup.forEach(function (o) {
      o.destroy();
    });
    this.gameOverGroup = [];
  },

  hideWin: function () {
    this.winGroup.forEach(function (o) {
      o.destroy();
    });
    this.winGroup = [];
  },

  showGameOver: function (score) {
    this.clearDeathFlash();
    var w = this.scale.width;
    var h = this.scale.height;
    this.hideGameOver();
    var bg = this.add.rectangle(w / 2, h / 2, w * 0.72, h * 0.52, 0x263238, 0.95).setDepth(11000);
    var t = this.add
      .text(w / 2, h * 0.38, "GAME OVER", {
        fontSize: "44px",
        color: "#ff8a80",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(11001);
    var cap = this.add
      .text(w / 2, h * 0.46, "ahhhhhh!", {
        fontSize: "32px",
        color: "#ffccbc",
        fontStyle: "italic",
      })
      .setOrigin(0.5)
      .setDepth(11001);
    var sc = this.add
      .text(w / 2, h * 0.56, "Final score: " + score, {
        fontSize: "24px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(11001);
    var btn = this.add
      .text(w / 2, h * 0.68, "Restart", {
        fontSize: "24px",
        color: "#fff",
        backgroundColor: "#c62828",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(11001)
      .setInteractive({ useHandCursor: true });

    var self = this;
    btn.on("pointerdown", function () {
      self.clearDeathFlash();
      self.hideGameOver();
      self.scene.stop("GameScene");
      self.scene.start("GameScene");
      self.scoreTxt.setText("Score: 0");
      self.progTxt.setText("Trail: 0%");
      self.showTitleAgain();
    });

    this.gameOverGroup = [bg, t, cap, sc, btn];
  },

  showWin: function (score) {
    var w = this.scale.width;
    var h = this.scale.height;
    this.hideWin();
    var bg = this.add.rectangle(w / 2, h / 2, w * 0.78, h * 0.55, 0x1b5e20, 0.94).setDepth(11000);
    var t = this.add
      .text(w / 2, h * 0.36, "Dan reached the\nAtlanta loop trailhead!", {
        fontSize: "30px",
        color: "#c8e6c9",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(11001);
    var sc = this.add
      .text(w / 2, h * 0.52, "Final score: " + score, {
        fontSize: "26px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setDepth(11001);
    var btn = this.add
      .text(w / 2, h * 0.66, "Run again", {
        fontSize: "24px",
        color: "#fff",
        backgroundColor: "#33691e",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(11001)
      .setInteractive({ useHandCursor: true });

    var self = this;
    btn.on("pointerdown", function () {
      self.clearDeathFlash();
      self.hideWin();
      self.scene.stop("GameScene");
      self.scene.start("GameScene");
      self.scoreTxt.setText("Score: 0");
      self.progTxt.setText("Trail: 0%");
      self.showTitleAgain();
    });

    this.winGroup = [bg, t, sc, btn];
  },
});
