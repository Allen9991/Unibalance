const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-sonnet-4-6";

export async function importCourseFromUrl({ url, apiKey, fetchImpl = fetch }) {
  const target = parseHttpUrl(url);
  const pageResponse = await fetchImpl(target.href, {
    headers: {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
      "user-agent": "UniBalance course importer",
    },
  });

  if (!pageResponse.ok) {
    return { status: pageResponse.status, body: { error: "Could not fetch that course page" } };
  }

  const html = await pageResponse.text();
  const pageText = normalizePageText(html).slice(0, 18000);
  if (!pageText) {
    return { status: 422, body: { error: "That page did not contain readable course details" } };
  }

  const fallback = extractCourseHeuristically(pageText, target.href);
  return importCourseFromText({ text: pageText, sourceUrl: target.href, fallback, apiKey, fetchImpl });
}

export async function importCourseFromDocument({ fileName, mimeType, data, apiKey, fetchImpl = fetch }) {
  if (!data || !mimeType) {
    return { status: 400, body: { error: "Upload a readable course-outline PDF" } };
  }

  const sourceUrl = `uploaded:${fileName || "course-outline.pdf"}`;
  const fallback = extractCourseHeuristically(fileName || "", sourceUrl);
  if (!apiKey) {
    return {
      status: 200,
      body: {
        course: fallback.course,
        assessments: fallback.assessments,
        sourceUrl,
        warning: "AI extraction is unavailable, so UniBalance imported only the details it could detect safely.",
      },
    };
  }

  const aiResponse = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      system: extractionSystemPrompt(),
      messages: [{
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: mimeType,
              data,
            },
          },
          { type: "text", text: `Extract this course outline for UniBalance. Source: ${sourceUrl}` },
        ],
      }],
    }),
  });

  return parseAiImportResponse({ aiResponse, fallback, sourceUrl });
}

async function importCourseFromText({ text, sourceUrl, fallback, apiKey, fetchImpl }) {
  if (!apiKey) {
    return {
      status: 200,
      body: {
        course: fallback.course,
        assessments: fallback.assessments,
        sourceUrl,
        warning: "AI extraction is unavailable, so UniBalance imported only the details it could detect safely.",
      },
    };
  }

  const aiResponse = await fetchImpl(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1800,
      system: extractionSystemPrompt(),
      messages: [{ role: "user", content: `Source URL: ${sourceUrl}\n\nCourse page text:\n${text}` }],
    }),
  });

  return parseAiImportResponse({ aiResponse, fallback, sourceUrl });
}

async function parseAiImportResponse({ aiResponse, fallback, sourceUrl }) {
  const body = await aiResponse.json().catch(() => null);
  if (!aiResponse.ok || !body) {
    return {
      status: 200,
      body: {
        course: fallback.course,
        assessments: fallback.assessments,
        sourceUrl,
        warning: "AI extraction failed, so UniBalance imported only the details it could detect safely.",
      },
    };
  }

  try {
    const raw = (body.content || []).map((part) => part.text || "").join("").replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    return {
      status: 200,
      body: sanitizeImportResult(parsed, fallback, sourceUrl),
    };
  } catch (error) {
    return {
      status: 200,
      body: {
        course: fallback.course,
        assessments: fallback.assessments,
        sourceUrl,
        warning: "AI returned an unreadable import, so UniBalance used the safe detected details.",
      },
    };
  }
}

export function createCourseImportProxy({ apiKey, fetchImpl } = {}) {
  return async function courseImportProxy(req, res) {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      const payload = await readJson(req);
      const result = await importCourseFromUrl({ url: payload.url, apiKey, fetchImpl });
      sendJson(res, result.status, result.body);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid course import request" });
    }
  };
}

export function createCourseDocumentImportProxy({ apiKey, fetchImpl } = {}) {
  return async function courseDocumentImportProxy(req, res) {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      const payload = await readJson(req);
      const result = await importCourseFromDocument({
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        data: payload.data,
        apiKey,
        fetchImpl,
      });
      sendJson(res, result.status, result.body);
    } catch (error) {
      sendJson(res, 400, { error: error.message || "Invalid course outline upload" });
    }
  };
}

function sanitizeImportResult(parsed, fallback, sourceUrl) {
  const course = parsed?.course || {};
  const code = String(course.code || fallback.course.code || "").trim().toUpperCase();
  return {
    course: {
      code,
      name: String(course.name || fallback.course.name || code || "Imported course").trim(),
      recommended: numberOr(course.recommended, fallback.course.recommended),
      contact: {
        lectures: numberOr(course.contact?.lectures, fallback.course.contact.lectures),
        tutorials: numberOr(course.contact?.tutorials, fallback.course.contact.tutorials),
        labs: numberOr(course.contact?.labs, fallback.course.contact.labs),
      },
      gradeSoFar: numberOr(course.gradeSoFar, 0),
      targetGrade: numberOr(course.targetGrade, 75),
      semesterStart: isIsoDate(course.semesterStart) ? course.semesterStart : fallback.course.semesterStart,
      semesterEnd: isIsoDate(course.semesterEnd) ? course.semesterEnd : fallback.course.semesterEnd,
      sourceUrl,
    },
    assessments: [
      ...(Array.isArray(parsed?.assessments)
        ? parsed.assessments.map((assessment) => sanitizeAssessment(assessment, code, parsed?.course)).filter(Boolean)
        : fallback.assessments),
      ...expandRecurringAssessments(parsed?.recurringAssessments, code, parsed?.course),
    ],
    keyDates: Array.isArray(parsed?.keyDates) ? parsed.keyDates.map(sanitizeKeyDate).filter(Boolean) : [],
    sourceUrl,
  };
}

