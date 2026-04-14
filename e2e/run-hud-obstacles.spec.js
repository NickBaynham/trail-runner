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
    gs.resetRun();
  });

  await page.waitForFunction(
    function () {
      var game = window.__trailRunnerGame;
      if (!game || !game.scene) return false;
      var g = game.scene.getScene("GameScene");
      var ui = game.scene.getScene("UIScene");
      if (!g || !ui || !g.runActive) return false;
      if (!ui.scoreTxt || !ui.scoreTxt.visible || !ui.progTxt.visible) return false;
      return g.obstacleManager && g.obstacleManager.list.length > 0;
    },
    { timeout: 8000 }
  );

  var snap = await page.evaluate(function () {
    var game = window.__trailRunnerGame;
    var g = game.scene.getScene("GameScene");
    var ui = game.scene.getScene("UIScene");
    return {
      runActive: g.runActive,
      uiScoreVisible: ui.scoreTxt.visible,
      uiProgVisible: ui.progTxt.visible,
      obstacleCount: g.obstacleManager.list.length,
    };
  });

  expect(errors, errors.join("\n")).toEqual([]);
  expect(snap.runActive).toBe(true);
  expect(snap.uiScoreVisible).toBe(true);
  expect(snap.uiProgVisible).toBe(true);
  expect(snap.obstacleCount).toBeGreaterThan(0);

  var jumpSnap = await page.evaluate(function () {
    var game = window.__trailRunnerGame;
    var g = game.scene.getScene("GameScene");
    g.dan.setInput(g.scale.width * 0.5, g.scale.width, true);
    return { isGrounded: g.dan.isGrounded, jumpVel: g.dan.jumpVel };
  });
  expect(jumpSnap.isGrounded).toBe(false);
  expect(jumpSnap.jumpVel).toBeGreaterThan(0);
});
