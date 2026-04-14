/**
 * @param {number} [progress01] - 0 early trail .. 1 near finish; scales wobble and hit width.
 */
function SodaCan(scene, lane, worldZ, progress01) {
  Obstacle.call(this, scene, "soda", lane, worldZ);
  this.progress = progress01 !== undefined ? Phaser.Math.Clamp(progress01, 0, 1) : 0;
  this.hitHalfWidth = 0.085 + this.progress * 0.035;
  this.rollPhase = Math.random() * Math.PI * 2;
}

SodaCan.prototype = Object.create(Obstacle.prototype);
SodaCan.prototype.constructor = SodaCan;

SodaCan.prototype.update = function (time, delta, runSpeed) {
  var p = this.progress;
  this.rollPhase += delta * 0.004 * runSpeed * 0.02 * (1 + p * 0.55);
  var wobble = 0.00008 * (1 + p * 1.35);
  this.lane += Math.sin(this.rollPhase) * wobble * runSpeed;
  this.lane = Phaser.Math.Clamp(this.lane, -0.85, 0.85);
};
