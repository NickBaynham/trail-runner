import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

test("start run shows score HUD and spawns obstacles", async ({ page }) => {
  var errors = [];
  page.on("pageerror", function (err) {
    errors.push(err.message);
  });

  var indexUrl = pathToFileURL(path.join(process.cwd(), "index.html")).href;
  await page.goto(indexUrl, { waitUntil: "networkidle" });

  await page.waitForFunction(function () {
    return window.__trailRunnerGame && window.__trailRunnerGame.scene.getScene("UIScene");
  });

  await page.evaluate(function () {
    var game = window.__trailRunnerGame;
    var ui = game.scene.getScene("UIScene");
    var gs = game.scene.getScene("GameScene");
    ui.hideTitle();
    gs.events.emit("beginRun");
  });

  await page.waitForFunction(
    function () {
      var game = window.__trailRunnerGame;
      if (!game || !game.scene) return false;
      var g = game.scene.getScene("GameScene");
      if (!g || !g.registry.get("running")) return false;
      if (!g.hudScore || !g.hudScore.visible) return false;
      return g.obstacleManager && g.obstacleManager.list.length > 0;
    },
    { timeout: 8000 }
  );

  var snap = await page.evaluate(function () {
    var game = window.__trailRunnerGame;
    var g = game.scene.getScene("GameScene");
    return {
      running: g.registry.get("running"),
      hudScoreVisible: g.hudScore.visible,
      hudProgVisible: g.hudProg.visible,
      obstacleCount: g.obstacleManager.list.length,
    };
  });

  expect(errors, errors.join("\n")).toEqual([]);
  expect(snap.running).toBe(true);
  expect(snap.hudScoreVisible).toBe(true);
  expect(snap.hudProgVisible).toBe(true);
  expect(snap.obstacleCount).toBeGreaterThan(0);
});
