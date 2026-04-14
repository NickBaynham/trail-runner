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

    /** Transparent clear so GameScene can show through when this scene is on top. */
    this.cameras.main.setBackgroundColor({ r: 0, g: 0, b: 0, a: 0 });
    this.cameras.main.transparent = true;

    this.overlayBg = this.add.rectangle(w / 2, h / 2, w, h, 0x1a2f1e, 0.92);
    this.overlayBg.setDepth(10000);
    this.overlayBg.setInteractive();

    var title = this.add
      .text(w / 2, h * 0.26, "Baby Bouncing Dan\nExtreme Trail Runner", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "34px",
        color: "#7cfc8a",
        fontStyle: "bold",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10001);

    var sub = this.add
      .text(
        w / 2,
        h * 0.4,
        "Same bounce as the header logo — boop Dan to the Atlanta loop trailhead.\n\n• Move mouse left/right to steer\n• Click to jump streams & hazards",
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
      /** Call resetRun directly so a run always starts even if Scene events are finicky. */
      if (g && typeof g.resetRun === "function") {
        g.resetRun();
      } else if (g) {
        g.events.emit("beginRun");
      }
    }, this);

    var hudDepth = 8500;
    this.hudBg = this.add
      .rectangle(16 + 140, 16 + 38, 280, 78, 0x0d160f, 0.9)
      .setOrigin(0.5)
      .setStrokeStyle(2, 0x4caf50, 0.85)
      .setScrollFactor(0)
      .setDepth(hudDepth)
      .setVisible(false);

    this.scoreTxt = this.add
      .text(28, 26, "Score: 0", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "24px",
        color: "#f1f8e9",
        fontStyle: "bold",
      })
      .setScrollFactor(0)
      .setDepth(hudDepth + 1)
      .setStroke("#0d160f", 6)
      .setVisible(false);

    this.progTxt = this.add
      .text(28, 58, "Trail: 0%", {
        fontFamily: "Segoe UI, system-ui, sans-serif",
        fontSize: "18px",
        color: "#c8e6c9",
      })
      .setScrollFactor(0)
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
      this.hudBg.setVisible(true);
      this.scoreTxt.setVisible(true);
      this.progTxt.setVisible(true);
    }, this);

    this.events.on("scoreChanged", function (s) {
      this.scoreTxt.setText("Score: " + s);
    }, this);

    this.events.on("progressChanged", function (p) {
      this.progTxt.setText("Trail: " + Phaser.Math.Clamp(p, 0, 100) + "%");
    }, this);

    this.events.on("playerDeath", function (score, reason, trailPct) {
      this.flashHitThenGameOver(score, reason, trailPct);
    }, this);

    this.events.on("showWin", function (score, trailPct) {
      this.showWin(score, trailPct);
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
      if (gs) {
        gs.runActive = false;
        if (gs._syncRunningRegistry) gs._syncRunningRegistry(false);
        if (gs.hideGameHud) gs.hideGameHud();
      }
    }, this);

    this.scene.bringToTop();

    /**
     * UIScene stacks above GameScene; clicks on empty space do not reach GameScene.
     * Forward jump while a run is active (title overlay uses pointerdown on Start only).
     */
    this.input.on("pointerdown", this.forwardJumpIfPlaying, this);
  },

  /** After stop/start GameScene, prefer getScene(key) so we always get the current instance. */
  getGameScene: function () {
    var game = this.sys && this.sys.game;
    var key = "GameScene";
    if (game && game.scene && game.scene.getScene) {
      var byGame = game.scene.getScene(key);
      if (byGame) return byGame;
    }
    return this.scene.getScene(key) || this.scene.get(key);
  },

  /**
   * Stop then start GameScene on the next frame so Phaser can tear the scene down cleanly (fixes Restart).
   */
  _deferRestartGameScene: function () {
    var game = this.sys.game;
    if (!game || !game.scene) return;
    var scenePlugin = game.scene;
    scenePlugin.stop("GameScene");
    this.time.delayedCall(0, function () {
      scenePlugin.start("GameScene");
    });
  },

  forwardJumpIfPlaying: function (pointer) {
    if (this.overlayBg.visible) return;
    var gs = this.getGameScene();
    if (!gs || !gs.runActive) return;
    if (gs.gameOver || gs.won) return;
    var game = this.sys.game;
    var ap = game && game.input ? game.input.activePointer : null;
    var px =
      ap && typeof ap.x === "number" && !Number.isNaN(ap.x)
        ? ap.x
        : pointer && typeof pointer.x === "number"
          ? pointer.x
          : gs.scale.width * 0.5;
    var gw = gs.scale && gs.scale.width > 0 ? gs.scale.width : gs.W || 960;
    gs.dan.setInput(px, gw, true);
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

  flashHitThenGameOver: function (score, reason, trailPct) {
    var self = this;
    var trail = typeof trailPct === "number" ? Phaser.Math.Clamp(trailPct, 0, 100) : 0;
    this.clearDeathFlash();
    this.hudBg.setVisible(false);
    this.scoreTxt.setVisible(false);
    this.progTxt.setVisible(false);
    this.sys.setVisible(true);
    this.input.enabled = true;
    this.scene.bringToTop();

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
            self.showGameOver(score, trail);
          },
        });
      } else {
        self.showGameOver(score, trail);
      }
    });
  },

  hideTitle: function () {
    this.titleGroup.forEach(function (o) {
      o.setVisible(false);
    });
    this.overlayBg.disableInteractive();
    this.startBtn.disableInteractive();
    /* Run HUD on this scene (pinned scrollFactor 0); GameScene hides its duplicate. */
    this.hudBg.setVisible(true);
    this.scoreTxt.setVisible(true);
    this.progTxt.setVisible(true);
    this.scene.bringToTop();
  },

  showTitleAgain: function () {
    this.sys.setVisible(true);
    this.input.enabled = true;
    this.scene.bringToTop();
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
    if (gs) {
      gs.runActive = false;
      if (gs._syncRunningRegistry) gs._syncRunningRegistry(false);
      if (gs.hideGameHud) gs.hideGameHud();
    }
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

  showGameOver: function (score, trailPct) {
    this.clearDeathFlash();
    this.hudBg.setVisible(false);
    this.scoreTxt.setVisible(false);
    this.progTxt.setVisible(false);
    this.sys.setVisible(true);
    this.input.enabled = true;
    this.scene.bringToTop();
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
    var tp = typeof trailPct === "number" ? Phaser.Math.Clamp(trailPct, 0, 100) : 0;
    var sc = this.add
      .text(w / 2, h * 0.54, "Final score: " + score + "\nTrail completed: " + tp + "%", {
        fontSize: "22px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(11001);
    var btn = this.add
      .text(w / 2, h * 0.7, "Restart", {
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
      self.scoreTxt.setText("Score: 0");
      self.progTxt.setText("Trail: 0%");
      self.showTitleAgain();
      self._deferRestartGameScene();
    });

    this.gameOverGroup = [bg, t, cap, sc, btn];
  },

  showWin: function (score, trailPct) {
    this.hudBg.setVisible(false);
    this.scoreTxt.setVisible(false);
    this.progTxt.setVisible(false);
    this.sys.setVisible(true);
    this.input.enabled = true;
    this.scene.bringToTop();
    var w = this.scale.width;
    var h = this.scale.height;
    this.hideWin();
    var bg = this.add.rectangle(w / 2, h / 2, w * 0.78, h * 0.55, 0x1b5e20, 0.94).setDepth(11000);
    var t = this.add
      .text(w / 2, h * 0.36, "Baby Dan bounced to the\nAtlanta loop trailhead!", {
        fontSize: "30px",
        color: "#c8e6c9",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(11001);
    var tp = typeof trailPct === "number" ? Phaser.Math.Clamp(trailPct, 0, 100) : 100;
    var sc = this.add
      .text(w / 2, h * 0.5, "Final score: " + score + "\nTrail completed: " + tp + "%", {
        fontSize: "26px",
        color: "#ffffff",
        align: "center",
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
      self.scoreTxt.setText("Score: 0");
      self.progTxt.setText("Trail: 0%");
      self.showTitleAgain();
      self._deferRestartGameScene();
    });

    this.winGroup = [bg, t, sc, btn];
  },
});
