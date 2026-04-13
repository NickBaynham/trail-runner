import path from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";

test("Phaser boots: canvas visible and no page errors", async ({ page }) => {
  var errors = [];
  page.on("pageerror", function (err) {
    errors.push(err.message);
  });
  page.on("console", function (msg) {
    if (msg.type() === "error") {
      errors.push("console.error: " + msg.text());
    }
  });

  var indexUrl = pathToFileURL(path.join(process.cwd(), "index.html")).href;
  await page.goto(indexUrl, { waitUntil: "networkidle" });

  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 20_000 });
  expect(errors, errors.join("\n")).toEqual([]);
});
