#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { collectMacosArtifacts, buildMacosReleaseManifest } = require("./lib/macos-artifacts.cjs");

function parseArgv(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) {
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key.slice(2)] = "true";
      continue;
    }

    parsed[key.slice(2)] = value;
    index += 1;
  }
  return parsed;
}

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function main() {
  const args = parseArgv(process.argv.slice(2));
  const projectRoot = args["project-root"]
    ? path.resolve(args["project-root"])
    : path.resolve(__dirname, "..");
  const bundleDir = args["bundle-dir"]
    ? path.resolve(args["bundle-dir"])
    : path.join(projectRoot, "src-tauri", "target", "release", "bundle");
  const outFile = args.out
    ? path.resolve(args.out)
    : path.join(projectRoot, "dist", "releases", "macos", "latest.json");
  const version = args.version ?? "0.0.0";

  const artifacts = collectMacosArtifacts(bundleDir);
  if (!artifacts.appBundlePath) {
    throw new Error(`No .app bundle found under: ${bundleDir}`);
  }

  const manifest = buildMacosReleaseManifest({
    projectRoot,
    version,
    generatedAt: new Date().toISOString(),
    artifacts
  });

  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${outFile}\n`);
}

main();
