/**
 * Spawns and updates obstacles; handles scoring for passed hazards.
 */
/** 30% smaller on-screen art for cans/snakes only (hits use drawn sizes below). */
var SODA_SNAKE_VISUAL_SCALE = 0.7;

/**
 * Lateral half-width of Dan on screen (px), matching DanCharacter torso half: 12 logo units × 2.35 × 0.7.
 * Collisions use |playerX − obstacleX| < this + obstacle half-width so sprites must overlap.
 */
var DAN_HIT_HALF_PX = 12 * 2.35 * 0.7;

function ObstacleManager(scene, gameW, gameH) {
  this.scene = scene;
  this.gameW = gameW;
  this.gameH = gameH;
  this.list = [];
  this.nextSpawnZ = 220;
  /** Real seed applied in reset() each run so layouts and scores are not identical every play. */
  this.rng = new Phaser.Math.RandomDataGenerator(["trail", "0"]);

  /** Trail length in world Z (~30–45 s at starting run speed). */
  this.TOTAL_TRAIL = 3800;
  this.graphicsByOb = new Map();
}

ObstacleManager.prototype.reset = function () {
  this.list = [];
  /** First hazard well ahead so the player can move off center after clicking Start. */
  this.nextSpawnZ = 320;
  this.rng = new Phaser.Math.RandomDataGenerator([
    "trail",
    String(Date.now()),
    String(Math.random()),
  ]);
  this.graphicsByOb.forEach(function (g) {
    g.destroy();
  });
  this.graphicsByOb.clear();
};

/** Screen X (px) for a lane at depth ahead of the player (same basis as draw). */
ObstacleManager.prototype._laneToScreenX = function (playerZ, playerLane, lane, depth) {
  return TrailProjection.laneToWorldX(lane, depth, playerLane, playerZ, this.gameW, this.gameH);
};

/** Lateral half-width of hazard art in px (matches drawObstacles roundedRect / snake extent). */
ObstacleManager.prototype._hazardHalfWidthPx = function (o, depth) {
  var sc = TrailProjection.project(depth, this.gameW, this.gameH).scale;
  if (o.type === "soda") return 12 * sc * SODA_SNAKE_VISUAL_SCALE;
  if (o.type === "snake") return 23 * sc * SODA_SNAKE_VISUAL_SCALE;
  if (o.type === "runner") return 12 * sc;
  return 12 * sc;
};

/**
 * Place hazards so `nextSpawnZ` stays just past the view horizon (stable density).
 * Cap how many spawn in one tick so a long frame / tab resume cannot dump a dozen props at once.
 */
ObstacleManager.prototype.scheduleSpawn = function (playerZ) {
  var endZone = this.TOTAL_TRAIL - 450;
  var horizon = playerZ + TrailProjection.Z_FAR;
  var playerT = Phaser.Math.Clamp(playerZ / this.TOTAL_TRAIL, 0, 1);
  var maxPerTick = playerT > 0.55 ? 3 : playerT < 0.16 ? 1 : 2;
  var spawned = 0;

  while (
    spawned < maxPerTick &&
    this.nextSpawnZ <= endZone &&
    horizon >= this.nextSpawnZ
  ) {
    var t = Phaser.Math.Clamp(this.nextSpawnZ / this.TOTAL_TRAIL, 0, 1);
    /** Wider gaps early; denser late. */
    var gap = Phaser.Math.Linear(138, 52, t);
    var jitter = this.rng.realInRange(-10, 12);
    var roll = this.rng.frac();
    var lane = this.rng.realInRange(-0.65, 0.65);
    var z = this.nextSpawnZ;

    var streamTh = Phaser.Math.Linear(0.06, 0.13, t);
    /** Fewer cans/snakes early; more other runners overall. */
    var sodaBand = Phaser.Math.Linear(0.17, 0.24, t);
    var snakeBand = Phaser.Math.Linear(0.11, 0.28, t);
    var runnerBand = Phaser.Math.Linear(0.52, 0.3, t);
    var rStream = streamTh;
    var rSoda = rStream + sodaBand;
    var rSnake = rSoda + snakeBand;
    var rRunner = rSnake + runnerBand;

    if (roll < rStream && z > 400 && z < endZone - 280) {
      this.list.push(new Stream(this.scene, 0, z, t));
    } else if (roll < rSoda) {
      this.list.push(new SodaCan(this.scene, lane, z, t));
    } else if (roll < rSnake) {
      this.list.push(new Snake(this.scene, lane, z, t));
    } else if (roll < rRunner && z > 100) {
      var away = this.rng.frac() > 0.42;
      this.list.push(new RunnerNpc(this.scene, lane, z, away, t));
    } else if (z > 120 && this.rng.frac() < 0.62) {
      var away2 = this.rng.frac() > 0.45;
      this.list.push(new RunnerNpc(this.scene, lane + this.rng.realInRange(-0.18, 0.18), z, away2, t));
    } else {
      this.list.push(new SodaCan(this.scene, lane + this.rng.realInRange(-0.2, 0.2), z, t));
    }

    this.nextSpawnZ += Math.max(56, gap + jitter);
    spawned++;
  }
};

