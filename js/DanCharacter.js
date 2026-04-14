/**
 * Dan — built from the same shapes as the header SVG (logo-torso rect, cap, shorts, limbs).
 * Torso matches index.html: <rect class="logo-torso" x="16" y="36" width="24" height="22" rx="6" fill="#00acc1">
 * scaled into world space. Motion is bounce + limb swing (no run-cycle IK). GameScene / obstacles unchanged.
 */

/* global DanMath, TrailProjection */

function danSceneRegistry(scene) {
  return scene.game && scene.game.registry ? scene.game.registry : scene.registry;
}

function isTrailRunActive(scene) {
  if (typeof scene.runActive === "boolean") return scene.runActive;
  var reg = danSceneRegistry(scene);
  return !!(reg && reg.get("running"));
}

/** 30% smaller on screen than base logo scale — easier to steer between hazards (hit logic unchanged). */
var DAN_VISUAL_SCALE = 0.7;

/** Logo SVG viewBox 0 0 56 72 — numeric constants for proportions. */
var LOGO_SVG = {
  vbW: 56,
  vbH: 72,
  torsoX: 16,
  torsoY: 36,
  torsoW: 24,
  torsoH: 22,
  torsoRx: 6,
  torsoFill: 0x00acc1,
  shortsX: 15,
  shortsY: 54,
  shortsW: 26,
  shortsH: 10,
  shortsRx: 3,
  shortsFill: 0x263238,
  headCx: 28,
  headCy: 26,
  headR: 11,
  capCx: 28,
  capCy: 12,
  capRx: 20,
  capRy: 10,
  brimCx: 28,
  brimCy: 14,
  brimRx: 22,
  brimRy: 7,
  /** Scale logo units to pixels on screen */
  scale: 2.35 * DAN_VISUAL_SCALE,
};

/**
 * Map logo Y (0 = top of viewBox) to local coords where feet sit at y = 0 (Phaser y grows downward).
 * Feet are at the bottom of the viewBox (y ≈ vbH); head has smaller SVG y and must be above y = 0:
 * localY = (logoY - vbH) * scale.
 */
function logoYToLocal(logoY) {
  return (logoY - LOGO_SVG.vbH) * LOGO_SVG.scale;
}

function LogoDanPose() {}

/**
 * Bounce phase drives body bob + limb angles (same rhythm idea as .logo-leg / .logo-arm in style.css).
 */
LogoDanPose.prototype.compute = function (phase, runSpeed, jumpY, jumpVel, squat, fallen, fallT) {
  var s = runSpeed !== undefined ? runSpeed : 118;
  var bounce = Math.sin(phase);
  var bounce2 = Math.sin(phase * 2);

  if (fallen) {
    var flail = Math.sin((fallT || 0) * 0.05) * 0.2;
    return {
      kind: "fall",
      phase: phase,
      legL: 0.55 + flail,
      legR: -0.4 - flail,
      armL: 0.5,
      armR: -0.45,
      bodyY: 6,
      squashX: 1.08,
      squashY: 0.88,
    };
  }

  if (jumpY > 0 || squat > 0.01) {
    var tuck = DanMath.clamp(jumpY * 0.04, 0, 1);
    var air = jumpVel > 0 ? 1 : 0.65;
    return {
      kind: "jump",
      phase: phase,
      legL: 0.12 + tuck * 0.35,
      legR: 0.1 + tuck * 0.32,
      armL: -0.35 - (1 - air) * 0.25,
      armR: 0.32 + (1 - air) * 0.22,
      bodyY: -jumpY * 0.85 - squat * 4,
      squashX: 1 + squat * 0.04,
      squashY: 1 - squat * 0.06,
    };
  }

  var ampLeg = 0.31 + DanMath.clamp(s / 420, 0, 0.18);
  var ampArm = 0.27 + DanMath.clamp(s / 420, 0, 0.14);
  var bobY = bounce * (6.5 + DanMath.clamp(s / 90, 0, 5)) + bounce2 * 1.2;
  return {
    kind: "bounce",
    phase: phase,
    legL: bounce * ampLeg,
    legR: -bounce * ampLeg,
    armL: -bounce * ampArm,
    armR: bounce * ampArm,
    bodyY: bobY,
    squashX: 1 + Math.abs(bounce) * 0.04,
    squashY: 1 - Math.abs(bounce) * 0.05,
  };
};

function LogoDanRenderer(g) {
  this.g = g;
}

