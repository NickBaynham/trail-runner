function SodaCan(scene, lane, worldZ) {
  Obstacle.call(this, scene, "soda", lane, worldZ);
  this.hitHalfWidth = 0.14;
  this.rollPhase = Math.random() * Math.PI * 2;
}

SodaCan.prototype = Object.create(Obstacle.prototype);
SodaCan.prototype.constructor = SodaCan;

SodaCan.prototype.update = function (time, delta, runSpeed) {
  this.rollPhase += delta * 0.004 * runSpeed * 0.02;
  this.lane += Math.sin(this.rollPhase) * 0.00008 * runSpeed;
  this.lane = Phaser.Math.Clamp(this.lane, -0.85, 0.85);
};
