/**
 * Dan — rigged procedural cartoon trail runner (rear / slight rear-3/4 view).
 *
 * STRUCTURE
 * ---------
 * 1) DanCharacter      — lane, jump physics, fall flag, animation phase (what time it is).
 * 2) DanRunnerRig      — turns phase + state into joint positions / angles (skeleton pose).
 * 3) DanRunnerRender   — draws rounded vector parts with Phaser Graphics (silhouette).
 *
 * COORDINATES (local rig space, origin near feet)
 * -----------------------------------------------
 * +Y is down (Phaser). The runner faces up-trail (-Y). The camera is behind him, so we
 * draw his back: cap crown toward -Y, brim toward +Y (nape), shoulders wide on X.
 *
 * RUN CYCLE MATH
 * --------------
 * Primary phase `p` advances with stride frequency. Legs use opposite sine pushes:
 *   left foot drive ~ sin(p), right ~ sin(p + π).
 * Lift uses cos² for grounded contact vs flight. Knee bend adds a π offset harmonic.
 * Arms swing opposite legs with elbow flex from |sin(p + π/2)|.
 * Torso bob = sin(2p)·A + small noise; shoulders counter-rotate slightly vs hips.
 *
 * DRAW ORDER (rear-view painter’s sort)
 * -------------------------------------
 * Far foot (smaller Y = farther up-trail) → far arm → glutes/hips → torso → shorts hem →
 * near arm → near foot → neck → head → cap. Shoes sit on leg ends with sole pass last.
 */

/* global DanMath */

// ————————————————————————————————————————————————————————————————————————
// Rig: skeletal pose from phase & state (no drawing)
// ————————————————————————————————————————————————————————————————————————

function DanRunnerRig() {
  /** Bone lengths — tuned for ~150px tall silhouette */
  this.L = {
    thigh: 36,
    calf: 34,
    foot: 10,
    upperArm: 24,
    foreArm: 22,
    torso: 52,
    neck: 10,
    headR: 20,
  };
}

/**
 * @returns {object} pose — segment endpoints + metadata for renderer & depth sort
 */
