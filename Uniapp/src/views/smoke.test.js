import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard includes strategic recommendation surface", () => {
  const source = readFileSync(new URL("./Dashboard.jsx", import.meta.url), "utf8");
  assert.match(source, /StrategicPanel/);
  assert.match(source, /Minimum viable week/i);
});

test("planner exposes normal and minimum viable planning", () => {
  const source = readFileSync(new URL("./Planner.jsx", import.meta.url), "utf8");
  assert.match(source, /Adaptive strategic plan/);
  assert.match(source, /Minimum viable week non-negotiables/);
});

test("assistant has deterministic fallback if AI fails", () => {
  const source = readFileSync(new URL("./Assistant.jsx", import.meta.url), "utf8");
  assert.match(source, /fallback\(strategy\)/);
  assert.match(source, /deterministicStrategy/);
});
