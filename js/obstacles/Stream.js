function Stream(scene, lane, worldZ) {
  Obstacle.call(this, scene, "stream", lane, worldZ);
  /** Streams span most of trail — collision uses wide hit */
  this.hitHalfWidth = 0.55;
  this.lengthAlongTrail = 95;
}

Stream.prototype = Object.create(Obstacle.prototype);
Stream.prototype.constructor = Stream;

Stream.prototype.getLane = function (time) {
  return 0;
};
