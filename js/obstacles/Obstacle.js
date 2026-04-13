/**
 * Base obstacle in trail world space.
 * @param {Phaser.Scene} scene
 * @param {string} type
 * @param {number} lane -1..1 across trail width
 * @param {number} worldZ - absolute position along trail (increases forward)
 */
function Obstacle(scene, type, lane, worldZ) {
  this.scene = scene;
  this.type = type;
  this.lane = lane;
  this.worldZ = worldZ;
  this.active = true;
  this.scored = false;
  /** Half-width in lane units for collision (~0.12 soda .. 0.22 stream) */
  this.hitHalfWidth = 0.15;
}

Obstacle.prototype.getLane = function (_time) {
  return this.lane;
};

Obstacle.prototype.update = function (_time, _delta, _runSpeed) {};

Obstacle.prototype.destroy = function () {};