DanRunnerRig.prototype.computeRunPose = function (phase, bob, leanRad, runSpeed, asymNudge) {
  var L = this.L;
  var p = phase;
  var rs = runSpeed !== undefined ? runSpeed : 118;
  var stride = 0.62 + rs / 700;
  var asym = asymNudge || 0;

  // Opposite leg drives; lift peaks between contacts
  var sL = Math.sin(p);
  var sR = Math.sin(p + Math.PI);
  var cL = Math.cos(p);
  var cR = Math.cos(p + Math.PI);

  // Foot targets (hip-local). ly larger = more down on screen (closer to camera)
  var spread = 13;
  var lFootX = sL * spread * 1.15 + asym * 4 * Math.sin(p * 0.5);
  var rFootX = sR * spread * 1.15 - asym * 4 * Math.sin(p * 0.5);
  var liftL = 11 * stride * Math.max(0, -cL) * Math.max(0, -cL);
  var liftR = 11 * stride * Math.max(0, -cR) * Math.max(0, -cR);
  var lFootY = 58 + liftL + 2.5 * Math.sin(2 * p +0.2);
  var rFootY = 58 + liftR + 2.5 * Math.sin(2 * p + Math.PI + 0.2);

  // Hips sway + vertical bob
  var hipX = Math.sin(2 * p) * 2.8 + asym * 2 * Math.sin(p);
  var hipY = 38 + bob * 0.12 + Math.sin(2 * p) * 1.2;

  var hipLX = hipX - 11;
  var hipRX = hipX + 11;

  // Knee IK: hip -> knee -> ankle; sign picks outward knee bend in rear view
  var kneeL = DanMath.ik2(hipLX, hipY, lFootX, lFootY, L.thigh, L.calf, -1);
  var kneeR = DanMath.ik2(hipRX, hipY, rFootX, rFootY, L.thigh, L.calf, 1);

  // Shoulders: counter-rotate vs hips (subtle)
  var shoulRoll = -Math.sin(2 * p) * 0.06;
  var shX0 = hipX + Math.tan(leanRad) * (-34);
  var shY0 = hipY - 34 + bob * 0.45;
  var shW = 30;
  var shL = DanMath.rotA(-shW * 0.5, 0, shoulRoll);
  var shR = DanMath.rotA(shW * 0.5, 0, shoulRoll);
  var shoulderLX = shX0 + shL.x;
  var shoulderLY = shY0 + shL.y;
  var shoulderRX = shX0 + shR.x;
  var shoulderRY = shY0 + shR.y;

  // Arms opposite legs + elbow bend
  var armPhaseL = p + Math.PI;
  var armPhaseR = p;
  var swing = 22;
  var handLX = shoulderLX + Math.sin(armPhaseL) * swing * 0.85 + 4 * Math.sin(3 * armPhaseL);
  var handLY = shoulderLY + 28 + Math.cos(armPhaseL) * 10 + Math.abs(Math.sin(armPhaseL)) * 6;
  var handRX = shoulderRX + Math.sin(armPhaseR) * swing * 0.85 - 4 * Math.sin(3 * armPhaseR);
  var handRY = shoulderRY + 28 + Math.cos(armPhaseR) * 10 + Math.abs(Math.sin(armPhaseR)) * 6;

  var elbowL = DanMath.ik2(shoulderLX, shoulderLY, handLX, handLY, L.upperArm, L.foreArm, 1);
  var elbowR = DanMath.ik2(shoulderRX, shoulderRY, handRX, handRY, L.upperArm, L.foreArm, -1);

  // Torso anchor (mid-back) and head
  var torsoCx = shX0 + Math.tan(leanRad) * (-18);
  var torsoCy = shY0 + 18;
  var neckX = torsoCx + Math.tan(leanRad) * (-22);
  var neckY = torsoCy - 38 + bob * 0.35;
  var headX = neckX + Math.tan(leanRad) * (-6);
  var headY = neckY - 14 + bob * 0.5;

  // Shoe toe direction from ankle to knee hint
  function shoeDir(kx, ky, fx, fy) {
    var n = DanMath.norm(fx - kx, fy - ky);
    return { x: n.x, y: n.y };
  }

  return {
    kind: "run",
    leanRad: leanRad,
    bob: bob,
    phase: p,
    hip: { x: hipX, y: hipY },
    legL: {
      hip: { x: hipLX, y: hipY },
      knee: kneeL,
      ankle: { x: lFootX, y: lFootY },
      shoe: shoeDir(kneeL.x, kneeL.y, lFootX, lFootY),
    },
    legR: {
      hip: { x: hipRX, y: hipY },
      knee: kneeR,
      ankle: { x: rFootX, y: rFootY },
      shoe: shoeDir(kneeR.x, kneeR.y, rFootX, rFootY),
    },
    armL: {
      shoulder: { x: shoulderLX, y: shoulderLY },
      elbow: elbowL,
      hand: { x: handLX, y: handLY },
    },
    armR: {
      shoulder: { x: shoulderRX, y: shoulderRY },
      elbow: elbowR,
      hand: { x: handRX, y: handRY },
    },
    torso: { cx: torsoCx, cy: torsoCy, lean: leanRad },
    neck: { x: neckX, y: neckY },
    head: { x: headX, y: headY },
    shortsY: hipY - 4,
  };
};

