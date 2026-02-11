#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  truncateForPrompt,
  extractUnifiedDiff,
  buildFailureDigest
} = require("../lib/ci-autofix.cjs");

const repoRoot = process.cwd();
const autoFixDir = path.join(repoRoot, ".autofix");
const resultPath = path.join(autoFixDir, "result.json");

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const RUN_ID = process.env.CI_FAILED_RUN_ID || "unknown";
const RUN_URL = process.env.CI_FAILED_RUN_URL || "";
const HEAD_SHA = process.env.CI_FAILED_HEAD_SHA || "";

fs.mkdirSync(autoFixDir, { recursive: true });

function writeResult(result) {
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
}

function readLog(name) {
  const file = path.join(autoFixDir, `${name}.log`);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function readExit(name) {
  const file = path.join(autoFixDir, `${name}.exit`);
  if (!fs.existsSync(file)) return 0;
  const raw = fs.readFileSync(file, "utf8").trim();
  return Number.isFinite(Number(raw)) ? Number(raw) : 0;
}

function parseOutputText(responseJson) {
  if (typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  const chunks = [];
  for (const item of responseJson.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n");
}

function runCommand(command, args) {
  return spawnSync(command, args, { encoding: "utf8" });
}

const commandLogs = [
  { name: "npm test", exitCode: readExit("npm-test"), logText: readLog("npm-test") },
  { name: "npm run build", exitCode: readExit("npm-build"), logText: readLog("npm-build") },
  { name: "cargo build --manifest-path src-tauri/Cargo.toml", exitCode: readExit("cargo-build"), logText: readLog("cargo-build") }
];

const failingCommands = commandLogs.filter((item) => item.exitCode !== 0);

if (!OPENAI_API_KEY) {
  writeResult({ applied: false, reason: "missing_openai_api_key" });
  process.exit(0);
}

if (failingCommands.length === 0) {
  writeResult({ applied: false, reason: "no_local_failure_reproduced" });
  process.exit(0);
}

const digest = truncateForPrompt(
  buildFailureDigest({
    runId: RUN_ID,
    runUrl: RUN_URL,
    headSha: HEAD_SHA,
    failingCommands: failingCommands.map((item) => ({
      ...item,
      logText: truncateForPrompt(item.logText, 14000)
    }))
  }),
  40000
);

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: MODEL,
    temperature: 0.1,
    max_output_tokens: 6000,
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: [
              "You are an automated CI bugfix assistant.",
              "Return a single unified diff patch only.",
              "Patch format must start with 'diff --git'.",
              "Do not include prose.",
              "If no safe fix is possible, output exactly NO_FIX."
            ].join("\n")
          }
        ]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: [
              "Repository context and reproduced failures are below.",
              "Generate the minimal safe patch that makes the failing checks pass.",
              "",
              digest
            ].join("\n")
          }
        ]
      }
    ]
  })
});

if (!response.ok) {
  const errBody = await response.text();
  writeResult({
    applied: false,
    reason: "openai_request_failed",
    status: response.status,
    detail: truncateForPrompt(errBody, 2000)
  });
  process.exit(0);
}

const responseJson = await response.json();
const outputText = parseOutputText(responseJson).trim();

if (!outputText || outputText === "NO_FIX") {
  writeResult({
    applied: false,
    reason: "no_fix_returned",
    model: MODEL
  });
  process.exit(0);
}

const patch = extractUnifiedDiff(outputText);
if (!patch) {
  writeResult({
    applied: false,
    reason: "invalid_patch_format",
    model: MODEL,
    detail: truncateForPrompt(outputText, 2000)
  });
  process.exit(0);
}

const patchFile = path.join(autoFixDir, "autofix.patch");
fs.writeFileSync(patchFile, patch, "utf8");

const apply = runCommand("git", ["apply", "--whitespace=fix", patchFile]);
if (apply.status !== 0) {
  writeResult({
    applied: false,
    reason: "patch_apply_failed",
    model: MODEL,
    detail: truncateForPrompt(`${apply.stdout}\n${apply.stderr}`, 2000)
  });
  process.exit(0);
}

const diffNames = runCommand("git", ["diff", "--name-only"]);
const files = diffNames.stdout
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

if (files.length === 0) {
  writeResult({
    applied: false,
    reason: "patch_applied_but_no_changes",
    model: MODEL
  });
  process.exit(0);
}

writeResult({
  applied: true,
  reason: "applied",
  model: MODEL,
  patchPath: path.relative(repoRoot, patchFile),
  files
});
