import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import { afterEach, describe, expect, it } from "vitest";

const tempDirs: string[] = [];
const projectRoot = path.resolve(process.cwd());
const publishScript = path.join(projectRoot, "scripts", "publish-github.sh");

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexa-publish-github-"));
  tempDirs.push(dir);
  return dir;
}

function writeExecutable(filePath: string, content: string) {
  fs.writeFileSync(filePath, `#!/usr/bin/env bash\nset -euo pipefail\n${content}\n`, { mode: 0o755 });
}

afterEach(() => {
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("publish-github script", () => {
  it("fails when --repo is missing", () => {
    const result = spawnSync("bash", [publishScript], {
      cwd: projectRoot,
      encoding: "utf-8"
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("--repo is required.");
  });

  it("fails when gh is not installed", () => {
    const result = spawnSync("bash", [publishScript, "--repo", "owner/Nexa"], {
      cwd: projectRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: "/usr/bin:/bin"
      }
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("gh CLI is required but not found.");
  });

  it("fails when gh auth status is not ready", () => {
    const tempDir = createTempDir();

    writeExecutable(
      path.join(tempDir, "gh"),
      `
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 1
fi
exit 0
`
    );

    const result = spawnSync("bash", [publishScript, "--repo", "owner/Nexa"], {
      cwd: projectRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH ?? ""}`
      }
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("GitHub CLI is not authenticated. Run: gh auth login");
  });

  it("creates repo and pushes when remote is missing", () => {
    const tempDir = createTempDir();
    const logPath = path.join(tempDir, "calls.log");

    writeExecutable(
      path.join(tempDir, "gh"),
      `
echo "gh:$*" >> "$MOCK_LOG"
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "create" ]]; then
  exit 0
fi
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, "git"),
      `
echo "git:$*" >> "$MOCK_LOG"
if [[ "$1" == "remote" ]]; then
  exit 0
fi
if [[ "$1" == "branch" && "$2" == "--show-current" ]]; then
  echo "main"
  exit 0
fi
exit 0
`
    );

    const result = spawnSync("bash", [publishScript, "--repo", "owner/Nexa", "--public"], {
      cwd: projectRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH ?? ""}`,
        MOCK_LOG: logPath
      }
    });

    const log = fs.readFileSync(logPath, "utf-8");
    expect(result.status).toBe(0);
    expect(log).toContain("gh:auth status");
    expect(log).toContain("git:remote");
    expect(log).toContain("gh:repo create owner/Nexa --public --source . --remote origin --push");
    expect(result.stdout).toContain("Repository published to GitHub: https://github.com/owner/Nexa");
  });

  it("pushes current branch when remote already exists", () => {
    const tempDir = createTempDir();
    const logPath = path.join(tempDir, "calls.log");

    writeExecutable(
      path.join(tempDir, "gh"),
      `
echo "gh:$*" >> "$MOCK_LOG"
if [[ "$1" == "auth" && "$2" == "status" ]]; then
  exit 0
fi
if [[ "$1" == "repo" && "$2" == "create" ]]; then
  exit 1
fi
exit 0
`
    );

    writeExecutable(
      path.join(tempDir, "git"),
      `
echo "git:$*" >> "$MOCK_LOG"
if [[ "$1" == "remote" ]]; then
  echo "origin"
  exit 0
fi
if [[ "$1" == "branch" && "$2" == "--show-current" ]]; then
  echo "main"
  exit 0
fi
if [[ "$1" == "push" && "$2" == "-u" && "$3" == "origin" && "$4" == "main" ]]; then
  exit 0
fi
exit 1
`
    );

    const result = spawnSync("bash", [publishScript, "--repo", "owner/Nexa", "--private"], {
      cwd: projectRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        PATH: `${tempDir}:${process.env.PATH ?? ""}`,
        MOCK_LOG: logPath
      }
    });

    const log = fs.readFileSync(logPath, "utf-8");
    expect(result.status).toBe(0);
    expect(log).toContain("gh:auth status");
    expect(log).toContain("git:push -u origin main");
    expect(log).not.toContain("gh:repo create");
    expect(result.stdout).toContain("Repository published to GitHub: https://github.com/owner/Nexa");
  });
});
