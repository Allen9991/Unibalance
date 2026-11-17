import { daysUntil } from "./date.js";

const dayIndex = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

export function buildNotificationRequests({ assessments = [], plan = [], now = new Date() }) {
  const deadlineNotifications = assessments
    .filter((assessment) => assessment.status !== "done")
    .filter((assessment) => daysUntil(assessment.dueDate, now) >= 1)
    .sort((a, b) => daysUntil(a.dueDate, now) - daysUntil(b.dueDate, now))
    .slice(0, 8)
    .map((assessment, index) => ({
      id: 1000 + Number(assessment.id || index),
      title: `${assessment.course}: ${assessment.title}`,
      body: `Due soon and worth ${assessment.weighting}%. UniBalance has ranked it by strategy, not panic.`,
      schedule: { at: reminderDateForDueDate(assessment.dueDate) },
    }));

  const studyNotifications = plan
    .filter((event) => event.type === "study" && event.status !== "completed" && event.status !== "skipped")
    .slice(0, 6)
    .map((event, index) => ({
      id: 2000 + index,
      title: "Study block soon",
      body: event.title,
      schedule: { at: reminderDateForWeekEvent(event, now) },
    }))
    .filter((notification) => notification.schedule.at > now);

  return [...deadlineNotifications, ...studyNotifications];
}

export async function syncNativeNotifications({ assessments, plan }) {
  try {
    const [{ Capacitor }, { LocalNotifications }] = await Promise.all([
      import("@capacitor/core"),
      import("@capacitor/local-notifications"),
    ]);
    if (!Capacitor.isNativePlatform?.()) return false;

    const permission = await LocalNotifications.requestPermissions();
    if (permission.display !== "granted") return false;

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const notifications = buildNotificationRequests({ assessments, plan });
    if (!notifications.length) return true;
    await LocalNotifications.schedule({ notifications });
    return true;
  } catch (error) {
    return false;
  }
}

function reminderDateForDueDate(dueDate) {
  const date = new Date(`${dueDate}T09:00:00`);
  date.setDate(date.getDate() - 1);
  return date;
}

function reminderDateForWeekEvent(event, now) {
  const date = new Date(now);
  const currentDay = date.getDay();
  const targetDay = dayIndex[event.day] ?? currentDay;
  const offset = (targetDay - currentDay + 7) % 7;
  date.setDate(date.getDate() + offset);
  date.setHours(Math.floor(event.start), Math.round((event.start % 1) * 60) - 15, 0, 0);
  if (date <= now) date.setDate(date.getDate() + 7);
  return date;
}