ObstacleManager.prototype.update = function (time, delta, playerZ, playerLane, runSpeed, jumpClear) {
  this.scheduleSpawn(playerZ);

  for (var k = 0; k < this.list.length; k++) {
    this.list[k].update(time, delta, runSpeed);
  }

  for (var i = this.list.length - 1; i >= 0; i--) {
    var o = this.list[i];
    var depth = o.worldZ - playerZ;

    if (depth < -90) {
      if (!o.scored && o.type !== "stream") {
        o.scored = true;
        this.scene.events.emit("scoreAdd", o.type === "runner" ? 32 : 20);
      }
      this.removeOb(i);
      continue;
    }

    if (depth > TrailProjection.Z_FAR + 50) continue;

    var lane = o.getLane(time);
    var hitD0;
    var hitD1;
    if (o.type === "stream") {
      /** Narrow ribbon in Z so a normal jump spans it while airborne (jumpClear). */
      hitD0 = 16;
      hitD1 = 26;
    } else if (o.type === "soda" || o.type === "snake") {
      hitD0 = 14;
      hitD1 = 24;
    } else {
      hitD0 = 11;
      hitD1 = 26;
    }

    if (depth > hitD0 && depth < hitD1) {
      if (o.type === "stream") {
        if (!jumpClear) {
          this.scene.events.emit("playerHit", "stream");
        }
      } else {
        /** Player X must use ref lane 0 so cx + playerLane * laneW matches DanCharacter (ref=playerLane would zero out offset). */
        var playerX = TrailProjection.laneToWorldX(
          playerLane,
          TrailProjection.Z_NEAR,
          0,
          playerZ,
          this.gameW,
          this.gameH
        );
        var obsX = this._laneToScreenX(playerZ, playerLane, lane, depth);
        var halfO = this._hazardHalfWidthPx(o, depth);
        if (Math.abs(playerX - obsX) <= DAN_HIT_HALF_PX + halfO) {
          this.scene.events.emit("playerHit", o.type);
        }
      }
    }

    if (o.type === "stream" && jumpClear && depth > hitD0 && depth < hitD1 && !o.scored) {
      o.scored = true;
      this.scene.events.emit("scoreAdd", 28);
    }
  }
};

ObstacleManager.prototype.removeOb = function (index) {
  var o = this.list[index];
  var g = this.graphicsByOb.get(o);
  if (g) {
    g.destroy();
    this.graphicsByOb.delete(o);
  }
  this.list.splice(index, 1);
};