DanRunnerRig.prototype.computeJumpPose = function (jumpY, jumpVel, squat, tuck) {
  var L = this.L;
  var sq = squat || 0;
  var tk = tuck || 0;
  var hipY = 40 + sq * 10 - tk * 0.35;
  var hipX = 0;
  var lean = 0.1;

  var hipLX = -10;
  var hipRX = 10;
  var lFootX = -8 + tk * 0.08;
  var rFootX = 8 - tk * 0.08;
  var lFootY = 56 + sq * 4;
  var rFootY = 56 + sq * 4;

  var kneeL = DanMath.ik2(hipLX, hipY, lFootX, lFootY, L.thigh, L.calf, -1);
  var kneeR = DanMath.ik2(hipRX, hipY, rFootX, rFootY, L.thigh, L.calf, 1);

  var shX0 = Math.tan(lean) * (-30);
  var shY0 = hipY - 32;
  var shoulderLX = shX0 - 24;
  var shoulderRX = shX0 + 24;
  var shoulderLY = shY0;
  var shoulderRY = shY0;

  var up = jumpVel > 0 ? 1 : 0.6;
  var handLX = shoulderLX - 6;
  var handLY = shoulderLY + 16 + (1 - up) * 12;
  var handRX = shoulderRX + 8;
  var handRY = shoulderRY + 14 + (1 - up) * 12;

  var elbowL = DanMath.ik2(shoulderLX, shoulderLY, handLX, handLY, L.upperArm, L.foreArm, 1);
  var elbowR = DanMath.ik2(shoulderRX, shoulderRY, handRX, handRY, L.upperArm, L.foreArm, -1);

  var torsoCx = shX0 + Math.tan(lean) * (-16);
  var torsoCy = shY0 + 16;
  var neckX = torsoCx + Math.tan(lean) * (-20);
  var neckY = torsoCy - 34 - jumpY * 0.04;
  var headX = neckX + Math.tan(lean) * (-5);
  var headY = neckY - 12 - jumpY * 0.06;

  function shoeDir(kx, ky, fx, fy) {
    var n = DanMath.norm(fx - kx, fy - ky);
    return { x: n.x, y: n.y };
  }

  return {
    kind: "jump",
    leanRad: lean,
    bob: 0,
    phase: 0,
    hip: { x: hipX, y: hipY },
    legL: {
      hip: { x: hipLX, y: hipY },
      knee: kneeL,
      ankle: { x: lFootX, y: lFootY },
      shoe: shoeDir(kneeL.x, kneeL.y, lFootX, lFootY),
    },
    legR: {
      hip: { x: hipRX, y: hipY },
      knee: kneeR,
      ankle: { x: rFootX, y: rFootY },
      shoe: shoeDir(kneeR.x, kneeR.y, rFootX, rFootY),
    },
    armL: {
      shoulder: { x: shoulderLX, y: shoulderLY },
      elbow: elbowL,
      hand: { x: handLX, y: handLY },
    },
    armR: {
      shoulder: { x: shoulderRX, y: shoulderRY },
      elbow: elbowR,
      hand: { x: handRX, y: handRY },
    },
    torso: { cx: torsoCx, cy: torsoCy, lean: lean },
    neck: { x: neckX, y: neckY },
    head: { x: headX, y: headY },
    shortsY: hipY - 4,
    airLift: jumpY * 0.08,
  };
};

DanRunnerRig.prototype.computeFallPose = function (t, flail) {
  var L = this.L;
  var f = flail || 0;
  var hipY = 48;
  var hipX = -6 + f * 8;
  var hipLX = hipX - 12;
  var hipRX = hipX + 14;
  var lFootX = -32 + f * 12;
  var rFootX = 28 - f * 10;
  var lFootY = 62 + Math.sin(t * 0.05) * 3;
  var rFootY = 64 - Math.sin(t * 0.05) * 2;

  var kneeL = DanMath.ik2(hipLX, hipY, lFootX, lFootY, L.thigh, L.calf, -1);
  var kneeR = DanMath.ik2(hipRX, hipY, rFootX, rFootY, L.thigh, L.calf, 1);

  var lean = 0.62 + f * 0.15;
  var shX0 = hipX + Math.tan(lean) * (-22);
  var shY0 = hipY - 26;
  var shoulderLX = shX0 - 22 + f * 18;
  var shoulderRX = shX0 + 18 - f * 12;
  var shoulderLY = shY0 + f * 6;
  var shoulderRY = shY0 + f * 4;

  var handLX = shoulderLX - 28 + f * 22;
  var handLY = shoulderLY + 22;
  var handRX = shoulderRX + 32 - f * 16;
  var handRY = shoulderRY + 26;

  var elbowL = DanMath.ik2(shoulderLX, shoulderLY, handLX, handLY, L.upperArm, L.foreArm, 1);
  var elbowR = DanMath.ik2(shoulderRX, shoulderRY, handRX, handRY, L.upperArm, L.foreArm, -1);

  var torsoCx = shX0 + Math.tan(lean) * (-12);
  var torsoCy = shY0 + 10;
  var neckX = torsoCx + Math.tan(lean) * (-14);
  var neckY = torsoCy - 22;
  var headX = neckX + Math.tan(lean) * (-10) + f * 4;
  var headY = neckY - 8 + f * 3;

  function shoeDir(kx, ky, fx, fy) {
    var n = DanMath.norm(fx - kx, fy - ky);
    return { x: n.x, y: n.y };
  }

  return {
    kind: "fall",
    leanRad: lean,
    bob: 0,
    phase: t,
    hip: { x: hipX, y: hipY },
    legL: {
      hip: { x: hipLX, y: hipY },
      knee: kneeL,
      ankle: { x: lFootX, y: lFootY },
      shoe: shoeDir(kneeL.x, kneeL.y, lFootX, lFootY),
    },
    legR: {
      hip: { x: hipRX, y: hipY },
      knee: kneeR,
      ankle: { x: rFootX, y: rFootY },
      shoe: shoeDir(kneeR.x, kneeR.y, rFootX, rFootY),
    },
    armL: {
      shoulder: { x: shoulderLX, y: shoulderLY },
      elbow: elbowL,
      hand: { x: handLX, y: handLY },
    },
    armR: {
      shoulder: { x: shoulderRX, y: shoulderRY },
      elbow: elbowR,
      hand: { x: handRX, y: handRY },
    },
    torso: { cx: torsoCx, cy: torsoCy, lean: lean },
    neck: { x: neckX, y: neckY },
    head: { x: headX, y: headY },
    shortsY: hipY - 4,
  };
};

