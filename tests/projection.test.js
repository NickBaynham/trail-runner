import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("TrailProjection", () => {
  it("project clamps depth and returns screen fields", () => {
    var code = fs.readFileSync(path.join(__dirname, "../js/Projection.js"), "utf8");
    var sandbox = {
      Phaser: {
        Math: {
          Clamp: function (v, a, b) {
            return Math.max(a, Math.min(b, v));
          },
        },
      },
      Math,
      console,
    };
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    var TrailProjection = sandbox.TrailProjection;
    var p = TrailProjection.project(6, 960, 540);
    expect(p).toHaveProperty("screenY");
    expect(p).toHaveProperty("halfWidth");
    expect(p).toHaveProperty("scale");
    expect(p.t).toBeGreaterThanOrEqual(0);
    expect(p.t).toBeLessThanOrEqual(1);
  });
});
