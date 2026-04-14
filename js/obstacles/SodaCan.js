/**
 * @param {number} [progress01] - 0 early trail .. 1 near finish; scales wobble and hit width.
 */
function SodaCan(scene, lane, worldZ, progress01) {
  Obstacle.call(this, scene, "soda", lane, worldZ);
  this.progress = progress01 !== undefined ? Phaser.Math.Clamp(progress01, 0, 1) : 0;
  this.hitHalfWidth = 0.085 + this.progress * 0.035;
}

SodaCan.prototype = Object.create(Obstacle.prototype);
SodaCan.prototype.constructor = SodaCan;
