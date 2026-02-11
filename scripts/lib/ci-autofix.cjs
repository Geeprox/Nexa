function truncateForPrompt(text, maxChars = 12000) {
  if (!text) return "";
  if (text.length <= maxChars) return text;
  const head = text.slice(0, Math.floor(maxChars * 0.6));
  const tail = text.slice(-Math.floor(maxChars * 0.35));
  return `${head}\n...[truncated]...\n${tail}`;
}

function extractUnifiedDiff(rawText) {
  if (!rawText) return null;

  const fencedMatch = rawText.match(/```(?:diff)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : rawText.trim();
  const diffStart = candidate.indexOf("diff --git ");
  if (diffStart === -1) return null;

  const diff = candidate.slice(diffStart).trim();
  return diff.startsWith("diff --git ") ? `${diff}\n` : null;
}

function buildFailureDigest({ runId, runUrl, headSha, failingCommands }) {
  const lines = [];
  lines.push(`CI run id: ${runId}`);
  lines.push(`CI run url: ${runUrl}`);
  lines.push(`Head SHA: ${headSha}`);
  lines.push("");
  lines.push("Failing command digests:");

  for (const item of failingCommands) {
    lines.push(`## ${item.name} (exit=${item.exitCode})`);
    lines.push(item.logText);
    lines.push("");
  }

  return lines.join("\n");
}

module.exports = {
  truncateForPrompt,
  extractUnifiedDiff,
  buildFailureDigest
};
