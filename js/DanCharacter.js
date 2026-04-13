/**
 * Dan — procedural cartoon trail runner (rear view).
 * States: RUNNING (6-frame cycle), JUMP, FALL.
 * Public API matches legacy PlayerDan for GameScene integration.
 */
function DanCharacter(scene, x, y) {
  this.scene = scene;
  this.baseX = x;
  this.baseY = y;
  this.lane = 0;
  this.targetLane = 0;
  this.laneSmooth = 12;

  this.isGrounded = true;
  this.jumpVel = 0;
  this.jumpGravity = 0.022;
  this.jumpPower = 0.52;
  this.jumpY = 0;

  this.runPhase = 0;
  this.bobAmp = 4.35;
  this.shadowScale = 1;

  this.fallen = false;
  this.fallTime = 0;
  this.steerTilt = 0;

  /** @enum {string} */
  this.STATE = { RUN: "run", JUMP: "jump", FALL: "fall" };
  this.animState = this.STATE.RUN;

  this.container = scene.add.container(x, y);
  this.container.setDepth(2800);

  this.shadow = scene.add.image(0, 18, "shadow");
  this.shadow.setTint(0x000000);
  this.shadow.setAlpha(0.35);

  this.bodyRoot = scene.add.container(0, 0);
  this.g = scene.add.graphics();
  this.bodyRoot.add(this.g);
  /** Mirror so rear-view silhouette faces up-trail (away from camera). */
  this.bodyRoot.setScale(-1, 1);
  this.container.add([this.shadow, this.bodyRoot]);
  this._redraw(0, 0);
}

DanCharacter.prototype.setInput = function (pointerX, gameWidth, jumpRequested) {
  var nx = pointerX / gameWidth;
  this.targetLane = Phaser.Math.Clamp(nx * 2 - 1, -0.92, 0.92);

  if (jumpRequested && this.isGrounded && !this.fallen) {
    this.jumpVel = this.jumpPower;
    this.isGrounded = false;
    this.animState = this.STATE.JUMP;
    return true;
  }
  return false;
};

/**2-bone IK: hip (x1,y1) to foot (x2,y2); returns knee. sign +1/-1 picks solution (knee forward). */
DanCharacter.ikKnee = function (x1, y1, x2, y2, len1, len2, sign) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var dist = Math.sqrt(dx * dx + dy * dy);
  var maxD = len1 + len2 - 0.5;
  if (dist > maxD) {
    var s = maxD / dist;
    x2 = x1 + dx * s;
    y2 = y1 + dy * s;
    dx = x2 - x1;
    dy = y2 - y1;
    dist = maxD;
  }
  if (dist < Math.abs(len1 - len2) + 0.5) dist = Math.abs(len1 - len2) + 0.5;
  var c = (dist * dist + len1 * len1 - len2 * len2) / (2 * dist * len1);
  c = Phaser.Math.Clamp(c, -1, 1);
  var a = Math.acos(c);
  var b = Math.atan2(dy, dx);
  var theta = b + sign * a;
  return {
    kx: x1 + Math.cos(theta) * len1,
    ky: y1 + Math.sin(theta) * len1,
  };
};

/** Foot targets — stronger knee lift & stride (rear view, smaller y = more “up-trail”). */
DanCharacter.RUN_FEET = [
  { lx: -11, ly: 2, rx: 22, ry: 10 },
  { lx: -2, ly: 2, rx: 17, ry: 9 },
  { lx: 10, ly: 3, rx: 6, ry: 8 },
  { lx: 20, ly: 4, rx: -8, ry: 7 },
  { lx: 16, ly: 5, rx: 0, ry: 6 },
  { lx: 2, ly: 3, rx: 14, ry: 9 },
];

/** Hand targets — wider arm swing, opposite legs. */
DanCharacter.RUN_HANDS = [
  { lx: 24, ly: -36, rx: -26, ry: -38 },
  { lx: 20, ly: -40, rx: -18, ry: -34 },
  { lx: 8, ly: -46, rx: 6, ry: -30 },
  { lx: -22, ly: -38, rx: 22, ry: -40 },
  { lx: -16, ly: -34, rx: 18, ry: -46 },
  { lx: 10, ly: -32, rx: 10, ry: -46 },
];

