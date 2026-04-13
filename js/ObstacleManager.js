/**
 * Spawns and updates obstacles; handles scoring for passed hazards.
 */
function ObstacleManager(scene, gameW, gameH) {
  this.scene = scene;
  this.gameW = gameW;
  this.gameH = gameH;
  this.list = [];
  this.nextSpawnZ = 220;
  this.rng = new Phaser.Math.RandomDataGenerator(["trail", "42"]);

  /** Trail length in world Z (~30–45 s at starting run speed). */
  this.TOTAL_TRAIL = 3800;
  this.graphicsByOb = new Map();
}

ObstacleManager.prototype.reset = function () {
  this.list = [];
  this.nextSpawnZ = 72;
  this.graphicsByOb.forEach(function (g) {
    g.destroy();
  });
  this.graphicsByOb.clear();
};

/**
 * Place hazards so `nextSpawnZ` stays just past the view horizon (stable density).
 * Cap how many spawn in one tick so a long frame / tab resume cannot dump a dozen props at once.
 */
ObstacleManager.prototype.scheduleSpawn = function (playerZ) {
  var endZone = this.TOTAL_TRAIL - 450;
  var horizon = playerZ + TrailProjection.Z_FAR;
  var maxPerTick = 2;
  var spawned = 0;

  while (
    spawned < maxPerTick &&
    this.nextSpawnZ <= endZone &&
    horizon >= this.nextSpawnZ
  ) {
    var difficulty = Phaser.Math.Clamp(this.nextSpawnZ / this.TOTAL_TRAIL, 0, 1);
    var gap = Phaser.Math.Linear(94, 54, difficulty);
    var jitter = this.rng.realInRange(-5, 9);
    var roll = this.rng.frac();
    var lane = this.rng.realInRange(-0.65, 0.65);
    var z = this.nextSpawnZ;

    if (roll < 0.06 && z > 400 && z < endZone - 280) {
      this.list.push(new Stream(this.scene, 0, z));
    } else if (roll < 0.38) {
      this.list.push(new SodaCan(this.scene, lane, z));
    } else if (roll < 0.64) {
      this.list.push(new Snake(this.scene, lane, z));
    } else if (roll < 0.86 && z > 100) {
      var away = this.rng.frac() > 0.42;
      this.list.push(new RunnerNpc(this.scene, lane, z, away));
    } else {
      this.list.push(new SodaCan(this.scene, lane + this.rng.realInRange(-0.2, 0.2), z));
    }

    this.nextSpawnZ += Math.max(52, gap + jitter);
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
        this.scene.events.emit("scoreAdd", o.type === "runner" ? 25 : 14);
      }
      this.removeOb(i);
      continue;
    }

    if (depth > TrailProjection.Z_FAR + 50) continue;

    var lane = o.getLane(time);
    var hitD0 = o.type === "stream" ? 5 : 11;
    var hitD1 = o.type === "stream" ? 36 : 27;

    if (depth > hitD0 && depth < hitD1) {
      if (o.type === "stream") {
        if (!jumpClear) {
          this.scene.events.emit("playerHit", "stream");
        }
      } else if (Math.abs(playerLane - lane) < o.hitHalfWidth + 0.11) {
        this.scene.events.emit("playerHit", o.type);
      }
    }

    if (o.type === "stream" && jumpClear && depth > hitD0 && depth < hitD1 && !o.scored) {
      o.scored = true;
      this.scene.events.emit("scoreAdd", 22);
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
      g.fillStyle(0xf5f5f5, 1);
      g.fillRoundedRect(-12 * sc, -28 * sc, 24 * sc, 34 * sc, 5 * sc);
      g.fillStyle(0xd32f2f, 1);
      g.fillRect(-8 * sc, -25 * sc, 16 * sc, 9 * sc);
      g.fillStyle(0x9e9e9e, 1);
      g.fillCircle(0, -8 * sc, 3 * sc);
    } else if (o.type === "snake") {
      var wiggle = Math.sin(time * 0.008 + o.worldZ * 0.1) * 6 * sc;
      g.lineStyle(Math.max(3, 5 * sc), 0xe65100, 1);
      g.beginPath();
      g.moveTo(-24 * sc, 5 * sc + wiggle * 0.15);
      for (var si = 0; si < 7; si++) {
        g.lineTo(
          (-24 + si * 7) * sc,
          Math.sin(si * 1.1 + time * 0.014) * 6 * sc + wiggle * 0.08
        );
      }
      g.strokePath();
      g.fillStyle(0x1a1a1a, 1);
      g.fillCircle(22 * sc, -2 * sc + wiggle * 0.12, 5 * sc);
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