// ————————————————————————————————————————————————————————————————————————
// Renderer: rounded vector passes (Graphics only)
// ————————————————————————————————————————————————————————————————————————

function DanRunnerRender(g) {
  this.g = g;
}

/**
 * Phaser.Graphics has no Canvas-style quadraticCurveTo. Approximate B -> Q with control C.
 * (x0,y0)=start, (cpx,cpy)=control, (x1,y1)=end — same as HTML canvas quadraticCurveTo.
 */
DanRunnerRender.prototype._q = function (x0, y0, cpx, cpy, x1, y1, segments) {
  var g = this.g;
  var n = segments || 14;
  for (var i = 1; i <= n; i++) {
    var t = i / n;
    var u = 1 - t;
    g.lineTo(
      u * u * x0 + 2 * u * t * cpx + t * t * x1,
      u * u * y0 + 2 * u * t * cpy + t * t * y1
    );
  }
};

DanRunnerRender.prototype._capsule = function (x0, y0, x1, y1, r0, r1, fill, stroke, strokeW) {
  var g = this.g;
  var dx = x1 - x0;
  var dy = y1 - y0;
  var len = DanMath.len(dx, dy);
  if (len < 0.01) return;
  var ux = dx / len;
  var uy = dy / len;
  var nx = -uy;
  var ny = ux;
  var xA = x0 + nx * r0;
  var yA = y0 + ny * r0;
  var xB = x0 - nx * r0;
  var yB = y0 - ny * r0;
  var xD = x1 + nx * r1;
  var yD = y1 + ny * r1;
  var a0 = Math.atan2(ny, nx);
  var a1 = Math.atan2(-ny, -nx);
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(xA, yA);
  g.lineTo(xD, yD);
  g.arc(x1, y1, r1, a0, a1, false);
  g.lineTo(xB, yB);
  g.arc(x0, y0, r0, a1 + Math.PI, a0 + Math.PI, false);
  g.closePath();
  g.fillPath();
  if (stroke != null) {
    g.lineStyle(strokeW || 1.5, stroke, 0.45);
    g.strokePath();
  }
};

/** Darker underside pass: offset capsule */
DanRunnerRender.prototype._capsuleShade = function (x0, y0, x1, y1, r0, r1, shadeCol) {
  this._capsule(
    x0 + 1.2,
    y0 + 1.8,
    x1 + 1.2,
    y1 + 1.8,
    r0 * 0.92,
    r1 * 0.92,
    shadeCol,
    null,
    0
  );
};

DanRunnerRender.prototype._leg = function (leg, skin, skinDark, shoeTop, sole) {
  var hip = leg.hip;
  var knee = leg.knee;
  var ankle = leg.ankle;
  this._capsuleShade(hip.x, hip.y, knee.x, knee.y, 9.5, 7.2, skinDark);
  this._capsule(hip.x, hip.y, knee.x, knee.y, 9.5, 7.2, skin, 0xc8956f, 1.2);
  this._capsuleShade(knee.x, knee.y, ankle.x, ankle.y, 6.8, 5.2, skinDark);
  this._capsule(knee.x, knee.y, ankle.x, ankle.y, 6.8, 5.2, skin, 0xc8956f, 1.2);
  this._shoe(ankle.x, ankle.y, leg.shoe.x, leg.shoe.y, shoeTop, sole);
};