LogoDanRenderer.prototype._legPath = function (side, angleRad) {
  var sc = LOGO_SVG.scale;
  var ox = side * 6 * sc;
  var pivotY = logoYToLocal(58);
  var g = this.g;
  g.save();
  g.translateCanvas(ox, pivotY);
  g.rotateCanvas(angleRad);
  g.fillStyle(0xd7a88c, 1);
  g.beginPath();
  g.moveTo(-3 * sc, 0);
  g.lineTo(-5 * sc, 8 * sc);
  g.lineTo(2 * sc, 8 * sc);
  g.lineTo(4 * sc, 0);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xf0c4a0, 1);
  g.beginPath();
  g.moveTo(-2.5 * sc, 0);
  g.lineTo(-4 * sc, 8 * sc);
  g.lineTo(1.5 * sc, 8 * sc);
  g.lineTo(3.5 * sc, 0);
  g.closePath();
  g.fillPath();
  g.fillStyle(LOGO_SVG.shortsFill, 1);
  g.fillEllipse(side * 0.5 * sc, 8.5 * sc, 5 * sc, 3 * sc);
  g.restore();
};

LogoDanRenderer.prototype._armPath = function (side, angleRad) {
  var sc = LOGO_SVG.scale;
  var ox = side * 14 * sc;
  var pivotY = logoYToLocal(40);
  var g = this.g;
  g.save();
  g.translateCanvas(ox, pivotY);
  g.rotateCanvas(angleRad);
  g.fillStyle(0xf0c4a0, 1);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(side * -6 * sc, 8 * sc);
  g.lineTo(side * -4 * sc, 10 * sc);
  g.lineTo(side * 2 * sc, 2 * sc);
  g.closePath();
  g.fillPath();
  g.restore();
};

LogoDanRenderer.prototype.draw = function (pose, streaks) {
  var g = this.g;
  var sc = LOGO_SVG.scale;
  var tw = LOGO_SVG.torsoW * sc;
  var th = LOGO_SVG.torsoH * sc;
  var trx = LOGO_SVG.torsoRx * sc;
  var torsoCenterX = (LOGO_SVG.torsoX + LOGO_SVG.torsoW * 0.5 - LOGO_SVG.vbW * 0.5) * sc;
  var torsoTop = logoYToLocal(LOGO_SVG.torsoY + LOGO_SVG.torsoH) - th;

  if (streaks && pose.kind === "bounce") {
    var pulse = 0.1 + 0.06 * Math.abs(Math.sin(pose.phase * 2));
    g.lineStyle(2, 0xffffff, pulse);
    for (var i = 0; i < 4; i++) {
      var ox = -40 - i * 9 + Math.sin(pose.phase + i * 0.6) * 4;
      var oy = 6 + i * 4;
      g.lineBetween(ox, oy, ox - 12, oy + 3);
    }
  }

  this._legPath(-1, pose.legL);
  this._legPath(1, pose.legR);

  var shortsX = (LOGO_SVG.shortsX - LOGO_SVG.vbW * 0.5) * sc;
  var shortsTop = logoYToLocal(LOGO_SVG.shortsY + LOGO_SVG.shortsH);
  var sw = LOGO_SVG.shortsW * sc;
  var sh = LOGO_SVG.shortsH * sc;
  var srx = LOGO_SVG.shortsRx * sc;
  g.fillStyle(LOGO_SVG.shortsFill, 1);
  g.fillRoundedRect(shortsX, shortsTop, sw, sh, srx);
  g.lineStyle(1.2, 0x111827, 0.4);
  g.strokeRoundedRect(shortsX, shortsTop, sw, sh, srx);

  g.fillStyle(LOGO_SVG.torsoFill, 1);
  g.fillRoundedRect(torsoCenterX - tw * 0.5, torsoTop, tw, th, trx);
  g.lineStyle(1.5, 0x00838f, 0.55);
  g.strokeRoundedRect(torsoCenterX - tw * 0.5, torsoTop, tw, th, trx);

  this._armPath(-1, pose.armL);
  this._armPath(1, pose.armR);

  var hx = 0;
  var hy = logoYToLocal(LOGO_SVG.headCy);
  var hr = LOGO_SVG.headR * sc;
  g.fillStyle(0xf0c4a0, 1);
  g.fillCircle(hx, hy, hr);
  g.lineStyle(1.2, 0xe0b090, 0.45);
  g.strokeCircle(hx, hy, hr);

  g.fillStyle(LOGO_SVG.shortsFill, 1);
  g.fillEllipse(hx, logoYToLocal(LOGO_SVG.brimCy), LOGO_SVG.brimRx * sc, LOGO_SVG.brimRy * sc * 1.2);
  g.fillStyle(0xe53935, 1);
  g.fillEllipse(hx, logoYToLocal(LOGO_SVG.capCy), LOGO_SVG.capRx * sc, LOGO_SVG.capRy * sc);
  g.fillStyle(0xb71c1c, 0.55);
  g.fillEllipse(hx, logoYToLocal(LOGO_SVG.capCy - 2), LOGO_SVG.capRx * sc * 0.85, LOGO_SVG.capRy * sc * 0.55);
};

