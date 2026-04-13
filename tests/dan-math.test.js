import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDanMath() {
  var code = fs.readFileSync(path.join(__dirname, "../js/DanMath.js"), "utf8");
  var sandbox = {
    module: { exports: {} },
    exports: {},
  };
  sandbox.exports = sandbox.module.exports;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.module.exports;
}

describe("DanMath", () => {
  it("clamp", () => {
    var DanMath = loadDanMath();
    expect(DanMath.clamp(5, 0, 10)).toBe(5);
    expect(DanMath.clamp(-1, 0, 10)).toBe(0);
    expect(DanMath.clamp(99, 0, 10)).toBe(10);
  });

  it("ik2 returns joint between root and goal", () => {
    var DanMath = loadDanMath();
    var j = DanMath.ik2(0, 0, 40, 0, 25, 25, 1);
    expect(j.x).toBeGreaterThan(0);
    expect(j.x).toBeLessThan(40);
    expect(Math.abs(j.y)).toBeLessThan(30);
  });
});