DanRunnerRender.prototype._arm = function (arm, skin, skinDark, sleeve) {
  var s = arm.shoulder;
  var e = arm.elbow;
  var h = arm.hand;
  this._capsuleShade(s.x, s.y, e.x, e.y, 7.2, 5.8, skinDark);
  this._capsule(s.x, s.y, e.x, e.y, 7.2, 5.8, skin, 0xc8956f, 1.1);
  // Sleeve puff at shoulder
  this.g.fillStyle(sleeve, 1);
  this.g.fillEllipse(s.x, s.y + 1, 15, 11);
  this.g.lineStyle(1.5, 0x006064, 0.4);
  this.g.strokeEllipse(s.x, s.y + 1, 15, 11);
  this._capsuleShade(e.x, e.y, h.x, h.y, 5.4, 4.2, skinDark);
  this._capsule(e.x, e.y, h.x, h.y, 5.4, 4.2, skin, 0xc8956f, 1);
  this._hand(h.x, h.y);
};

DanRunnerRender.prototype._hand = function (x, y) {
  var g = this.g;
  g.fillStyle(0xf0c4a0, 1);
  g.fillEllipse(x, y + 1, 9, 7);
  g.lineStyle(1.2, 0xd9a088, 0.65);
  g.strokeEllipse(x, y + 1, 9, 7);
};

DanRunnerRender.prototype._shoe = function (ax, ay, dirX, dirY, fill, sole) {
  var ang = Math.atan2(dirY, dirX);
  var c = Math.cos(ang);
  var s = Math.sin(ang);
  var hx = ax - s * 2;
  var hy = ay + c * 2;
  var w = 21;
  var h = 10;
  var g = this.g;
   var ax0 = hx + (-w * 0.48) * c - (-h * 0.28) * s;
  var ay0 = hy + (-w * 0.48) * s + (-h * 0.28) * c;
  var bx = hx + (w * 0.52) * c - (-h * 0.18) * s;
  var by = hy + (w * 0.52) * s + (-h * 0.18) * c;
  var qcx = hx + (w * 0.58) * c - (h * 0.35) * s;
  var qcy = hy + (w * 0.58) * s + (h * 0.35) * c;
  var ex = hx + (w * 0.42) * c - (h * 0.58) * s;
  var ey = hy + (w * 0.42) * s + (h * 0.58) * c;
  g.fillStyle(sole, 1);
  g.beginPath();
  g.moveTo(ax0, ay0);
  g.lineTo(bx, by);
  this._q(bx, by, qcx, qcy, ex, ey, 12);
  g.lineTo(hx + (-w * 0.36) * c - (h * 0.52) * s, hy + (-w * 0.36) * s + (h * 0.52) * c);
  g.closePath();
  g.fillPath();
  var ax1 = hx + (-w * 0.4) * c - (-h * 0.22) * s;
  var ay1 = hy + (-w * 0.4) * s + (-h * 0.22) * c;
  var bx2 = hx + (w * 0.46) * c - (-h * 0.12) * s;
  var by2 = hy + (w * 0.46) * s + (-h * 0.12) * c;
  var qcx2 = hx + (w * 0.5) * c - (h * 0.32) * s;
  var qcy2 = hy + (w * 0.5) * s + (h * 0.32) * c;
  var ex2 = hx + (w * 0.36) * c - (h * 0.48) * s;
  var ey2 = hy + (w * 0.36) * s + (h * 0.48) * c;
  g.fillStyle(fill, 1);
  g.beginPath();
  g.moveTo(ax1, ay1);
  g.lineTo(bx2, by2);
  this._q(bx2, by2, qcx2, qcy2, ex2, ey2, 12);
  g.lineTo(hx + (-w * 0.3) * c - (h * 0.44) * s, hy + (-w * 0.3) * s + (h * 0.44) * c);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.5, 0xb0bec5, 0.85);
  g.lineBetween(
    hx + (w * 0.05) * c - 2 * s,
    hy + (w * 0.05) * s + 2 * c,
    hx + (w * 0.32) * c - 2 * s,
    hy + (w * 0.32) * s + 2 * c
  );
  g.fillStyle(0x37474f, 0.92);
  g.fillEllipse(hx - s * 7, hy + c * 7, 7, 4);
};

DanRunnerRender.prototype._glutes = function (hipX, hipY) {
  var g = this.g;
  g.fillStyle(0x263238, 0.92);
  g.fillEllipse(hipX, hipY - 6, 34, 18);
  g.lineStyle(1.2, 0x0f172a, 0.35);
  g.strokeEllipse(hipX, hipY - 6, 34, 18);
};

