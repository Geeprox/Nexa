const fs = require("fs");
const path = require("path");

function walk(rootDir) {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const queue = [rootDir];
  const files = [];
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        files.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function pickLatest(paths) {
  if (paths.length === 0) {
    return null;
  }

  const withTime = paths.map((item) => ({
    path: item,
    mtimeMs: fs.statSync(item).mtimeMs
  }));
  withTime.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return withTime[0].path;
}

function collectMacosArtifacts(bundleDir) {
  const absoluteBundleDir = path.resolve(bundleDir);
  const allEntries = walk(absoluteBundleDir);

  const appBundles = allEntries.filter(
    (item) => item.endsWith(".app") && fs.existsSync(item) && fs.statSync(item).isDirectory()
  );
  const dmgFiles = allEntries.filter(
    (item) => item.endsWith(".dmg") && fs.existsSync(item) && fs.statSync(item).isFile()
  );

  return {
    bundleDir: absoluteBundleDir,
    appBundles,
    dmgFiles,
    appBundlePath: pickLatest(appBundles),
    dmgPath: pickLatest(dmgFiles)
  };
}

function toRelativePath(targetPath, projectRoot) {
  if (!targetPath) {
    return null;
  }
  return path.relative(projectRoot, targetPath);
}

function buildMacosReleaseManifest(input) {
  const projectRoot = path.resolve(input.projectRoot);
  const artifacts = input.artifacts;
  return {
    platform: "macos",
    generatedAt: input.generatedAt,
    version: input.version,
    bundleDir: toRelativePath(artifacts.bundleDir, projectRoot),
    appBundlePath: toRelativePath(artifacts.appBundlePath, projectRoot),
    dmgPath: toRelativePath(artifacts.dmgPath, projectRoot),
    allAppBundles: artifacts.appBundles.map((item) => toRelativePath(item, projectRoot)),
    allDmgs: artifacts.dmgFiles.map((item) => toRelativePath(item, projectRoot))
  };
}

module.exports = {
  collectMacosArtifacts,
  buildMacosReleaseManifest
};