DanCharacter.prototype._lerpPose = function (poses, t) {
  var n = poses.length;
  var f = t * n;
  var i0 = Math.floor(f) % n;
  var i1 = (i0 + 1) % n;
  var u = f - Math.floor(f);
  var a = poses[i0];
  var b = poses[i1];
  return {
    lx: Phaser.Math.Linear(a.lx, b.lx, u),
    ly: Phaser.Math.Linear(a.ly, b.ly, u),
    rx: Phaser.Math.Linear(a.rx, b.rx, u),
    ry: Phaser.Math.Linear(a.ry, b.ry, u),
  };
};

DanCharacter.prototype._drawRunStreaks = function (g, phase) {
  var pulse = 0.14 + 0.1 * Math.abs(Math.sin(phase * 2));
  g.lineStyle(2, 0xffffff, pulse);
  for (var i = 0; i < 4; i++) {
    var ox = -42 - i * 10 + Math.sin(phase + i * 0.7) * 5;
    var oy = 4 + i * 5;
    g.lineBetween(ox, oy, ox - 16, oy + 4 + i * 0.5);
  }
  g.lineStyle(2, 0xc8e6c9, pulse * 0.65);
  g.lineBetween(-38, 18, -52, 22);
  g.lineBetween(-30, 22, -46, 27);
};

DanCharacter.prototype._drawShoe = function (g, x, y, toeX, toeY, fill, sole) {
  var ang = Math.atan2(toeY - y, toeX - x);
  var c = Math.cos(ang);
  var s = Math.sin(ang);
  var w = 20;
  var h = 9;
  var hx = x - s * 2;
  var hy = y + c * 2;
  g.fillStyle(sole, 1);
  g.beginPath();
  g.moveTo(hx + (-w * 0.45) * c - (-h * 0.3) * s, hy + (-w * 0.45) * s + (-h * 0.3) * c);
  g.lineTo(hx + (w * 0.55) * c - (-h * 0.2) * s, hy + (w * 0.55) * s + (-h * 0.2) * c);
  g.lineTo(hx + (w * 0.5) * c - (h * 0.55) * s, hy + (w * 0.5) * s + (h * 0.55) * c);
  g.lineTo(hx + (-w * 0.35) * c - (h * 0.5) * s, hy + (-w * 0.35) * s + (h * 0.5) * c);
  g.closePath();
  g.fillPath();
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(hx + (-w * 0.38) * c - (-h * 0.25) * s, hy + (-w * 0.38) * s + (-h * 0.25) * c);
  g.lineTo(hx + (w * 0.48) * c - (-h * 0.15) * s, hy + (w * 0.48) * s + (-h * 0.15) * c);
  g.lineTo(hx + (w * 0.42) * c - (h * 0.45) * s, hy + (w * 0.42) * s + (h * 0.45) * c);
  g.lineTo(hx + (-w * 0.32) * c - (h * 0.42) * s, hy + (-w * 0.32) * s + (h * 0.42) * c);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0xffab91, 0.9);
  g.lineBetween(
    hx + (-w * 0.1) * c,
    hy + (-w * 0.1) * s,
    hx + (w * 0.35) * c,
    hy + (w * 0.35) * s
  );
  g.lineStyle(2, 0xeeeeee, 0.75);
  g.lineBetween(
    hx + (w * 0.05) * c - 2 * s,
    hy + (w * 0.05) * s + 2 * c,
    hx + (w * 0.28) * c - 2 * s,
    hy + (w * 0.28) * s + 2 * c
  );
  g.fillStyle(0x37474f, 0.9);
  g.fillEllipse(hx - s * 6, hy + c * 6, 6, 4);
};

DanCharacter.prototype._drawLimbChain = function (g, x0, y0, x1, y1, x2, y2, w0, w1, col, stroke) {
  g.lineStyle(w0, col, 1);
  g.lineBetween(x0, y0, x1, y1);
  g.lineStyle(w1, col, 1);
  g.lineBetween(x1, y1, x2, y2);
  if (stroke) {
    g.lineStyle(2, stroke, 0.45);
    g.lineBetween(x0, y0, x1, y1);
    g.lineBetween(x1, y1, x2, y2);
  }
};