DanRunnerRender.prototype._torsoRear = function (cx, cy, lean) {
  var g = this.g;
  var skew = Math.tan(lean) * 24;
  var shirt = 0x0097a7;
  var shirtHi = 0x26c6da;
  // Tapered rounded back: wider at shoulders (-Y), narrower toward waist (+Y)
  g.fillStyle(shirt, 1);
  g.beginPath();
  g.moveTo(cx - 28 + skew, cy - 42);
  this._q(cx - 28 + skew, cy - 42, cx + skew * 0.2, cy - 48, cx + 28 + skew, cy - 42);
  this._q(cx + 28 + skew, cy - 42, cx + 30 - skew * 0.15, cy - 8, cx + 22 - skew * 0.35, cy + 6);
  this._q(cx + 22 - skew * 0.35, cy + 6, cx + skew * 0.1, cy + 12, cx - 22 - skew * 0.35, cy + 6);
  this._q(cx - 22 - skew * 0.35, cy + 6, cx - 30 - skew * 0.15, cy - 8, cx - 28 + skew, cy - 42);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.5, 0x006064, 0.5);
  g.strokePath();
  // Shoulder blades / highlight
  g.fillStyle(shirtHi, 0.35);
  g.fillEllipse(cx - 16 + skew * 0.4, cy - 32, 12, 18);
  g.fillEllipse(cx + 16 + skew * 0.4, cy - 32, 12, 18);
  g.fillStyle(0xffffff, 0.22);
  g.fillEllipse(cx + skew * 0.3, cy - 22, 10, 22);
};

DanRunnerRender.prototype._shorts = function (cx, sy) {
  var g = this.g;
  var shorts = 0x1e293b;
  g.fillStyle(shorts, 1);
  g.beginPath();
  g.moveTo(cx - 30, sy - 2);
  this._q(cx - 30, sy - 2, cx - 34, sy + 16, cx - 22, sy + 22);
  g.lineTo(cx - 8, sy + 20);
  this._q(cx - 8, sy + 20, cx - 4, sy + 8, cx, sy + 10);
  this._q(cx, sy + 10, cx + 4, sy + 8, cx + 8, sy + 20);
  g.lineTo(cx + 22, sy + 22);
  this._q(cx + 22, sy + 22, cx + 34, sy + 16, cx + 30, sy - 2);
  this._q(cx + 30, sy - 2, cx, sy - 8, cx - 30, sy - 2);
  g.closePath();
  g.fillPath();
  g.lineStyle(1.5, 0x0f172a, 0.55);
  g.strokePath();
  g.lineStyle(2, 0x334155, 0.9);
  g.lineBetween(cx - 26, sy + 4, cx + 26, sy + 4);
};

DanRunnerRender.prototype._neck = function (nx, ny) {
  this._capsule(nx, ny + 4, nx + Math.tan(0.08) * (-4), ny - 6, 7, 6, 0xf0c4a0, 0xd9a088, 1);
};

DanRunnerRender.prototype._headCapRear = function (hx, hy) {
  var g = this.g;
  // Hair under cap
  g.fillStyle(0x4a3728, 0.75);
  g.beginPath();
  g.arc(hx, hy - 2, 20, Math.PI * 1.08, Math.PI * 1.92, false);
  g.lineTo(hx - 12, hy + 10);
  this._q(hx - 12, hy + 10, hx, hy + 14, hx + 12, hy + 10);
  g.closePath();
  g.fillPath();
  // Head sphere
  g.fillStyle(0xf5d0b5, 1);
  g.fillEllipse(hx, hy + 2, 30, 28);
  g.lineStyle(1.5, 0xe0b090, 0.55);
  g.strokeEllipse(hx, hy + 2, 30, 28);
  // Ears (rear)
  g.fillStyle(0xe8b89a, 1);
  g.fillEllipse(hx - 17, hy + 4, 8, 11);
  g.fillEllipse(hx + 17, hy + 4, 8, 11);
  // Neck shadow
  g.fillStyle(0xd4a574, 0.45);
  g.fillEllipse(hx, hy + 14, 12, 7);
  // Backwards cap: crown toward -Y, brim toward +Y (nape).
  // Phaser 3 Graphics has no path ellipse(); use fillEllipse (center x,y, width, height).
  g.fillStyle(0xffffff, 1);
  g.fillEllipse(hx, hy - 26, 52, 16);
  g.fillStyle(0xe53935, 1);
  g.fillEllipse(hx, hy - 30, 80, 44);
  g.fillStyle(0xb71c1c, 0.55);
  g.fillEllipse(hx, hy - 34, 68, 24);
  // Brim band (wraps toward shoulders)
  g.fillStyle(0xc62828, 1);
  g.beginPath();
  g.moveTo(hx - 34, hy - 6);
  this._q(hx - 34, hy - 6, hx, hy + 6, hx + 34, hy - 6);
  this._q(hx + 34, hy - 6, hx + 30, hy - 12, hx, hy - 8);
  this._q(hx, hy - 8, hx - 30, hy - 12, hx - 34, hy - 6);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, 0x8b1f1f, 0.65);
  g.strokeEllipse(hx, hy - 30, 80, 44);
};

