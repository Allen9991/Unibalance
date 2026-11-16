import { createInitialAppState } from "./appReducer.js";

export const STORAGE_KEY = "unibalance.reducerState.v1";
export const BACKUP_KEY_PREFIX = "unibalance.reducerState.backup";
export const SCHEMA_VERSION = 3;

const DEMO_COURSE_CODES = new Set(["COSC121", "MATH103", "ENGL101", "STAT101"]);
const DEMO_COMMITMENT_IDS = new Set([
  "gym-mon",
  "cosc-mon",
  "math-mon",
  "stat-mon",
  "engl-tue",
  "math-tue",
  "work-tue",
  "gym-wed",
  "cosc-wed",
  "math-wed",
  "engl-wed",
  "stat-thu",
  "cosc-thu",
  "work-thu",
  "gym-fri",
  "math-fri",
  "stat-fri",
  "engl-fri",
  "work-sat",
  "social-sat",
  "reset-sun",
]);

export function hydrateAppState(storage = safeLocalStorage()) {
  const seed = createInitialAppState();
  if (!storage) return seed;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    return migrateStoredState(parsed, seed);
  } catch (error) {
    backupCorruptStore(storage);
    return seed;
  }
}

export async function hydrateAppStateAsync(storage) {
  const seed = createInitialAppState();
  const targetStorage = storage || await safeNativeStorage();
  if (!targetStorage) return { state: hydrateAppState(), source: "local" };

  try {
    const raw = await targetStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: seed, source: "native" };
    return { state: migrateStoredState(JSON.parse(raw), seed), source: "native" };
  } catch (error) {
    await backupCorruptStoreAsync(targetStorage);
    return { state: seed, source: "native" };
  }
}

export function saveAppState(state, storage = safeLocalStorage()) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, savedAt: new Date().toISOString(), state: migrateAppState(state, createInitialAppState(), SCHEMA_VERSION) }));
    return true;
  } catch (error) {
    return false;
  }
}

export async function saveAppStateAsync(state, storage) {
  const targetStorage = storage || await safeNativeStorage();
  if (!targetStorage) return saveAppState(state);

  try {
    await targetStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, savedAt: new Date().toISOString(), state: migrateAppState(state, createInitialAppState(), SCHEMA_VERSION) }));
    return true;
  } catch (error) {
    return false;
  }
}

export function clearPersistedState(storage = safeLocalStorage()) {
  if (!storage) return false;
  try {
    storage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

export async function clearPersistedStateAsync(storage) {
  const targetStorage = storage || await safeNativeStorage();
  if (!targetStorage) return clearPersistedState();

  try {
    await targetStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

export function migrateAppState(candidate, seed = createInitialAppState()) {
  return migrateStoredState(candidate, seed);
}

export function migrateStoredState(stored, seed = createInitialAppState()) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return seed;

  const envelope = "state" in stored
    ? { version: Number.isInteger(stored.version) ? stored.version : 0, state: stored.state }
    : { version: 0, state: stored };

  let current = envelope.state;
  for (let version = envelope.version; version < SCHEMA_VERSION; version += 1) {
    const migration = migrations[version];
    current = migration ? migration(current, seed) : normalizeAppState(current, seed);
  }

  return normalizeAppState(current, seed);
}

const migrations = {
  0(candidate, seed) {
    return normalizeAppState(candidate, seed);
  },
  1(candidate) {
    return {
      ...candidate,
      timerTarget: candidate?.timerTarget || null,
    };
  },
  2(candidate, seed) {
    return removePrototypeDemoData(normalizeAppState(candidate, seed), seed);
  },
};

function normalizeAppState(candidate, seed = createInitialAppState()) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return seed;

  return {
    ...seed,
    view: typeof candidate.view === "string" ? candidate.view : seed.view,
    sidebarCollapsed: typeof candidate.sidebarCollapsed === "boolean" ? candidate.sidebarCollapsed : seed.sidebarCollapsed,
    courses: validArray(candidate.courses) ? candidate.courses : seed.courses,
    assessments: validArray(candidate.assessments) ? candidate.assessments : seed.assessments,
    commitments: validArray(candidate.commitments) ? candidate.commitments : seed.commitments,
    studySessions: validArray(candidate.studySessions) ? candidate.studySessions : seed.studySessions,
    taskHistory: validObject(candidate.taskHistory) ? candidate.taskHistory : seed.taskHistory,
    keyDates: validArray(candidate.keyDates) ? candidate.keyDates : seed.keyDates,
    planVariant: Number.isFinite(candidate.planVariant) ? candidate.planVariant : seed.planVariant,
    minimumViableMode: typeof candidate.minimumViableMode === "boolean" ? candidate.minimumViableMode : seed.minimumViableMode,
    sortBy: typeof candidate.sortBy === "string" ? candidate.sortBy : seed.sortBy,
    timerTarget: validObject(candidate.timerTarget) ? candidate.timerTarget : seed.timerTarget,
    recentChange: validObject(candidate.recentChange) ? candidate.recentChange : seed.recentChange,
  };
}

function backupCorruptStore(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return;
    storage.setItem(`${BACKUP_KEY_PREFIX}.${new Date().toISOString()}`, raw);
  } catch (error) {
    // Backup is best-effort; hydration must never crash.
  }
}

async function backupCorruptStoreAsync(storage) {
  try {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return;
    await storage.setItem(`${BACKUP_KEY_PREFIX}.${new Date().toISOString()}`, raw);
  } catch (error) {
    // Backup is best-effort; hydration must never crash.
  }
}

function validArray(value) {
  return Array.isArray(value);
}

function validObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function removePrototypeDemoData(candidate, seed) {
  const courses = candidate.courses.filter((course) => !DEMO_COURSE_CODES.has(course.code));
  const removedAssessmentIds = new Set(
    candidate.assessments
      .filter((assessment) => DEMO_COURSE_CODES.has(assessment.course))
      .map((assessment) => assessment.id),
  );

  return {
    ...candidate,
    courses,
    assessments: candidate.assessments.filter((assessment) => !DEMO_COURSE_CODES.has(assessment.course)),
    commitments: candidate.commitments.filter((commitment) => (
      !DEMO_COMMITMENT_IDS.has(commitment.id) && !DEMO_COURSE_CODES.has(commitment.course)
    )),
    studySessions: candidate.studySessions.filter((session) => (
      !DEMO_COURSE_CODES.has(session.course) && !removedAssessmentIds.has(session.assessmentId)
    )),
    taskHistory: Object.fromEntries(
      Object.entries(candidate.taskHistory).filter(([assessmentId, history]) => (
        !removedAssessmentIds.has(Number(assessmentId)) && !removedAssessmentIds.has(history?.assessmentId)
      )),
    ),
    view: candidate.view || seed.view,
    timerTarget: removedAssessmentIds.has(candidate.timerTarget?.assessmentId) ? null : candidate.timerTarget,
    recentChange: null,
  };
}

function safeLocalStorage() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

async function safeNativeStorage() {
  try {
    if (typeof window === "undefined") return null;
    const [{ Capacitor }, { Preferences }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/preferences"),
    ]);
    if (!Capacitor.isNativePlatform?.()) return null;

    return {
      async getItem(key) {
        const result = await Preferences.get({ key });
        return result.value;
      },
      async setItem(key, value) {
        await Preferences.set({ key, value });
      },
      async removeItem(key) {
        await Preferences.remove({ key });
      },
    };
  } catch (error) {
    return null;
  }
}
