/**
 * Pseudo-3D projection for forward-down-trail camera.
 * Positive `depth` = meters ahead of the player along the trail (into the scene).
 * Large depth = far = horizon (small scale, high on screen).
 * Small depth = near = foreground (large scale, low on screen).
 */
var TrailProjection = {
  Z_NEAR: 6,
  Z_FAR: 220,

  /**
   * @param {number} depth - distance ahead along trail (world units)
   * @param {number} gameW
   * @param {number} gameH
   * @returns {{ t:number, screenY:number, halfWidth:number, scale:number, centerX:number }}
   */
  project: function (depth, gameW, gameH) {
    var z0 = TrailProjection.Z_NEAR;
    var z1 = TrailProjection.Z_FAR;
    var t = (depth - z0) / (z1 - z0);
    t = Phaser.Math.Clamp(t, 0, 1);

    var yHorizon = gameH * 0.26;
    var yGround = gameH * 0.9;
    var screenY = yHorizon + (1 - t) * (yGround - yHorizon);

    var halfWidth = 26 + (1 - t) * 218;
    var scale = 0.16 + (1 - t) * 1.22;

    return {
      t: t,
      screenY: screenY,
      halfWidth: halfWidth,
      scale: scale,
      centerX: gameW * 0.5,
    };
  },

  /** Trail center — stronger curves (multiple sine layers). */
  trailCenterOffset: function (worldDistance) {
    return (
      Math.sin(worldDistance * 0.0062) * 104 +
      Math.sin(worldDistance * 0.00195) * 56 +
      Math.sin(worldDistance * 0.00072) * 36
    );
  },

  laneToWorldX: function (lane, depth, playerLane, worldDistance, gameW, gameH) {
    var p = TrailProjection.project(depth, gameW, gameH);
    var cx = p.centerX + TrailProjection.trailCenterOffset(worldDistance + depth);
    var rel = lane - playerLane;
    var laneW = p.halfWidth * 0.9;
    return cx + rel * laneW;
  },
};
