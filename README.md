# Baby Bouncing Dan: Extreme Trail Runner (Phaser 3)

Browser-based **pseudo-3D trail running** game: steer **Dan** with the mouse, **click to jump**, reach the **Atlanta loop trailhead** on a fixed course. The header logo uses the same **bouncing** timing as Dan’s idle jog on the title screen.

## Run locally

Phaser loads from a CDN; the rest is static files. Use any static server (browser security may block some features from `file://`).

```bash
cd trail-runner
python3 -m http.server 8080
```

Open **http://localhost:8080**

## File structure

| Path | Role |
|------|------|
| `index.html` | Page + script load order |
| `style.css` | Layout / canvas framing |
| `main.js` | Phaser game config |
| `scenes/BootScene.js` | Procedural textures, starts `GameScene` + `UIScene` |
| `scenes/GameScene.js` | Trail, Dan, obstacles, win/lose |
| `scenes/UIScene.js` | Title, HUD, game over / win overlays |
| `js/Projection.js` | **Pseudo-3D math** (`depth` → screen Y, scale, trail half-width) |
| `js/TrailRenderer.js` | Draws sky, hills, trail wedge, trees, rocks |
| `js/PlayerDan.js` | Dan: lane, jump, run bob, fall tween |
| `js/ObstacleManager.js` | Spawn, update, draw, score, collisions |
| `js/obstacles/*.js` | `SodaCan`, `Snake`, `Stream`, `RunnerNpc` |

## Controls

- **Mouse X** — steer (lane) left/right  
- **Click** — jump (only when grounded)  
- **Touch** — same as mouse on supported devices  

## Tuning difficulty & feel

| What | Where to change |
|------|------------------|
| Run speed | `GameScene`: initial `runSpeed`, `diff *58` multiplier |
| Course length | `ObstacleManager.TOTAL_TRAIL` |
| Spawn density / gaps | `ObstacleManager.scheduleSpawn` — `gap` linear, roll thresholds |
| Trail width / perspective | `Projection.js`: `Z_NEAR`, `Z_FAR`, `halfWidth` formula |
| Jump height / gravity | `PlayerDan`: `jumpPower`, `jumpGravity` |
| Off-trail tolerance | `GameScene`: `Math.abs(this.dan.lane) > 0.94` |
| Stream jump window | `ObstacleManager.update`: `hitD0` / `hitD1` |
| Runner frequency | `scheduleSpawn`: `roll < 0.805` branch vs soda fallback |

## Pseudo-3D model (short)

- `playerZ` advances each frame → world moves toward the camera.  
- Each obstacle has world `worldZ`; **depth** = `worldZ - playerZ`.  
- `TrailProjection.project(depth)` maps depth to **screen Y**, **scale**, and **trail half-width** (narrow at horizon, wide near the bottom).  
- Lane in [-1, 1] maps to screen X using projected half-width and a winding `trailCenterOffset(distance)`.

## Legacy

Older non-Phaser prototypes (`game.js`, `styles.css`) are superseded by this project; you can remove them if unused.
