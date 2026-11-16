import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, truncateSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatFinding, MAX_FILE_BYTES, scanRepository, scanText } from "./check-secrets.mjs";

const script = fileURLToPath(new URL("./check-secrets.mjs", import.meta.url));
const anthropic = () => "sk-ant-api03-" + "Ab1cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv".repeat(3);

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "unibalance-secret-scan-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", ["-C", root, ...args], { stdio: ["ignore", "pipe", "pipe"] });
  git("init", "--quiet");
  const write = (name, content, tracked = true) => {
    const target = path.join(root, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
    if (tracked) git("add", "--", name);
  };
  return { root, git, write };
}

test("detects provider credentials and private keys with redacted rule/line findings", () => {
  const samples = [
    ["anthropic-api-key", anthropic()],
    ["openai-api-key", "sk-proj-" + "aB3cD4".repeat(10)],
    ["github-token", "ghp_" + "aB3cD4".repeat(6)],
    ["github-fine-grained-token", "github_pat_" + "aB3cD4".repeat(14)],
    ["slack-token", "xoxb-" + "123456789-234567891-abcdef123456"],
    ["stripe-secret-key", "sk_live_" + "aB3cD4".repeat(6)],
    ["google-api-key", "AIza" + "aB3cD4".repeat(5) + "Ef5Gh"],
    ["aws-access-key-id", "AKIA" + "A1B2C3D4E5F6G7H8"],
    ["aws-secret-access-key", "AWS_SECRET_ACCESS_KEY=" + "aB3cD4eF".repeat(5)],
    ["private-key", ["-----BEGIN ", "OPENSSH PRIVATE KEY-----"].join("")],
  ];
  for (const [rule, value] of samples) {
    const findings = scanText(`safe first line\r\n${value}\r\n`, "src/config.js");
    assert.deepEqual(findings, [{ path: "src/config.js", line: 2, rule }]);
    assert.equal(JSON.stringify(findings).includes(value), false);
    const displayed = formatFinding({ path: `src/${value}.js`, line: 2, rule });
    assert.equal(displayed.includes(value), false, `${rule} must also be redacted from displayed paths`);
    assert.ok(displayed.includes("[REDACTED]"));
  }
});

test("permits unmistakable example placeholders and public-key headers", () => {
  const text = [
    "ANTHROPIC_API_KEY=your_anthropic_api_key",
    "OPENAI_API_KEY=replace_me",
    "sk-ant-api03-" + "x".repeat(90),
    "sk-proj-" + "0".repeat(48),
    "github_pat_" + "placeholder_".repeat(7),
    ["-----BEGIN ", "PUBLIC KEY-----"].join(""),
  ].join("\n");
  assert.deepEqual(scanText(text, ".env.example"), []);
});

test("reads tracked working-tree contents, including unstaged changes, rather than the staged blob", (t) => {
  const { root, write } = fixture(t);
  write("src/config.js", "export const ready = true;\n");
  write("src/config.js", `safe\nconst token = '${anthropic()}';\n`, false);
  assert.deepEqual(scanRepository(root).findings, [{ path: "src/config.js", line: 2, rule: "anthropic-api-key" }]);
});

test("never scans ignored dotenv files or untracked files", (t) => {
  const { root, write } = fixture(t);
  write(".gitignore", ".env\n.env.*\n!.env.example\nprivate/\n");
  write(".env.example", "ANTHROPIC_API_KEY=your_anthropic_api_key\n");
  write(".env", anthropic(), false);
  write(".env.phone", anthropic(), false);
  write("private/credentials.txt", anthropic(), false);
  write("notes.txt", anthropic(), false);
  const result = scanRepository(root);
  assert.deepEqual(result.findings, []);
  assert.equal(result.scannedFiles, 2);
});

test("blocks tracked dotenv files by path without inspecting their contents", (t) => {
  const { root, write } = fixture(t);
  write(".env", anthropic());
  write("nested/.env.production", anthropic());
  write(".env.example", anthropic());
  assert.deepEqual(scanRepository(root).findings, [
    { path: ".env", line: 1, rule: "tracked-environment-file" },
    { path: ".env.example", line: 1, rule: "anthropic-api-key" },
    { path: "nested/.env.production", line: 1, rule: "tracked-environment-file" },
  ]);
});

test("does not follow a tracked symlink into an ignored dotenv file", (t) => {
  const { root, git, write } = fixture(t);
  write(".gitignore", ".env\n");
  write(".env", anthropic(), false);
  symlinkSync(".env", path.join(root, "config-link.js"));
  git("add", "--", "config-link.js");
  const result = scanRepository(root);
  assert.deepEqual(result.findings, []);
  assert.equal(result.scannedFiles, 1);
  assert.equal(result.skippedFiles, 1);
});

test("CLI returns a failure without printing credentials or secret-bearing source lines", (t) => {
  const { root, write } = fixture(t);
  const token = anthropic();
  const prefix = "sensitive surrounding context";
  const name = "source\nwith-newline.js";
  write(name, `${prefix}\nconst credential = '${token}';\n`);
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.equal(result.stderr, `${JSON.stringify(name)}:2: anthropic-api-key\n`);
  assert.equal((result.stdout + result.stderr).includes(token), false);
  assert.equal((result.stdout + result.stderr).includes(prefix), false);
});

test("CLI redacts a credential-shaped filename while preserving its internal scan path", (t) => {
  const { root, write } = fixture(t);
  const token = anthropic();
  const name = `.env.${token}`;
  write(name, "not opened by the scanner\n");

  assert.deepEqual(scanRepository(root).findings, [{ path: name, line: 1, rule: "tracked-environment-file" }]);
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.equal(result.stderr, '".env.[REDACTED]":1: tracked-environment-file\n');
  assert.equal((result.stdout + result.stderr).includes(token), false);
});

test("CLI succeeds for a clean tracked tree and reports an unavailable repository safely", (t) => {
  const { root, write } = fixture(t);
  write(".env.example", "ANTHROPIC_API_KEY=your_anthropic_api_key\n");
  const clean = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  assert.equal(clean.status, 0);
  assert.equal(clean.stderr, "");
  const outside = mkdtempSync(path.join(os.tmpdir(), "unibalance-no-repository-"));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const unavailable = spawnSync(process.execPath, [script], { cwd: outside, encoding: "utf8" });
  assert.equal(unavailable.status, 2);
  assert.equal(unavailable.stderr, '".":1: repository-unavailable\n');
  assert.equal(unavailable.stderr.includes(outside), false);
});

test("oversized tracked files fail closed, while binary files and deletions are counted as skipped", (t) => {
  const { root, write } = fixture(t);
  write("oversized.txt", "small staged value");
  truncateSync(path.join(root, "oversized.txt"), MAX_FILE_BYTES + 1);
  write("image.bin", Buffer.from([0, 1, 2, 3]));
  write("deleted.txt", "safe");
  rmSync(path.join(root, "deleted.txt"));
  const result = scanRepository(root);
  assert.deepEqual(result.findings, [{ path: "oversized.txt", line: 1, rule: "file-size-limit" }]);
  assert.equal(result.skippedFiles, 2);
});