function DanCharacter(scene, x, y) {
  this.scene = scene;
  this.baseX = x;
  this.baseY = y;

  this.lane = 0;
  this.targetLane = 0;
  this.laneSmooth = 15;

  this.isGrounded = true;
  this.jumpVel = 0;
  /** Integrated with delta in seconds (see update); higher + lower g = taller arc and longer air for streams. */
  this.jumpGravity = 385;
  this.jumpPower = 278;
  this.jumpY = 0;
  this.jumpSquat = 0;
  this.landSquash = 0;

  this.runPhase = 0;
  this.shadowScale = 1;
  this.asymPhase = Math.random() * Math.PI * 2;

  this.fallen = false;
  this.fallTime = 0;
  this.steerTilt = 0;

  this.STATE = { RUN: "run", JUMP: "jump", FALL: "fall" };
  this.animState = this.STATE.RUN;

  this.poseRig = new LogoDanPose();
  this._renderer = null;

  this.container = scene.add.container(x, y);
  this.container.setDepth(2800);

  this.shadow = scene.add.image(0, 18 * DAN_VISUAL_SCALE, "shadow");
  this.shadow.setTint(0x000000);
  this.shadow.setAlpha(0.35);

  this.bodyRoot = scene.add.container(0, 0);
  this.g = scene.add.graphics();
  this.bodyRoot.add(this.g);
  this.container.add([this.shadow, this.bodyRoot]);

  this._renderer = new LogoDanRenderer(this.g);
  this._redraw(0, 0);
}

DanCharacter.prototype._redraw = function (time, _delta) {
  this.g.clear();

  var pose;
  if (this.fallen) {
    pose = this.poseRig.compute(
      this.runPhase,
      this._lastRunSpeed || 118,
      0,
      0,
      0,
      true,
      time + this.fallTime
    );
    this.bodyRoot.setScale(pose.squashX, pose.squashY);
    this.bodyRoot.setY(pose.bodyY);
    this._renderer.draw(pose, false);
    return;
  }

  if (!this.isGrounded) {
    pose = this.poseRig.compute(
      this.runPhase,
      this._lastRunSpeed || 118,
      this.jumpY,
      this.jumpVel,
      this.jumpSquat,
      false,
      0
    );
    this.bodyRoot.setScale(pose.squashX, pose.squashY);
    this.bodyRoot.setY(pose.bodyY);
    this._renderer.draw(pose, false);
    return;
  }

  this.animState = this.STATE.RUN;
  pose = this.poseRig.compute(
    this.runPhase,
    this._lastRunSpeed || 118,
    0,
    0,
    0,
    false,
    0
  );

  if (this.landSquash > 0.01) {
    var u = this.landSquash;
    this.bodyRoot.setScale(1 + u * 0.03, 1 - u * 0.04);
    this.bodyRoot.setY(pose.bodyY + u * 2);
  } else {
    this.bodyRoot.setScale(pose.squashX, pose.squashY);
    this.bodyRoot.setY(pose.bodyY);
  }

  var registryRun = isTrailRunActive(this.scene);
  this._renderer.draw(pose, registryRun);
};

DanCharacter.prototype.setInput = function (pointerX, gameWidth, jumpRequested) {
  var gw = gameWidth > 0 ? gameWidth : 1;
  var nx = pointerX / gw;
  this.targetLane = Phaser.Math.Clamp(nx * 2 - 1, -1, 1);

  if (jumpRequested && this.isGrounded && !this.fallen) {
    this.jumpSquat = 0;
    this.jumpVel = this.jumpPower;
    this.isGrounded = false;
    this.animState = this.STATE.JUMP;
    return true;
  }

  return false;
};