ObstacleManager.prototype.drawObstacles = function (playerZ, playerLane, time) {
  var w = this.gameW;
  var h = this.gameH;
  var self = this;

  var sorted = this.list
    .map(function (o) {
      return { o: o, d: o.worldZ - playerZ };
    })
    .filter(function (x) {
      return x.d > TrailProjection.Z_NEAR - 2 && x.d < TrailProjection.Z_FAR + 55;
    })
    .sort(function (a, b) {
      return b.d - a.d;
    });

  sorted.forEach(function (item) {
    var o = item.o;
    var depth = item.d;
    var lane = o.getLane(time);
    var p = TrailProjection.project(depth, w, h);
    var wx = TrailProjection.laneToWorldX(lane, depth, playerLane, playerZ, w, h);
    var sc = p.scale;

    var g = self.graphicsByOb.get(o);
    if (!g) {
      g = self.scene.add.graphics();
      self.graphicsByOb.set(o, g);
    }
    g.clear();
    g.setDepth(2500 + Math.floor((1 - p.t) * 850));
    g.setPosition(wx, p.screenY);

    if (o.type === "soda") {
      var hsc = sc * SODA_SNAKE_VISUAL_SCALE;
      g.fillStyle(0xf5f5f5, 1);
      g.fillRoundedRect(-12 * hsc, -28 * hsc, 24 * hsc, 34 * hsc, 5 * hsc);
      g.fillStyle(0xd32f2f, 1);
      g.fillRect(-8 * hsc, -25 * hsc, 16 * hsc, 9 * hsc);
      g.fillStyle(0x9e9e9e, 1);
      g.fillCircle(0, -8 * hsc, 3 * hsc);
    } else if (o.type === "snake") {
      var hscSnake = sc * SODA_SNAKE_VISUAL_SCALE;
      var wiggle = Math.sin(time * 0.008 + o.worldZ * 0.1) * 6 * hscSnake;
      g.lineStyle(Math.max(3, 5 * hscSnake), 0xe65100, 1);
      g.beginPath();
      g.moveTo(-24 * hscSnake, 5 * hscSnake + wiggle * 0.15);
      for (var si = 0; si < 7; si++) {
        g.lineTo(
          (-24 + si * 7) * hscSnake,
          Math.sin(si * 1.1 + time * 0.014) * 6 * hscSnake + wiggle * 0.08
        );
      }
      g.strokePath();
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(22 * hscSnake, -2 * hscSnake + wiggle * 0.12, 5 * hscSnake);
    } else if (o.type === "stream") {
      var sw = p.halfWidth * 1.85 * sc;
      g.fillStyle(0x0d47a1, 0.88);
      g.fillRect(-sw * 0.5, -11 * sc, sw, 20 * sc);
      g.fillStyle(0x42a5f5, 0.45);
      g.fillRect(-sw * 0.48, -8 * sc, sw * 0.92, 5 * sc);
    } else if (o.type === "runner") {
      var ph = time * 0.019 + o.animPhase;
      var lSwing = Math.sin(ph) * 14 * sc;
      var rSwing = Math.sin(ph + Math.PI) * 14 * sc;
      var bob = Math.sin(ph * 2) * 2 * sc;
      g.fillStyle(0x1565c0, 1);
      g.fillRoundedRect(-12 * sc, (-38 + bob) * sc, 24 * sc, 22 * sc, 5 * sc);
      g.fillStyle(0x0277bd, 0.9);
      g.fillRoundedRect(-4 * sc, (-34 + bob) * sc, 8 * sc, 14 * sc, 2 * sc);
      g.fillStyle(0xffcc80, 1);
      g.fillCircle(0, (-46 + bob) * sc, 10 * sc);
      g.fillStyle(0xd84315, 1);
      g.fillEllipse(0, (-52 + bob) * sc, 20 * sc, 9 * sc);
      g.fillStyle(0x37474f, 1);
      g.fillRoundedRect(-11 * sc, (-22 + bob) * sc, 22 * sc, 12 * sc, 3 * sc);
      g.fillStyle(0x263238, 1);
      g.fillRoundedRect(-10 * sc, (-12 + bob) * sc, 20 * sc, 14 * sc, 4 * sc);
      g.lineStyle(Math.max(4, 5 * sc), 0xf0c4a0, 1);
      g.lineBetween(-6 * sc, (0 + bob) * sc, (-8 + lSwing * 0.08) * sc, (14 + lSwing * 0.04) * sc);
      g.lineBetween(6 * sc, (0 + bob) * sc, (8 - rSwing * 0.08) * sc, (14 + rSwing * 0.04) * sc);
      g.lineStyle(Math.max(3, 4 * sc), 0xf0c4a0, 1);
      g.lineBetween(
        (-8 + lSwing * 0.08) * sc,
        (14 + lSwing * 0.04) * sc,
        (-10 + lSwing * 0.12) * sc,
        (26 + lSwing * 0.02) * sc
      );
      g.lineBetween(
        (8 - rSwing * 0.08) * sc,
        (14 + rSwing * 0.04) * sc,
        (10 - rSwing * 0.12) * sc,
        (26 + rSwing * 0.02) * sc
      );
      g.fillStyle(0xffffff, 1);
      g.fillEllipse((-10 + lSwing * 0.12) * sc, (27 + lSwing * 0.02) * sc, 7 * sc, 4 * sc);
      g.fillEllipse((10 - rSwing * 0.12) * sc, (27 + rSwing * 0.02) * sc, 7 * sc, 4 * sc);
      g.lineStyle(2, 0xbdbdbd, 0.9);
      g.lineBetween((-12 + lSwing * 0.12) * sc, (26 + lSwing * 0.02) * sc, (-6 + lSwing * 0.12) * sc, (27 + lSwing * 0.02) * sc);
      g.lineBetween((6 - rSwing * 0.12) * sc, (27 + rSwing * 0.02) * sc, (12 - rSwing * 0.12) * sc, (26 + rSwing * 0.02) * sc);
    }
  });
};
