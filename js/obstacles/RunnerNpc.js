/**
 * @param {boolean} awayFromPlayer
 * @param {number} [progress01] - 0..1; faster along-trail motion and more weave later.
 */
function RunnerNpc(scene, lane, worldZ, awayFromPlayer, progress01) {
  Obstacle.call(this, scene, "runner", lane, worldZ);
  var p = progress01 !== undefined ? Phaser.Math.Clamp(progress01, 0, 1) : 0;
  this.progress = p;
  this.hitHalfWidth = 0.12 + p * 0.03;
  var spd = 1 + p * 0.85;
  /** World Z velocity (m/s). Keep |vz| modest so runners stay on-screen long enough to read. */
  this.vz = (awayFromPlayer ? 18 + Math.random() * 28 : -(22 + Math.random() * 38)) * spd;
  this.laneDrift = (Math.random() - 0.5) * 0.00015 * (1 + p * 1.25);
  this.animPhase = Math.random() * Math.PI * 2;
}

RunnerNpc.prototype = Object.create(Obstacle.prototype);
RunnerNpc.prototype.constructor = RunnerNpc;

RunnerNpc.prototype.update = function (time, delta, runSpeed) {
  this.worldZ += this.vz * (delta / 1000);
  this.lane += this.laneDrift * runSpeed * (delta / 16);
  var side = 0.00006 * (1 + this.progress * 1.1);
  this.lane += Math.sin(time * 0.002 + this.animPhase) * side * runSpeed;
  this.lane = Phaser.Math.Clamp(this.lane, -0.82, 0.82);
  this.animPhase += delta * 0.008 * (1 + this.progress * 0.4);
};
