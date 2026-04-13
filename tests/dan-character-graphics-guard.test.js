import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Phaser 3 Graphics has no g.ellipse() or g.quadraticCurveTo(); those throw at runtime.
 */
describe("DanCharacter.js graphics API guard", () => {
  it("does not call forbidden Graphics methods", () => {
    var src = fs.readFileSync(path.join(__dirname, "../js/DanCharacter.js"), "utf8");
    expect(src).not.toMatch(/g\.ellipse\s*\(/);
    expect(src).not.toMatch(/g\.quadraticCurveTo\s*\(/);
  });
});
