function RunnerNpc(scene, lane, worldZ, awayFromPlayer) {
  Obstacle.call(this, scene, "runner", lane, worldZ);
  this.hitHalfWidth = 0.16;
  /** World Z velocity (m/s). Keep |vz| modest so runners stay on-screen long enough to read. */
  this.vz = awayFromPlayer ? 18 + Math.random() * 28 : -(22 + Math.random() * 38);
  this.laneDrift = (Math.random() - 0.5) * 0.00015;
  this.animPhase = Math.random() * Math.PI * 2;
}

RunnerNpc.prototype = Object.create(Obstacle.prototype);
RunnerNpc.prototype.constructor = RunnerNpc;

RunnerNpc.prototype.update = function (time, delta, runSpeed) {
  this.worldZ += this.vz * (delta / 1000);
  this.lane += this.laneDrift * runSpeed * (delta / 16);
  this.lane += Math.sin(time * 0.002 + this.animPhase) * 0.00006 * runSpeed;
  this.lane = Phaser.Math.Clamp(this.lane, -0.82, 0.82);
  this.animPhase += delta * 0.008;
};
