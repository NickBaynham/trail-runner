/**
 * Pure math helpers for Dan's rig (no Phaser). Browser: global `DanMath`. Node: `require`.
 */
var DanMath = {
  TAU: Math.PI * 2,

  clamp: function (v, a, b) {
    return v < a ? a : v > b ? b : v;
  },

  rot: function (x, y, ca, sa) {
    return { x: x * ca - y * sa, y: x * sa + y * ca };
  },

  rotA: function (x, y, ang) {
    return DanMath.rot(x, y, Math.cos(ang), Math.sin(ang));
  },

  len: function (x, y) {
    return Math.sqrt(x * x + y * y);
  },

  norm: function (x, y) {
    var L = DanMath.len(x, y);
    if (L < 1e-6) return { x: 0, y: 1 };
    return { x: x / L, y: y / L };
  },

  lerp: function (a, b, t) {
    return a + (b - a) * t;
  },

  /**
   * Two-bone IK: (x1,y1) root to (x2,y2) goal. Returns intermediate joint.
   * sign picks elbow/knee bend direction (+1 / -1).
   */
  ik2: function (x1, y1, x2, y2, len1, len2, sign) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var dist = DanMath.len(dx, dy);
    var maxD = len1 + len2 - 0.5;
    if (dist > maxD) {
      var s = maxD / dist;
      x2 = x1 + dx * s;
      y2 = y1 + dy * s;
      dx = x2 - x1;
      dy = y2 - y1;
      dist = maxD;
    }
    var minD = Math.abs(len1 - len2) + 0.5;
    if (dist < minD) dist = minD;
    var c = (dist * dist + len1 * len1 - len2 * len2) / (2 * dist * len1);
    c = DanMath.clamp(c, -1, 1);
    var a = Math.acos(c);
    var b = Math.atan2(dy, dx);
    var theta = b + sign * a;
    return {
      x: x1 + Math.cos(theta) * len1,
      y: y1 + Math.sin(theta) * len1,
    };
  },

  /**
   * Same as ik2 but chooses +1 / -1 so the joint sits on the body exterior in rear view:
   * left limb bends outward (-X), right limb outward (+X). Stops knees/elbows folding through the torso.
   */
  ik2PickOutward: function (rootX, rootY, endX, endY, len1, len2, isLeftLimb) {
    var kPos = DanMath.ik2(rootX, rootY, endX, endY, len1, len2, 1);
    var kNeg = DanMath.ik2(rootX, rootY, endX, endY, len1, len2, -1);
    var side = isLeftLimb ? -1 : 1;
    var sPos = (kPos.x - rootX) * side;
    var sNeg = (kNeg.x - rootX) * side;
    return sPos >= sNeg ? kPos : kNeg;
  },

  smooth: function (t) {
    t = DanMath.clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = DanMath;
}
