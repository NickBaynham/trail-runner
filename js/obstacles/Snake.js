/**
 * @param {number} [progress01] - 0..1; stronger lateral weave later on the trail.
 */
function Snake(scene, lane, worldZ, progress01) {
  Obstacle.call(this, scene, "snake", lane, worldZ);
  var p = progress01 !== undefined ? Phaser.Math.Clamp(progress01, 0, 1) : 0;
  this.progress = p;
  this.hitHalfWidth = 0.1 + p * 0.04;
  this.slitherT = 0;
  /** Cross-trail drift pattern */
  var ampMul = 1 + p * 0.95;
  var spdMul = 1 + p * 0.75;
  this.driftAmp = (0.35 + Math.random() * 0.25) * ampMul;
  this.driftSpeed = (0.0018 + Math.random() * 0.0012) * spdMul;
  this.phase = Math.random() * Math.PI * 2;
}

Snake.prototype = Object.create(Obstacle.prototype);
Snake.prototype.constructor = Snake;

Snake.prototype.getLane = function (time) {
  var weave = 1 + this.progress * 0.5;
  return (
    this.lane +
    Math.sin(time * this.driftSpeed * 1000 + this.phase) * this.driftAmp * 0.25 * weave +
    Math.sin(time * this.driftSpeed * 600 + this.phase * 2) * this.driftAmp * 0.12 * weave
  );
};

Snake.prototype.update = function (time, delta, runSpeed) {
  this.slitherT += delta;
  var along = 0.00012 * (1 + this.progress * 0.9);
  this.lane += Math.cos(this.slitherT * 0.003 + this.phase) * along * runSpeed;
  this.lane = Phaser.Math.Clamp(this.lane, -0.88, 0.88);
};
