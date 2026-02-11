import { describe, expect, it } from "vitest";

const {
  truncateForPrompt,
  extractUnifiedDiff,
  buildFailureDigest
} = require("./ci-autofix.cjs");

describe("ci-autofix helpers", () => {
  it("truncates long logs while preserving head and tail", () => {
    const input = `${"a".repeat(200)}${"b".repeat(200)}${"c".repeat(200)}`;
    const output = truncateForPrompt(input, 300);

    expect(output.length).toBeLessThanOrEqual(300 + 30);
    expect(output).toContain("...[truncated]...");
    expect(output.startsWith("a")).toBe(true);
    expect(output.endsWith("c".repeat(105))).toBe(true);
  });

  it("extracts unified diff from fenced block", () => {
    const raw = [
      "Here is a fix:",
      "```diff",
      "diff --git a/a.txt b/a.txt",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "```"
    ].join("\n");

    const patch = extractUnifiedDiff(raw);
    expect(patch).toContain("diff --git a/a.txt b/a.txt");
    expect(patch?.endsWith("\n")).toBe(true);
  });

  it("returns null when no unified diff exists", () => {
    expect(extractUnifiedDiff("NO_FIX")).toBeNull();
    expect(extractUnifiedDiff("plain text")).toBeNull();
  });

  it("builds a deterministic failure digest", () => {
    const digest = buildFailureDigest({
      runId: "123",
      runUrl: "https://example.com/run/123",
      headSha: "abc",
      failingCommands: [
        {
          name: "npm test",
          exitCode: 1,
          logText: "Test failed"
        }
      ]
    });

    expect(digest).toContain("CI run id: 123");
    expect(digest).toContain("## npm test (exit=1)");
    expect(digest).toContain("Test failed");
  });
});