DanCharacter.prototype.update = function (time, delta, runSpeed) {
  var rs = runSpeed !== undefined ? runSpeed : 118;
  this._lastRunSpeed = rs;

  if (this.fallen) {
    this._redraw(time, delta);
    return;
  }

  var dt = delta / 1000;
  this.lane += (this.targetLane - this.lane) * Math.min(1, this.laneSmooth * dt);
  /** ±1 matches trail half-width in Projection (cx ± lane×laneW); cannot steer past the wedge. */
  this.lane = Phaser.Math.Clamp(this.lane, -1, 1);

  var w = this.scene.scale.width;
  var h = this.scene.scale.height;
  var pZ = typeof this.scene.playerZ === "number" ? this.scene.playerZ : 0;
  var depth = TrailProjection.Z_NEAR;
  var p = TrailProjection.project(depth, w, h);
  var cx = p.centerX + TrailProjection.trailCenterOffset(pZ + depth);
  var onTrailX = cx + this.lane * p.halfWidth * 0.9;

  if (!this.isGrounded) {
    this.jumpY += this.jumpVel * dt;
    this.jumpVel -= this.jumpGravity * dt;

    if (this.jumpY <= 0) {
      this.jumpY = 0;
      this.jumpVel = 0;
      this.isGrounded = true;
      this.animState = this.STATE.RUN;
      this.landSquash = 1;

      var self = this;
      this.scene.tweens.add({
        targets: this,
        landSquash: 0,
        duration: 160,
        ease: "Sine.easeOut",
        onUpdate: function () {
          self._redraw(self.scene.time.now, 16);
        },
      });

      this.scene.events.emit("danLand");
    }
  }

  var registryRun = isTrailRunActive(this.scene);
  if (this.isGrounded && this.animState === this.STATE.RUN) {
    if (registryRun) {
      var bouncePeriodMs = Math.max(260, 420 - DanMath.clamp(rs - 118, 0, 100) * 1.35);
      this.runPhase += delta * ((Math.PI * 2) / bouncePeriodMs);
    } else {
      this.runPhase += delta * ((Math.PI * 2) / 500);
    }
  }

  this.shadowScale = DanMath.clamp(1 - this.jumpY * 0.0018, 0.52, 1);
  var shadowSep = 18 * DAN_VISUAL_SCALE + this.jumpY * 0.11;
  var logoBobY = 0;
  if (!registryRun && this.isGrounded && !this.fallen) {
    logoBobY = Math.sin(time * ((Math.PI * 2) / 550)) * 5 * DAN_VISUAL_SCALE;
    shadowSep += logoBobY * 0.15;
  }
  this.shadow.setY(shadowSep);
  var squash = 1 - Math.abs(this.steerTilt) * 0.08;
  this.shadow.setScale(
    DAN_VISUAL_SCALE * this.shadowScale * squash,
    (DAN_VISUAL_SCALE * this.shadowScale * 0.35) / 0.4
  );
  this.shadow.setAlpha(0.14 + 0.28 * this.shadowScale);

  var targetTilt = DanMath.clamp(this.targetLane * 0.35, -0.35, 0.35);
  this.steerTilt += (targetTilt - this.steerTilt) * Math.min(1, 16 * dt);
  this.bodyRoot.rotation = -this.steerTilt * 0.35;

  this.container.setPosition(onTrailX, this.baseY + logoBobY);
  this.g.setY(this.isGrounded ? 0 : -this.jumpY * 0.92);

  this._redraw(time, delta);
};

DanCharacter.prototype.triggerFall = function () {
  if (this.fallen) return;

  this.scene.tweens.killTweensOf(this);
  this.fallen = true;
  this.fallTime = this.scene.time.now;
  this.jumpSquat = 0;
  this.animState = this.STATE.FALL;

  var self = this;
  this._redraw(this.scene.time.now, 0);

  this.scene.tweens.add({
    targets: this.bodyRoot,
    angle: 88,
    duration: 520,
    ease: "Sine.easeIn",
    onUpdate: function () {
      self._redraw(self.scene.time.now, 16);
    },
  });

  this.scene.tweens.add({
    targets: this.container,
    y: this.baseY + 32 * DAN_VISUAL_SCALE,
    duration: 520,
    ease: "Sine.easeIn",
  });
};

DanCharacter.prototype.reset = function (x, y) {
  this.scene.tweens.killTweensOf(this.container);
  this.scene.tweens.killTweensOf(this.bodyRoot);
  this.scene.tweens.killTweensOf(this);

  this.fallen = false;
  this.fallTime = 0;
  this.container.setAngle(0);
  this.bodyRoot.setAngle(0);
  this.bodyRoot.setScale(1, 1);
  this.bodyRoot.setY(0);
  this.steerTilt = 0;

  this.baseX = x;
  this.baseY = y;
  this.lane = 0;
  this.targetLane = 0;
  this.jumpY = 0;
  this.jumpVel = 0;
  this.jumpSquat = 0;
  this.landSquash = 0;
  this.isGrounded = true;
  this.animState = this.STATE.RUN;
  this.runPhase = 0;
  this.asymPhase = Math.random() * Math.PI * 2;

  this.container.setPosition(x, y);
  this.shadow.setY(18 * DAN_VISUAL_SCALE);
  this.shadow.setScale(DAN_VISUAL_SCALE, (DAN_VISUAL_SCALE * 0.35) / 0.4);
  this.shadow.setAlpha(0.4);
  this.g.setY(0);

  this._redraw(0, 0);
};
