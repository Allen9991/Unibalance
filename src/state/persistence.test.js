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

test("v2 migration preserves records even when they match former prototype values", () => {
  const original = {
    ...createInitialAppState(),
    courses: [{ code: "REAL101", name: "Real course" }, ...courses],
    assessments: [{ id: 99, course: "REAL101", title: "Real task" }, ...assessments],
    commitments: [{ id: "real-work", title: "Real work", type: "work" }, ...commitments],
    studySessions: [{ id: "real-session", course: "REAL101", minutes: 30 }, ...studySessions],
    taskHistory: { real: { assessmentId: 99 }, ...taskHistory },
  };
  const storage = makeStorage({
    [STORAGE_KEY]: JSON.stringify({
      version: 2,
      savedAt: "2026-01-01T00:00:00.000Z",
      state: original,
    }),
  });
  const state = hydrateAppState(storage);

  assert.deepEqual(state, original);
});

for (const adapter of [
  { name: "browser", create: makeStorage, save: saveAppState, hydrate: hydrateAppState },
  {
    name: "native-style",
    create: makeAsyncStorage,
    save: saveAppStateAsync,
    hydrate: async (storage) => (await hydrateAppStateAsync(storage)).state,
  },
]) {
  test(`${adapter.name} repeated saves preserve genuine courses and their related records`, async () => {
    const storage = adapter.create();
    const original = createStudentState();
    let state = structuredClone(original);

    for (let round = 0; round < 3; round += 1) {
      assert.equal(await adapter.save(state, storage), true);
      assert.deepEqual(state, original, "saving must not mutate the live state");
      const envelope = JSON.parse(await storage.getItem(STORAGE_KEY));
      assert.equal(envelope.version, SCHEMA_VERSION);
      assert.deepEqual(envelope.state, original);

      state = await adapter.hydrate(storage);
      assert.deepEqual(state, original, `roundtrip ${round + 1} must preserve every record`);
    }
  });

  for (const version of [0, 1, 2]) {
    test(`${adapter.name} v${version} migration preserves genuine courses and their related records`, async () => {
      const original = createStudentState();
      const raw = JSON.stringify(version === 0 ? original : { version, state: original });
      const storage = adapter.create({ [STORAGE_KEY]: raw });

      const state = await adapter.hydrate(storage);
      assert.deepEqual(state, original);
      assert.equal(await storage.getItem(STORAGE_KEY), raw, "hydration must leave the original store intact");
      assert.equal(await adapter.save(state, storage), true);
      assert.equal(JSON.parse(await storage.getItem(STORAGE_KEY)).version, SCHEMA_VERSION);
      assert.deepEqual(await adapter.hydrate(storage), original);
    });
  }
}

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

test("async native-style storage hydrates and saves a current-version envelope", async () => {
  const storage = makeAsyncStorage();
  const state = createInitialAppState();
  state.view = "Courses";

  assert.equal(await saveAppStateAsync(state, storage), true);
  const hydrated = await hydrateAppStateAsync(storage);

  assert.equal(hydrated.source, "native");
  assert.equal(hydrated.state.view, "Courses");
  assert.equal(JSON.parse(await storage.getItem(STORAGE_KEY)).version, SCHEMA_VERSION);
});

test("async malformed stored JSON is backed up before returning empty state", async () => {
  const raw = '{"version":2,"state":';
  const storage = makeAsyncStorage({ [STORAGE_KEY]: raw });

  const hydrated = await hydrateAppStateAsync(storage);

  assert.equal(hydrated.source, "native");
  assert.deepEqual(hydrated.state, createInitialAppState());
  const backups = Object.entries(storage.dump()).filter(([key]) => key.startsWith(BACKUP_KEY_PREFIX));
  assert.equal(backups.length, 1);
  assert.equal(backups[0][1], raw);
  assert.equal(await storage.getItem(STORAGE_KEY), raw);
});

test("async save failure preserves the previous store and returns false", async () => {
  const raw = JSON.stringify({ version: SCHEMA_VERSION, state: createStudentState() });
  const storage = makeAsyncStorage({ [STORAGE_KEY]: raw });
  storage.setItem = async () => {
    throw new Error("storage unavailable");
  };

  assert.equal(await saveAppStateAsync(createInitialAppState(), storage), false);
  assert.equal(await storage.getItem(STORAGE_KEY), raw);
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

function createStudentState() {
  const codes = ["COSC121", "MATH103", "ENGL101", "STAT101", "BIO101"];
  const state = createInitialAppState();
  state.courses = codes.map((code) => ({
    code,
    name: `My ${code} course`,
    contact: { lectures: 2, tutorials: 1, labs: 0 },
    recommended: 6,
    logged: 0.75,
    gradeSoFar: 80,
    targetGrade: 85,
  }));
  state.assessments = codes.map((course, index) => ({
    id: 100 + index,
    course,
    title: `My ${course} essay`,
    type: "Essay",
    dueDate: "2026-11-30",
    weighting: 40,
    estimatedHours: 6,
    progress: 12.5,
    status: "in progress",
  }));
  state.commitments = codes.map((course) => ({
    id: `${course}-lecture`, course, day: "Mon", start: 9, end: 10, title: `${course} lecture`, type: "course", source: "ics",
  }));
  state.commitments.push({ id: "gym-mon", day: "Mon", start: 7, end: 8, title: "My training", type: "gym" });
  state.studySessions = state.assessments.map((assessment) => ({
    id: `session-${assessment.id}`, assessmentId: assessment.id, course: assessment.course, minutes: 45, date: "2026-11-16",
  }));
  state.taskHistory = Object.fromEntries(state.assessments.map(({ id }) => [id, {
    assessmentId: id, completedBlocks: 1, skipped: 0, rescheduled: 0, blockStatuses: { [`study-${id}-Mon-10`]: "completed" },
  }]));
  state.timerTarget = { assessmentId: 100, course: "COSC121", requestedAt: 1234 };
  state.recentChange = { type: "markBlock", assessmentId: 100, status: "rescheduled", at: 1234 };
  return state;
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