DanCharacter.prototype._drawJoint = function (g, x, y, r, col, rim) {
  g.fillStyle(col, 1);
  g.fillCircle(x, y, r);
  if (rim) {
    g.lineStyle(1, rim, 0.5);
    g.strokeCircle(x, y, r);
  }
};

DanCharacter.prototype._drawLeg = function (g, hipX, hipY, footX, footY, skinCol, ikSign) {
  var T = 40;
  var C = 35;
  var k = DanCharacter.ikKnee(hipX, hipY, footX, footY, T, C, ikSign);
  this._drawLimbChain(g, hipX, hipY, k.kx, k.ky, footX, footY, 17, 13.5, skinCol, 0xc48b6b);
  this._drawJoint(g, k.kx, k.ky, 5.5, 0xe8b89a, 0xbc8f6f);
  this._drawShoe(g, footX, footY, footX + (footX - k.kx) * 0.38, footY + 4, 0xffffff, 0xff7043);
};

DanCharacter.prototype._drawArm = function (g, sx, sy, handX, handY, skinCol, shirtCol, ikSign) {
  var U = 26;
  var F = 23;
  var k = DanCharacter.ikKnee(sx, sy, handX, handY, U, F, ikSign);
  g.fillStyle(shirtCol, 1);
  g.fillCircle(sx, sy, 8);
  g.fillStyle(0x00838f, 0.55);
  g.fillEllipse(sx, sy + 2, 10, 5);
  this._drawLimbChain(g, sx, sy, k.kx, k.ky, handX, handY, 13, 11, skinCol, 0xc48b6b);
  this._drawJoint(g, k.kx, k.ky, 4.5, 0xe8b89a, 0xbc8f6f);
  g.fillStyle(skinCol, 1);
  g.fillRoundedRect(handX - 5, handY - 5, 10, 11, 3);
  g.lineStyle(2, 0xffffff, 0.85);
  g.strokeRoundedRect(handX - 5, handY - 5, 10, 11, 3);
};

/** Forward lean into the trail (positive skew): shoulders shift “up-trail” / away from camera. */
DanCharacter.prototype._drawTorso = function (g, cx, cy, leanRad, shirtCol, shortsCol) {
  var skew = Math.tan(leanRad) * 26;
  var top = cy - 36;
  var bot = cy + 8;
  g.fillStyle(shirtCol, 1);
  g.beginPath();
  g.moveTo(cx - 26 + skew, top);
  g.lineTo(cx + 26 + skew, top);
  g.lineTo(cx + 26 - skew * 0.28, bot);
  g.lineTo(cx - 26 - skew * 0.28, bot);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0x00838f, 0.55);
  g.beginPath();
  g.moveTo(cx - 26 + skew, top);
  g.lineTo(cx + 26 + skew, top);
  g.lineTo(cx + 26 - skew * 0.28, bot);
  g.lineTo(cx - 26 - skew * 0.28, bot);
  g.closePath();
  g.strokePath();
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(cx + skew * 0.35 - 8, top + 10, 16, 6, 3);
  g.fillStyle(0xb2ebf2, 0.35);
  g.fillRoundedRect(cx - 22 + skew * 0.5, top + 14, 5, 16, 2);
  var sy = cy + 8;
  g.fillStyle(shortsCol, 1);
  g.fillRoundedRect(cx - 28, sy, 56, 20, 8);
  g.lineStyle(2, 0x0d1b2a, 0.45);
  g.strokeRoundedRect(cx - 28, sy, 56, 20, 8);
};