DanRunnerRender.prototype._streaks = function (phase) {
  var g = this.g;
  var pulse = 0.12 + 0.08 * Math.abs(Math.sin(phase * 2));
  g.lineStyle(2, 0xffffff, pulse);
  for (var i = 0; i < 5; i++) {
    var ox = -48 - i * 11 + Math.sin(phase + i * 0.65) * 6;
    var oy = 8 + i * 5;
    g.lineBetween(ox, oy, ox - 18, oy + 5 + i * 0.4);
  }
  g.lineStyle(2, 0xb2dfdb, pulse * 0.55);
  g.lineBetween(-42, 22, -58, 28);
  g.lineBetween(-34, 28, -52, 34);
};

/**
 * Draw full character for pose. farLegKey is 'L' or 'R' — that leg/arm drawn first.
 */
DanRunnerRender.prototype.drawPose = function (pose, opts) {
  opts = opts || {};
  var skin = 0xf0c4a0;
  var skinDark = 0xc8956f;
  var shoe = 0xf5f5f5;
  var sole = 0xff6e40;
  var sleeve = 0x00838f;

  if (opts.streaks !== false && pose.kind === "run") {
    this._streaks(pose.phase);
  }

  var far = opts.farLeg || "L";
  var near = far === "L" ? "R" : "L";
  var legFar = far === "L" ? pose.legL : pose.legR;
  var legNear = near === "L" ? pose.legL : pose.legR;
  var armFar = far === "L" ? pose.armL : pose.armR;
  var armNear = near === "L" ? pose.armL : pose.armR;

  this._leg(legFar, skin, skinDark, shoe, sole);
  this._arm(armFar, skin, skinDark, sleeve);
  this._glutes(pose.hip.x, pose.hip.y);
  this._torsoRear(pose.torso.cx, pose.torso.cy, pose.torso.lean);
  this._shorts(pose.torso.cx, pose.shortsY);
  this._arm(armNear, skin, skinDark, sleeve);
  this._leg(legNear, skin, skinDark, shoe, sole);
  this._neck(pose.neck.x, pose.neck.y);
  this._headCapRear(pose.head.x, pose.head.y);
};

// ————————————————————————————————————————————————————————————————————————
// Character: state machine + GameScene integration
// ————————————————————————————————————————————————————————————————————————

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
  /** 0..1 crouch charge before hop */
  this.jumpSquat = 0;
  this.landSquash = 0;

  this.runPhase = 0;
  this.bobAmp = 5.2;
  this.shadowScale = 1;
  this.asymPhase = Math.random() * Math.PI * 2;

  this.fallen = false;
  this.fallTime = 0;
  this.steerTilt = 0;

  this.STATE = { RUN: "run", JUMP: "jump", PREJUMP: "prejump", FALL: "fall" };
  this.animState = this.STATE.RUN;

  this.rig = new DanRunnerRig();
  this._renderer = null;

  this.container = scene.add.container(x, y);
  this.container.setDepth(2800);

  this.shadow = scene.add.image(0, 18, "shadow");
  this.shadow.setTint(0x000000);
  this.shadow.setAlpha(0.35);

  this.bodyRoot = scene.add.container(0, 0);
  this.g = scene.add.graphics();
  this.bodyRoot.add(this.g);
  /** No horizontal mirror — geometry is authored in rear view. */
  this.bodyRoot.setScale(1, 1);
  this.container.add([this.shadow, this.bodyRoot]);

  this._renderer = new DanRunnerRender(this.g);
  this._redraw(0, 0);
}

DanCharacter.prototype._farLeg = function (pose) {
  return pose.legL.ankle.y <= pose.legR.ankle.y ? "L" : "R";
};

