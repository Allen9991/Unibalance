#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_FILE_BYTES = 8 * 1024 * 1024;

const RULES = [
  { id: "anthropic-api-key", pattern: /\bsk-ant-(?:api\d{2}-|sid\d{2}-)?([A-Za-z0-9_-]{40,})\b/gu },
  { id: "openai-api-key", pattern: /\bsk-(?!ant-)(?:proj-|svcacct-)?([A-Za-z0-9_-]{32,})\b/gu },
  { id: "github-token", pattern: /\bgh[pousr]_([A-Za-z0-9]{30,})\b/gu },
  { id: "github-fine-grained-token", pattern: /\bgithub_pat_([A-Za-z0-9_]{60,})\b/gu },
  { id: "slack-token", pattern: /\bxox[baprs]-([A-Za-z0-9-]{20,})\b/gu },
  { id: "stripe-secret-key", pattern: /\b(?:sk|rk)_(?:live|test)_([A-Za-z0-9]{24,})\b/gu },
  { id: "google-api-key", pattern: /\bAIza([A-Za-z0-9_-]{35})(?![A-Za-z0-9_-])/gu },
  { id: "aws-access-key-id", pattern: /\b(?:AKIA|ASIA)([A-Z0-9]{16})\b/gu },
  { id: "aws-secret-access-key", pattern: /\bAWS_SECRET_ACCESS_KEY["']?\s*[:=]\s*["']?([A-Za-z0-9/+]{40})(?![A-Za-z0-9/+])/giu },
  { id: "private-key", pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/gu },
];

function isPlaceholder(match) {
  // Only unmistakable demonstration values are exempt, never arbitrary suffixes.
  return /^(?:x{8,}|0{8,}|(?:example[_-]?)+|(?:placeholder[_-]?)+)$/iu.test(match[1] || "")
    || match[0] === "AKIAIOSFODNN7EXAMPLE"
    || match[1] === "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
}

export function isBlockedEnvironmentFile(relativePath) {
  const name = path.basename(relativePath).toLowerCase();
  return name !== ".env.example" && (name === ".env" || name.startsWith(".env."));
}

// Results intentionally contain no match, excerpt, input value or raw error.
export function scanText(text, relativePath) {
  const findings = [];
  const lines = text.split(/\r\n|\r|\n/u);
  lines.forEach((line, index) => {
    for (const rule of RULES) {
      for (const match of line.matchAll(rule.pattern)) {
        if (isPlaceholder(match)) continue;
        findings.push({ path: relativePath, line: index + 1, rule: rule.id });
        break;
      }
    }
  });
  return findings;
}

function gitOutput(directory, args) {
  return execFileSync("git", ["-C", directory, ...args], {
    encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"],
  });
}

function readTrackedFile(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${root}${path.sep}`)) throw new Error("unsafe-path");

  // Do not follow tracked links, including a changed parent directory pointing
  // into ignored/local configuration. No dotenv contents are read through links.
  let current = root;
  for (const component of relativePath.split("/")) {
    current = path.join(current, component);
    if (lstatSync(current).isSymbolicLink()) return null;
  }
  if (!lstatSync(absolute).isFile()) return null;
  if (realpathSync(absolute) !== absolute) throw new Error("unsafe-path");

  const descriptor = openSync(absolute, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = fstatSync(descriptor);
    if (!before.isFile() || before.size > MAX_FILE_BYTES) throw new Error("file-size-limit");
    const bytes = readFileSync(descriptor);
    const after = fstatSync(descriptor);
    const currentStat = lstatSync(absolute);
    if (after.size !== before.size || after.mtimeMs !== before.mtimeMs || bytes.length > MAX_FILE_BYTES
      || currentStat.isSymbolicLink() || currentStat.ino !== after.ino || currentStat.dev !== after.dev
      || realpathSync(absolute) !== absolute) throw new Error("file-changed-during-scan");
    if (bytes.includes(0)) return null;
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } finally {
    closeSync(descriptor);
  }
}

export function scanRepository(directory = process.cwd()) {
  let root;
  let files;
  try {
    root = realpathSync(gitOutput(directory, ["rev-parse", "--show-toplevel"]).trim());
    files = [...new Set(gitOutput(root, ["ls-files", "--cached", "-z"]).split("\0").filter(Boolean))];
  } catch {
    // Git errors may contain local configuration or paths; never forward them.
    throw new Error("repository-unavailable");
  }

  const findings = [];
  let scannedFiles = 0;
  let skippedFiles = 0;
  for (const relativePath of files) {
    if (isBlockedEnvironmentFile(relativePath)) {
      findings.push({ path: relativePath, line: 1, rule: "tracked-environment-file" });
      continue;
    }
    try {
      const text = readTrackedFile(root, relativePath);
      if (text === null) {
        skippedFiles += 1;
        continue;
      }
      scannedFiles += 1;
      findings.push(...scanText(text, relativePath));
    } catch (error) {
      if (error.code === "ENOENT") {
        skippedFiles += 1; // An unstaged deletion has no working-tree contents.
        continue;
      }
      const rule = ["unsafe-path", "file-size-limit", "file-changed-during-scan"].includes(error.message)
        ? error.message : "unreadable-tracked-file";
      findings.push({ path: relativePath, line: 1, rule });
    }
  }
  return { findings, scannedFiles, skippedFiles };
}

export function formatFinding(finding) {
  let displayedPath = finding.path;
  for (const rule of RULES) {
    // Replace from right to left so the original match offsets remain valid.
    for (const match of [...displayedPath.matchAll(rule.pattern)].reverse()) {
      if (isPlaceholder(match)) continue;
      displayedPath = displayedPath.slice(0, match.index) + "[REDACTED]"
        + displayedPath.slice(match.index + match[0].length);
    }
  }
  // Redact credential-shaped filenames too; JSON quoting then prevents unusual
  // Git filenames from injecting terminal lines. Internal scan paths stay intact.
  return `${JSON.stringify(displayedPath)}:${finding.line}: ${finding.rule}`;
}

export function runCli(directory = process.cwd(), output = process.stdout, errors = process.stderr) {
  try {
    const result = scanRepository(directory);
    for (const finding of result.findings) errors.write(`${formatFinding(finding)}\n`);
    output.write(`Secret scan: ${result.scannedFiles} text files scanned, ${result.skippedFiles} files skipped, ${result.findings.length} findings.\n`);
    return result.findings.length ? 1 : 0;
  } catch {
    errors.write(`${formatFinding({ path: ".", line: 1, rule: "repository-unavailable" })}\n`);
    return 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runCli();
}
