function Snake(scene, lane, worldZ) {
  Obstacle.call(this, scene, "snake", lane, worldZ);
  this.hitHalfWidth = 0.2;
  this.slitherT = 0;
  /** Cross-trail drift pattern */
  this.driftAmp = 0.35 + Math.random() * 0.25;
  this.driftSpeed = 0.0018 + Math.random() * 0.0012;
  this.phase = Math.random() * Math.PI * 2;
}

Snake.prototype = Object.create(Obstacle.prototype);
Snake.prototype.constructor = Snake;

Snake.prototype.getLane = function (time) {
  return (
    this.lane +
    Math.sin(time * this.driftSpeed * 1000 + this.phase) * this.driftAmp * 0.25 +
    Math.sin(time * this.driftSpeed * 600 + this.phase * 2) * this.driftAmp * 0.12
  );
};

Snake.prototype.update = function (time, delta, runSpeed) {
  this.slitherT += delta;
  this.lane += Math.cos(this.slitherT * 0.003 + this.phase) * 0.00012 * runSpeed;
  this.lane = Phaser.Math.Clamp(this.lane, -0.88, 0.88);
};