DanCharacter.prototype._redraw = function (time, _delta) {
  this.g.clear();
  var pose;
  var opts = {};

  if (this.fallen) {
    var flail = Math.sin((time + this.fallTime) * 0.018) * 0.4;
    pose = this.rig.computeFallPose(time + this.fallTime, flail);
    opts.streaks = false;
    this._renderer.drawPose(pose, opts);
    return;
  }

  if (!this.isGrounded) {
    var tuck = DanMath.clamp(this.jumpY * 0.06, 0, 10);
    pose = this.rig.computeJumpPose(this.jumpY, this.jumpVel, this.jumpSquat, tuck);
    if (pose.airLift) {
      pose.head.y -= pose.airLift;
      pose.neck.y -= pose.airLift * 0.85;
      pose.torso.cy -= pose.airLift * 0.5;
    }
    opts.streaks = false;
    opts.farLeg = this._farLeg(pose);
    this._renderer.drawPose(pose, opts);
    return;
  }

  if (this.animState === this.STATE.PREJUMP) {
    pose = this.rig.computeJumpPose(0, 1, this.jumpSquat, 0);
    opts.streaks = true;
    opts.farLeg = this._farLeg(pose);
    this._renderer.drawPose(pose, opts);
    return;
  }

  this.animState = this.STATE.RUN;
  var bob =
    Math.sin(this.runPhase) * this.bobAmp + 0.35 * Math.sin(this.runPhase * 2 + this.asymPhase);
  var lean = 0.15;
  var asym = 0.06 * Math.sin(this.asymPhase + this.runPhase * 0.5);
  pose = this.rig.computeRunPose(this.runPhase, bob, lean, this._lastRunSpeed || 118, asym);
  if (this.landSquash > 0.01) {
    var s = 1 - this.landSquash * 0.06;
    this.bodyRoot.setScale(1.02 * s, 0.96 + this.landSquash * 0.05);
  } else {
    this.bodyRoot.setScale(1, 1);
  }
  opts.farLeg = this._farLeg(pose);
  this._renderer.drawPose(pose, opts);
};

DanCharacter.prototype.setInput = function (pointerX, gameWidth, jumpRequested) {
  var nx = pointerX / gameWidth;
  this.targetLane = Phaser.Math.Clamp(nx * 2 - 1, -0.92, 0.92);

  if (jumpRequested && this.isGrounded && !this.fallen && this.animState !== this.STATE.PREJUMP) {
    this.animState = this.STATE.PREJUMP;
    this.jumpSquat = 0;
    var self = this;
    this.scene.tweens.add({
      targets: this,
      jumpSquat: 1,
      duration: 85,
      ease: "Sine.easeIn",
      onComplete: function () {
        if (!self.fallen && self.isGrounded) {
          self.jumpVel = self.jumpPower;
          self.isGrounded = false;
          self.animState = self.STATE.JUMP;
          self.jumpSquat = 0;
        } else {
          self.jumpSquat = 0;
          self.animState = self.STATE.RUN;
        }
      },
    });
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
      this.landSquash = 1;
      var self = this;
      this.scene.tweens.add({
        targets: this,
        landSquash: 0,
        duration: 220,
        ease: "Sine.easeOut",
        onUpdate: function () {
          self._redraw(self.scene.time.now, 16);
        },
      });
      this.scene.events.emit("danLand");
    }
  }

  if (
    this.isGrounded &&
    (this.animState === this.STATE.RUN || this.animState === this.STATE.PREJUMP)
  ) {
    this.runPhase += delta * 0.0118 * (0.52 + rs / 400);
  }

  this.shadowScale = DanMath.clamp(1 - this.jumpY * 0.0018, 0.52, 1);
  var shadowSep = 18 + this.jumpY * 0.12;
  this.shadow.setY(shadowSep);
  var squash = 1 - Math.abs(this.steerTilt) * 0.14;
  this.shadow.setScale(this.shadowScale * squash, (this.shadowScale * 0.35) / 0.4);
  this.shadow.setAlpha(0.14 + 0.28 * this.shadowScale);

  var targetTilt = DanMath.clamp(this.targetLane * 0.42, -0.42, 0.42);
  this.steerTilt += (targetTilt - this.steerTilt) * Math.min(1, 14 * dt);
  this.bodyRoot.rotation = -this.steerTilt;

  this.container.setPosition(onTrailX, this.baseY);

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
    duration: 720,
    ease: "Sine.easeIn",
    onUpdate: function () {
      self._redraw(self.scene.time.now, 16);
    },
  });
  this.scene.tweens.add({
    targets: this.container,
    y: this.baseY + 44,
    duration: 720,
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
  this.shadow.setY(18);
  this.shadow.setScale(1, 0.35 / 0.4);
  this.shadow.setAlpha(0.4);
  this.g.setY(0);
  this._redraw(0, 0);
};
