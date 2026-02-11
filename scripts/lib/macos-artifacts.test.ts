import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { buildMacosReleaseManifest, collectMacosArtifacts } from "./macos-artifacts.cjs";

const tempDirs: string[] = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexa-macos-artifacts-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("collectMacosArtifacts", () => {
  it("picks latest app and dmg artifacts", () => {
    const projectRoot = createTempDir();
    const bundleDir = path.join(projectRoot, "src-tauri", "target", "release", "bundle");
    const appOld = path.join(bundleDir, "macos", "Nexa-old.app");
    const appNew = path.join(bundleDir, "macos", "Nexa.app");
    const dmg = path.join(bundleDir, "dmg", "Nexa_0.1.0_aarch64.dmg");

    fs.mkdirSync(appOld, { recursive: true });
    fs.mkdirSync(appNew, { recursive: true });
    fs.mkdirSync(path.dirname(dmg), { recursive: true });
    fs.writeFileSync(dmg, "dmg");

    const oldTime = new Date("2025-01-01T00:00:00.000Z");
    const newTime = new Date("2025-01-02T00:00:00.000Z");
    fs.utimesSync(appOld, oldTime, oldTime);
    fs.utimesSync(appNew, newTime, newTime);
    fs.utimesSync(dmg, newTime, newTime);

    const artifacts = collectMacosArtifacts(bundleDir);
    expect(artifacts.appBundlePath).toBe(appNew);
    expect(artifacts.dmgPath).toBe(dmg);
    expect(artifacts.appBundles).toContain(appOld);
  });

  it("returns null artifact paths for empty bundle directory", () => {
    const bundleDir = path.join(createTempDir(), "bundle");
    fs.mkdirSync(bundleDir, { recursive: true });

    const artifacts = collectMacosArtifacts(bundleDir);
    expect(artifacts.appBundlePath).toBeNull();
    expect(artifacts.dmgPath).toBeNull();
  });
});

describe("buildMacosReleaseManifest", () => {
  it("builds project-relative artifact manifest", () => {
    const projectRoot = createTempDir();
    const artifacts = {
      bundleDir: path.join(projectRoot, "src-tauri", "target", "release", "bundle"),
      appBundles: [path.join(projectRoot, "src-tauri", "target", "release", "bundle", "macos", "Nexa.app")],
      dmgFiles: [path.join(projectRoot, "src-tauri", "target", "release", "bundle", "dmg", "Nexa_0.1.0_aarch64.dmg")],
      appBundlePath: path.join(projectRoot, "src-tauri", "target", "release", "bundle", "macos", "Nexa.app"),
      dmgPath: path.join(projectRoot, "src-tauri", "target", "release", "bundle", "dmg", "Nexa_0.1.0_aarch64.dmg")
    };

    const manifest = buildMacosReleaseManifest({
      projectRoot,
      generatedAt: "2025-01-01T00:00:00.000Z",
      version: "0.1.0",
      artifacts
    });

    expect(manifest).toEqual({
      platform: "macos",
      generatedAt: "2025-01-01T00:00:00.000Z",
      version: "0.1.0",
      bundleDir: "src-tauri/target/release/bundle",
      appBundlePath: "src-tauri/target/release/bundle/macos/Nexa.app",
      dmgPath: "src-tauri/target/release/bundle/dmg/Nexa_0.1.0_aarch64.dmg",
      allAppBundles: ["src-tauri/target/release/bundle/macos/Nexa.app"],
      allDmgs: ["src-tauri/target/release/bundle/dmg/Nexa_0.1.0_aarch64.dmg"]
    });
  });
});
