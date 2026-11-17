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
  assert.match(source, /Recovery plan/);
});

test("assistant has deterministic fallback if AI fails", () => {
  const source = readFileSync(new URL("./Assistant.jsx", import.meta.url), "utf8");
  assert.match(source, /fallback\(strategy\)/);
  assert.match(source, /deterministicStrategy/);
});

test("client AI code only calls the local proxy boundary", () => {
  const clientFiles = [
    readFileSync(new URL("../components/AICapture.jsx", import.meta.url), "utf8"),
    readFileSync(new URL("./Assistant.jsx", import.meta.url), "utf8"),
    readFileSync(new URL("../lib/aiClient.js", import.meta.url), "utf8"),
  ].join("\n");

  assert.doesNotMatch(clientFiles, /api\.anthropic\.com/);
  assert.doesNotMatch(clientFiles, /ANTHROPIC_API_KEY/);
  assert.match(clientFiles, /\/api\/anthropic\/messages/);
  assert.match(clientFiles, /VITE_AI_PROXY_BASE_URL/);
});

test("app shell protects persistence reset and signals save failure", () => {
  const source = readFileSync(new URL("../UniBalance.jsx", import.meta.url), "utf8");
  assert.match(source, /window\.confirm/);
  assert.match(source, /Not saving changes/);
  assert.match(source, /hasHydrated/);
});

test("native shell config is wired for installed app behavior", () => {
  const appSource = readFileSync(new URL("../UniBalance.jsx", import.meta.url), "utf8");
  const shellSource = readFileSync(new URL("../lib/nativeShell.js", import.meta.url), "utf8");

  assert.match(appSource, /configureNativeShell/);
  assert.match(shellSource, /StatusBar/);
  assert.match(shellSource, /SplashScreen/);
  assert.match(shellSource, /isNativePlatform/);
});

test("phase two calendar import and native notifications are wired", () => {
  const appSource = readFileSync(new URL("../UniBalance.jsx", import.meta.url), "utf8");
  const calendarSource = readFileSync(new URL("../components/CalendarView.jsx", import.meta.url), "utf8");
  const notificationSource = readFileSync(new URL("../lib/notifications.js", import.meta.url), "utf8");

  assert.match(appSource, /parseIcsTimetable/);
  assert.match(calendarSource, /Import \.ics/);
  assert.match(notificationSource, /LocalNotifications/);
});
