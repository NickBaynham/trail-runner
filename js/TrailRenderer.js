/**
 * Draws pseudo-3D trail, parallax hills, rocky surface via Phaser Graphics.
 */
function TrailRenderer(scene) {
  this.scene = scene;
  this.g = scene.add.graphics();
  this.g.setDepth(5);
}

TrailRenderer.prototype.draw = function (playerProgress, runSpeed) {
  var w = this.scene.scale.width;
  var h = this.scene.scale.height;
  this.g.clear();

  var skyTop = Phaser.Display.Color.HexStringToColor("#5c9fd4").color;
  var skyBot = Phaser.Display.Color.HexStringToColor("#c5e8f0").color;
  this.g.fillGradientStyle(skyTop, skyTop, skyBot, skyBot, 1);
  this.g.fillRect(0, 0, w, h * 0.52);

  var hillOff = (playerProgress * 0.12) % (w + 200);
  this.g.fillStyle(0x2e7d32, 0.4);
  this.g.beginPath();
  this.g.moveTo(-80 + hillOff, h * 0.34);
  for (var hx = -80; hx < w + 100; hx += 24) {
    this.g.lineTo(
      hx + hillOff * 0.35,
      h * 0.32 + Math.sin(hx * 0.015 + playerProgress * 0.008) * 32
    );
  }
  this.g.lineTo(w + 300, h * 0.62);
  this.g.lineTo(-300, h * 0.62);
  this.g.closePath();
  this.g.fillPath();

  var step = 16;
  var zTop = playerProgress + TrailProjection.Z_FAR;
  var zBot = playerProgress + TrailProjection.Z_NEAR;
  for (var zz = Math.ceil(zTop / step) * step; zz > zBot - step; zz -= step) {
    var z0 = zz - step;
    var z1 = zz;
    var d0 = z0 - playerProgress;
    var d1 = z1 - playerProgress;
    if (d1 < TrailProjection.Z_NEAR - 4 || d0 > TrailProjection.Z_FAR + 55) continue;

    var p0 = TrailProjection.project(Math.max(TrailProjection.Z_NEAR, d0), w, h);
    var p1 = TrailProjection.project(Math.max(TrailProjection.Z_NEAR, d1), w, h);

    var cx0 = p0.centerX + TrailProjection.trailCenterOffset(z0);
    var cx1 = p1.centerX + TrailProjection.trailCenterOffset(z1);
    var hw0 = p0.halfWidth * 0.9;
    var hw1 = p1.halfWidth * 0.9;

    this.g.fillStyle(0x1b5e20, 1);
    this.g.beginPath();
    this.g.moveTo(0, p1.screenY);
    this.g.lineTo(cx1 - hw1 * 1.4, p1.screenY);
    this.g.lineTo(cx0 - hw0 * 1.4, p0.screenY);
    this.g.lineTo(0, p0.screenY);
    this.g.closePath();
    this.g.fillPath();

    this.g.fillStyle(0x2e7d32, 1);
    this.g.beginPath();
    this.g.moveTo(w, p1.screenY);
    this.g.lineTo(cx1 + hw1 * 1.4, p1.screenY);
    this.g.lineTo(cx0 + hw0 * 1.4, p0.screenY);
    this.g.lineTo(w, p0.screenY);
    this.g.closePath();
    this.g.fillPath();

    var bump = Math.sin(z0 * 0.07) * 2.5;
    this.g.fillStyle(0x795548, 1);
    this.g.beginPath();
    this.g.moveTo(cx1 - hw1, p1.screenY + bump);
    this.g.lineTo(cx1 + hw1, p1.screenY + bump);
    this.g.lineTo(cx0 + hw0, p0.screenY);
    this.g.lineTo(cx0 - hw0, p0.screenY);
    this.g.closePath();
    this.g.fillPath();

    this.g.lineStyle(2, 0xd7ccc8, 0.9);
    this.g.beginPath();
    this.g.moveTo(cx1 - hw1, p1.screenY + bump);
    this.g.lineTo(cx0 - hw0, p0.screenY);
    this.g.strokePath();
    this.g.beginPath();
    this.g.moveTo(cx1 + hw1, p1.screenY + bump);
    this.g.lineTo(cx0 + hw0, p0.screenY);
    this.g.strokePath();

    this.g.fillStyle(0x5d4037, 0.85);
    this.g.beginPath();
    this.g.moveTo(cx1 - hw1 * 0.94, p1.screenY + bump + 1);
    this.g.lineTo(cx1 + hw1 * 0.94, p1.screenY + bump + 1);
    this.g.lineTo(cx0 + hw0 * 0.94, p0.screenY + 1);
    this.g.lineTo(cx0 - hw0 * 0.94, p0.screenY + 1);
    this.g.closePath();
    this.g.fillPath();

    /**
     * Trees belong in the grass, past the trail shoulders — not on the brown wedge.
     * Trail surface spans ~[cx ± hw]; place foliage at cx ± hw * (1.14 …1.65).
     */
    /**
     * Trees ~10× Dan’s on-screen height (rear-view sprite stack ~150px), capped for canvas.
     * Scale down toward horizon via projection t (near camera: t→0).
     */
    var danRefH = 150;
    var treeMaxH = danRefH * 10;
    var seed = z0 * 0.17;
    var trailEdgeL = cx0 - hw0;
    var trailEdgeR = cx0 + hw0;
    for (var tr = 0; tr < 2; tr++) {
      var depthJitter = tr * 0.18 + Math.sin(seed + tr * 1.9) * 0.08;
      var out = 1.22 + depthJitter + (1 - p0.t) * 0.08;
      var txL = trailEdgeL - hw0 * out + Math.sin(seed + tr * 2.3) * 14;
      var txR = trailEdgeR + hw0 * out - Math.sin(seed + tr * 2.6) * 14;
      var persp = 0.14 + (1 - p0.t) * 0.92;
      var varSize = 0.86 + ((z0 + tr * 11) % 10) * 0.014;
      var th = (treeMaxH * persp * varSize) / 1.74;
      var ty = p0.screenY - th * 1.74 - 3 - tr * 8;

      this.g.fillStyle(0x143d12, 1);
      this.g.beginPath();
      this.g.moveTo(txL, ty);
      this.g.lineTo(txL - th * 0.48, ty + th * 1.55);
      this.g.lineTo(txL + th * 0.48, ty + th * 1.55);
      this.g.closePath();
      this.g.fillPath();
      this.g.fillStyle(0x3e2723, 1);
      this.g.fillRect(txL - th * 0.09, ty + th * 1.22, th * 0.18, th * 0.52);

      this.g.fillStyle(0x143d12, 1);
      this.g.beginPath();
      this.g.moveTo(txR, ty);
      this.g.lineTo(txR - th * 0.48, ty + th * 1.55);
      this.g.lineTo(txR + th * 0.48, ty + th * 1.55);
      this.g.closePath();
      this.g.fillPath();
      this.g.fillStyle(0x3e2723, 1);
      this.g.fillRect(txR - th * 0.09, ty + th * 1.22, th * 0.18, th * 0.52);
    }

    for (var r = 0; r < 6; r++) {
      var rx = cx0 + Math.sin(seed + r * 1.7) * hw0 * 0.82;
      var ry = p0.screenY - r - 3;
      var rs = 1.5 + ((r + z0) % 5);
      this.g.fillStyle(0x4e342e, 1);
      this.g.fillRect(rx, ry, rs, rs * 0.9);
    }
  }
};