/** Rear view: crown & nape read as back of head; brim band low toward neck. */
DanCharacter.prototype._drawHead = function (g, cx, cy, bob) {
  var hy = cy + bob * 0.2;
  g.fillStyle(0x4a3728, 0.55);
  g.beginPath();
  g.arc(cx, hy - 4, 19, Math.PI * 1.05, Math.PI * 1.95, false);
  g.lineTo(cx - 14, hy + 6);
  g.closePath();
  g.fillPath();
  g.fillStyle(0xf5d0b5, 1);
  g.fillCircle(cx, hy, 22);
  g.lineStyle(2, 0xe0b090, 0.55);
  g.strokeCircle(cx, hy, 22);
  g.fillStyle(0xd4a574, 0.55);
  g.fillEllipse(cx - 18, hy + 2, 9, 11);
  g.fillEllipse(cx + 18, hy + 2, 9, 11);
  g.fillStyle(0xf5b895, 1);
  g.fillEllipse(cx, hy + 10, 10, 6);
  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(cx - 24, hy - 32, 48, 7, 3);
  g.fillStyle(0xe53935, 1);
  g.fillEllipse(cx, hy - 28, 44, 20);
  g.fillStyle(0xb71c1c, 0.45);
  g.fillEllipse(cx, hy - 34, 36, 12);
  g.fillStyle(0xc62828, 1);
  g.fillRoundedRect(cx - 30, hy - 4, 60, 9, 3);
  g.lineStyle(2, 0x8b1f1f, 0.75);
  g.strokeEllipse(cx, hy - 28, 44, 20);
};

DanCharacter.prototype._drawRunner = function (poseFeet, poseHands, bob, lean, runPhase) {
  var g = this.g;
  var skin = 0xf0c4a0;
  var shirt = 0x00acc1;
  var shorts = 0x263238;
  this._drawRunStreaks(g, runPhase);
  var hipY = -40 + bob * 0.15;
  var hipLX = -10;
  var hipRX = 10;
  var leanR = lean;
  var backFirst = poseFeet.ly >= poseFeet.ry;
  if (backFirst) {
    this._drawLeg(g, hipLX, hipY, poseFeet.lx, poseFeet.ly, skin, -1);
    this._drawLeg(g, hipRX, hipY, poseFeet.rx, poseFeet.ry, skin, 1);
  } else {
    this._drawLeg(g, hipRX, hipY, poseFeet.rx, poseFeet.ry, skin, 1);
    this._drawLeg(g, hipLX, hipY, poseFeet.lx, poseFeet.ly, skin, -1);
  }

  this._drawTorso(g, 0, -56 + bob * 0.35, leanR, shirt, shorts);

  var sdy = -62 + bob * 0.4;
  this._drawArm(g, -24, sdy, poseHands.lx, poseHands.ly, skin, shirt, 1);
  this._drawArm(g, 24, sdy, poseHands.rx, poseHands.ry, skin, shirt, -1);

  this._drawHead(g, 0, -94 + bob * 0.5, bob);
};

DanCharacter.prototype._drawJumpPose = function (jy) {
  var g = this.g;
  var skin = 0xf0c4a0;
  var shirt = 0x00acc1;
  var shorts = 0x263238;
  var tuck = Phaser.Math.Clamp(jy * 0.04, 0, 8);
  var hipY = -30 + tuck;
  var lean = 0.12;

  this._drawLeg(g, -10, hipY, -8, 7 + tuck * 0.5, skin, -1);
  this._drawLeg(g, 10, hipY, 10, 7 + tuck * 0.5, skin, 1);

  this._drawTorso(g, 0, -48 + tuck * 0.3, lean, shirt, shorts);

  var sdy = -54 + tuck * 0.3;
  this._drawArm(g, -24, sdy, -6, -86, skin, shirt, -1);
  this._drawArm(g, 24, sdy, 8, -88, skin, shirt, 1);

  this._drawHead(g, 0, -86 + tuck * 0.25, tuck);
};

DanCharacter.prototype._drawFallPose = function (t) {
  var g = this.g;
  var skin = 0xf0c4a0;
  var shirt = 0x00acc1;
  var shorts = 0x263238;
  var flail = Math.sin(t * 0.02) * 0.35;
  var hipY = 10;
  this._drawLeg(g, -12 + flail * 10, hipY, -28, 22, skin, -1);
  this._drawLeg(g, 14 - flail * 8, hipY, 26, 24, skin, 1);
  this._drawTorso(g, -5, -18, 0.55 + flail * 0.2, shirt, shorts);
  this._drawArm(g, -28, -22, -40 + flail * 20, 8, skin, shirt, 1);
  this._drawArm(g, 18, -20, 35 - flail * 15, 12, skin, shirt, -1);
  this._drawHead(g, -8, -48, 0);
};

