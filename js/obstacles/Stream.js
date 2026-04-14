/**
 * @param {number} [progress01] - 0..1; slightly wider hazard band later (must clear with a jump).
 */
function Stream(scene, lane, worldZ, progress01) {
  Obstacle.call(this, scene, "stream", lane, worldZ);
  var p = progress01 !== undefined ? Phaser.Math.Clamp(progress01, 0, 1) : 0;
  this.progress = p;
  /** Streams span most of trail — collision uses wide hit */
  this.hitHalfWidth = 0.52 + p * 0.14;
  this.lengthAlongTrail = 95;
}

Stream.prototype = Object.create(Obstacle.prototype);
Stream.prototype.constructor = Stream;

/** Stream stays centered on the trail; no lateral or Z drift (base Obstacle.update is a no-op). */
Stream.prototype.getLane = function (_time) {
  return 0;
};