function sanitizeAssessment(assessment, course, courseDetails = {}) {
  const title = String(assessment?.title || "").trim();
  if (!title) return null;
  const dueDate = isIsoDate(assessment.dueDate)
    ? assessment.dueDate
    : isIsoDate(courseDetails.semesterEnd)
      ? courseDetails.semesterEnd
      : "";
  return {
    course,
    title,
    type: String(assessment.type || "Assessment").trim(),
    dueDate,
    dateStatus: assessment.dateStatus || (assessment.dueDate ? "confirmed" : "to be advised"),
    weighting: numberOr(assessment.weighting, 0),
    estimatedHours: numberOr(assessment.estimatedHours, 6),
  };
}

function expandRecurringAssessments(recurringAssessments, course, courseDetails = {}) {
  if (!Array.isArray(recurringAssessments)) return [];

  return recurringAssessments.flatMap((series, seriesIndex) => {
    const count = Math.max(0, Math.min(30, Math.round(numberOr(series.count, 0))));
    if (!series.title || !count) return [];
    const bestOf = Math.max(1, Math.min(count, Math.round(numberOr(series.bestOf, count))));
    const totalWeighting = numberOr(series.totalWeighting, series.weighting || bestOf);
    const itemWeighting = Number((totalWeighting / bestOf).toFixed(3));
    const semesterStart = isIsoDate(courseDetails.semesterStart) ? courseDetails.semesterStart : "";
    const dueDay = series.dueDay || "";
    const dueTime = series.dueTime || "";
    const seriesId = `${course}-${slug(series.title)}-${seriesIndex + 1}`;

    return Array.from({ length: count }, (_, index) => ({
      course,
      title: `${series.title} ${index + 1}`,
      type: series.type || series.title,
      dueDate: inferWeeklyDueDate({ semesterStart, dueDay, weekIndex: index }),
      dueTime,
      dateStatus: semesterStart ? "inferred" : "to be advised",
      weighting: itemWeighting,
      estimatedHours: numberOr(series.estimatedHoursEach, 1),
      seriesId,
      seriesTitle: series.title,
      seriesIndex: index + 1,
      seriesCount: count,
      bestOf,
      totalSeriesWeighting: totalWeighting,
      gradingMode: series.gradingMode || (series.attendanceWeight || series.workWeight ? "attendance-work" : "score"),
      attendanceWeight: numberOr(series.attendanceWeight, 0),
      workWeight: numberOr(series.workWeight, 0),
      notes: series.notes || "",
    }));
  });
}

function inferWeeklyDueDate({ semesterStart, dueDay, weekIndex }) {
  if (!semesterStart) return "";
  const date = new Date(`${semesterStart}T12:00:00`);
  date.setDate(date.getDate() + weekIndex * 7);
  const targetDay = dayIndex(dueDay);
  if (targetDay !== null) {
    const delta = (targetDay - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + delta);
  }
  return formatLocalIsoDate(date);
}

function sanitizeKeyDate(item) {
  const title = String(item?.title || "").trim();
  if (!title) return null;
  return {
    id: `${slug(title)}-${item.date || item.startDate || Date.now()}`,
    title,
    type: item.type || "academic",
    date: isIsoDate(item.date) ? item.date : "",
    startDate: isIsoDate(item.startDate) ? item.startDate : "",
    endDate: isIsoDate(item.endDate) ? item.endDate : "",
    notes: item.notes || "",
  };
}

function extractCourseHeuristically(text, sourceUrl) {
  const code = (text.match(/\b[A-Z]{3,5}\s?\d{3}\b/)?.[0] || "").replace(/\s+/g, "").toUpperCase();
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) || "";
  return {
    course: {
      code,
      name: code ? firstLine.replace(code, "").trim() || firstLine : firstLine || "Imported course",
      recommended: 5,
      contact: {
        lectures: detectCount(text, /(\d+)\s+lectures?/i),
        tutorials: detectCount(text, /(\d+)\s+tutorials?/i),
        labs: detectCount(text, /(\d+)\s+labs?/i),
      },
      gradeSoFar: 0,
      targetGrade: 75,
      semesterStart: "",
      semesterEnd: "",
      sourceUrl,
    },
    assessments: [],
  };
}

function extractionSystemPrompt() {
  return [
    "Extract university course details for UniBalance.",
    "Return ONLY JSON with shape:",
    "{ course: { code, name, recommended, contact: { lectures, tutorials, labs }, gradeSoFar, targetGrade, semesterStart, semesterEnd }, assessments: [{ title, type, dueDate, dateStatus, weighting, estimatedHours }], recurringAssessments: [{ title, type, totalWeighting, count, bestOf, dueDay, dueTime, estimatedHoursEach, gradingMode, attendanceWeight, workWeight, notes }], keyDates: [{ title, type, date, startDate, endDate, notes }] }.",
    "Use ISO yyyy-mm-dd dates when explicit dates exist. If a final exam says date/time to be advised, include it as an assessment with dateStatus 'to be advised' and use semesterEnd as a tentative dueDate if available.",
    "For best-of weekly items like best 10 of 12 quizzes/tutorials, put them in recurringAssessments, not as one flat assessment.",
    "Recommended study hours should include outside-class work and should be a practical weekly target inferred from course level, points, contact hours, and assessment load.",
    "Do not invent assessment items that are not suggested by the source.",
  ].join(" ");
}

function normalizePageText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectCount(text, pattern) {
  const value = Number(text.match(pattern)?.[1]);
  return Number.isFinite(value) ? value : 0;
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function dayIndex(value) {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const index = days.findIndex((day) => day.startsWith(String(value || "").toLowerCase().slice(0, 3)));
  return index >= 0 ? index : null;
}

function formatLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseHttpUrl(value) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Use a normal http or https course link");
  return parsed;
}

async function readJson(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}