DanCharacter.prototype._redraw = function (time, delta) {
  this.g.clear();
  if (this.fallen) {
    this._drawFallPose(time + this.fallTime);
    return;
  }
  if (!this.isGrounded) {
    this._drawJumpPose(this.jumpY);
    return;
  }
  this.animState = this.STATE.RUN;
  var cycle = (this.runPhase % (Math.PI * 2)) / (Math.PI * 2);
  var feet = this._lerpPose(DanCharacter.RUN_FEET, cycle);
  var hands = this._lerpPose(DanCharacter.RUN_HANDS, cycle);
  var bob = Math.sin(this.runPhase) * this.bobAmp;
  var lean = 0.14;
  this._drawRunner(feet, hands, bob, lean, this.runPhase);
};

DanCharacter.prototype.update = function (time, delta, runSpeed) {
  var rs = runSpeed !== undefined ? runSpeed : 118;

  if (this.fallen) {
    this.g.setY(0);
    this._redraw(time, delta);
    return;
  }

  var dt = delta / 1000;
  this.lane += (this.targetLane - this.lane) * Math.min(1, this.laneSmooth * dt);

  var w = this.scene.scale.width;
  var h = this.scene.scale.height;
  var pZ = typeof this.scene.playerZ === "number" ? this.scene.playerZ : 0;
  var depth = TrailProjection.Z_NEAR;
  var p = TrailProjection.project(depth, w, h);
  var cx = p.centerX + TrailProjection.trailCenterOffset(pZ + depth);
  var onTrailX = cx + this.lane * p.halfWidth * 0.9;

  if (!this.isGrounded) {
    this.jumpY += this.jumpVel * delta;
    this.jumpVel -= this.jumpGravity * delta;
    if (this.jumpY <= 0) {
      this.jumpY = 0;
      this.jumpVel = 0;
      this.isGrounded = true;
      this.animState = this.STATE.RUN;
      this.scene.events.emit("danLand");
    }
  }

  if (this.isGrounded) {
    this.runPhase += delta * 0.012 * (0.55 + rs / 420);
  }

  this.shadowScale = Phaser.Math.Clamp(1 - this.jumpY * 0.0018, 0.55, 1);
  var squash = 1 - Math.abs(this.steerTilt) * 0.14;
  this.shadow.setScale(this.shadowScale * squash, (this.shadowScale * 0.35) / 0.4);
  this.shadow.setAlpha(0.15 + 0.25 * this.shadowScale);

  var targetTilt = Phaser.Math.Clamp(this.targetLane * 0.44, -0.44, 0.44);
  this.steerTilt += (targetTilt - this.steerTilt) * Math.min(1, 14 * dt);
  this.bodyRoot.rotation = -this.steerTilt;

  this.container.setPosition(onTrailX, this.baseY);

  this.g.setY(this.isGrounded ? 0 : -this.jumpY * 0.92);
  this._redraw(time, delta);
};

DanCharacter.prototype.triggerFall = function () {
  if (this.fallen) return;
  this.fallen = true;
  this.fallTime = this.scene.time.now;
  var self = this;
  this._redraw(this.scene.time.now, 0);
  this.scene.tweens.add({
    targets: this.bodyRoot,
    angle: 88,
    duration: 680,
    ease: "Sine.easeIn",
    onUpdate: function () {
      self._redraw(self.scene.time.now, 16);
    },
  });
  this.scene.tweens.add({
    targets: this.container,
    y: this.baseY + 42,
    duration: 680,
    ease: "Sine.easeIn",
  });
};

DanCharacter.prototype.reset = function (x, y) {
  this.scene.tweens.killTweensOf(this.container);
  this.scene.tweens.killTweensOf(this.bodyRoot);
  this.fallen = false;
  this.fallTime = 0;
  this.container.setAngle(0);
  this.bodyRoot.setAngle(0);
  this.bodyRoot.setScale(-1, 1);
  this.steerTilt = 0;
  this.baseX = x;
  this.baseY = y;
  this.lane = 0;
  this.targetLane = 0;
  this.jumpY = 0;
  this.jumpVel = 0;
  this.isGrounded = true;
  this.animState = this.STATE.RUN;
  this.runPhase = 0;
  this.container.setPosition(x, y);
  this.shadow.setScale(1, 0.35 / 0.4);
  this.shadow.setAlpha(0.4);
  this.g.setY(0);
  this._redraw(0, 0);
};
