import test from "node:test";
import assert from "node:assert/strict";
import { appReducer, createInitialAppState } from "./appReducer.js";
import { BACKUP_KEY_PREFIX, clearPersistedStateAsync, hydrateAppState, hydrateAppStateAsync, migrateAppState, saveAppState, saveAppStateAsync, SCHEMA_VERSION, STORAGE_KEY } from "./persistence.js";
import { assessments, commitments, courses, studySessions, taskHistory } from "../data/testFixtures.js";

test("hydrates empty first-run state when storage is empty", () => {
  const storage = makeStorage();
  const state = hydrateAppState(storage);
  assert.equal(state.view, "Dashboard");
  assert.equal(state.courses.length, 0);
});

test("hydrates empty first-run state when stored JSON is malformed", () => {
  const storage = makeStorage({ [STORAGE_KEY]: "{not-json" });
  const state = hydrateAppState(storage);
  assert.equal(state.assessments.length, 0);
  assert.ok(Object.keys(storage.dump()).some((key) => key.startsWith(BACKUP_KEY_PREFIX)));
});

test("migrates partial old state without crashing", () => {
  const state = migrateAppState({ view: "Planner", courses: [{ code: "TEST101" }], planVariant: 4 });
  assert.equal(state.view, "Planner");
  assert.equal(state.courses[0].code, "TEST101");
  assert.equal(state.assessments.length, createInitialAppState().assessments.length);
  assert.equal(state.planVariant, 4);
  assert.equal(state.timerTarget, null);
});

test("runs version-routed migration from stored v1 state to current schema", () => {
  const storage = makeStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: 1,
      savedAt: "2026-01-01T00:00:00.000Z",
      state: { ...createInitialAppState(), view: "Planner" },
    }),
  });
  const state = hydrateAppState(storage);
  assert.equal(state.view, "Planner");
  assert.equal(state.timerTarget, null);
});

test("v2 migration strips prototype demo data from persisted state", () => {
  const storage = makeStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: 2,
      savedAt: "2026-01-01T00:00:00.000Z",
      state: {
        ...createInitialAppState(),
        courses: [{ code: "REAL101", name: "Real course" }, ...courses],
        assessments: [{ id: 99, course: "REAL101", title: "Real task" }, ...assessments],
        commitments: [{ id: "real-work", title: "Real work", type: "work" }, ...commitments],
        studySessions: [{ id: "real-session", course: "REAL101", minutes: 30 }, ...studySessions],
        taskHistory: { real: { assessmentId: 99 }, ...taskHistory },
      },
    }),
  });
  const state = hydrateAppState(storage);

  assert.deepEqual(state.courses.map((course) => course.code), ["REAL101"]);
  assert.deepEqual(state.assessments.map((assessment) => assessment.course), ["REAL101"]);
  assert.deepEqual(state.commitments.map((commitment) => commitment.id), ["real-work"]);
  assert.deepEqual(state.studySessions.map((session) => session.id), ["real-session"]);
  assert.equal(state.taskHistory.real.assessmentId, 99);
});

test("save writes versioned reducer state envelope", () => {
  const storage = makeStorage();
  const state = createInitialAppState();
  state.view = "Insights";
  assert.equal(saveAppState(state, storage), true);
  const saved = JSON.parse(storage.getItem(STORAGE_KEY));
  assert.equal(saved.version, SCHEMA_VERSION);
  assert.equal(saved.state.view, "Insights");
  assert.ok(saved.savedAt);
});

test("save failure degrades without throwing", () => {
  const storage = makeStorage();
  storage.setItem = () => {
    throw new Error("quota exceeded");
  };

  assert.equal(saveAppState(createInitialAppState(), storage), false);
});

test("async native-style storage hydrates and saves through the same migration boundary", async () => {
  const storage = makeAsyncStorage();
  const state = createInitialAppState();
  state.view = "Courses";

  assert.equal(await saveAppStateAsync(state, storage), true);
  const hydrated = await hydrateAppStateAsync(storage);

  assert.equal(hydrated.source, "native");
  assert.equal(hydrated.state.view, "Courses");
  assert.equal(JSON.parse(await storage.getItem(STORAGE_KEY)).version, SCHEMA_VERSION);
});

test("async native-style storage can clear persisted state", async () => {
  const storage = makeAsyncStorage({ [STORAGE_KEY]: JSON.stringify({ version: SCHEMA_VERSION, state: createInitialAppState() }) });

  assert.equal(await clearPersistedStateAsync(storage), true);
  assert.equal(await storage.getItem(STORAGE_KEY), null);
});

test("resetAppData returns fresh empty reducer state", () => {
  const dirty = { ...createInitialAppState(), view: "Planner", courses: [{ code: "REAL101" }] };
  const reset = appReducer(dirty, { type: "resetAppData" });
  assert.equal(reset.view, "Dashboard");
  assert.equal(reset.courses.length, 0);
  assert.notEqual(reset.courses, createInitialAppState().courses);
});

function makeStorage(initial = {}) {
  const values = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
    },
    setItem(key, value) {
      values[key] = String(value);
    },
    removeItem(key) {
      delete values[key];
    },
    dump() {
      return { ...values };
    },
  };
}

function makeAsyncStorage(initial = {}) {
  const sync = makeStorage(initial);
  return {
    async getItem(key) {
      return sync.getItem(key);
    },
    async setItem(key, value) {
      sync.setItem(key, value);
    },
    async removeItem(key) {
      sync.removeItem(key);
    },
    dump() {
      return sync.dump();
    },
  };
}
