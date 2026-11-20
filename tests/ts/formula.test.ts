/**
 * Homebrew formula guards — the defects found by the installed-mode test
 * on 2026-11-20 (launchd EX_CONFIG 78 from a stale Cellar path; missing
 * Python chain for Kokoro synthesis).
 */

import { describe, test, expect } from "bun:test";
import { readFileSync } from "node:fs";

const formula = readFileSync("Formula/madeinoz-voice-server.rb", "utf8");

describe("formula service block", () => {
  const serviceBlock = formula.match(/service do[\s\S]*?\nend/)?.[0] ?? "";

  test("runs the wrapper through the stable opt path", () => {
    // bin/ resolves to the versioned Cellar keg and breaks when the keg
    // name changes (HEAD-<sha>); opt_bin survives upgrades.
    expect(serviceBlock).toContain('run [opt_bin/"voice-server"]');
    expect(serviceBlock).not.toMatch(/run \[bin\//);
  });
});

describe("formula install hints", () => {
  test("post_install names the Python chain Kokoro needs", () => {
    expect(formula).toContain("misaki");
    expect(formula).toContain("kokoro");
  });
});
