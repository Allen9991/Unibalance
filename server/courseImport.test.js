import test from "node:test";
import assert from "node:assert/strict";
import { importCourseFromDocument, importCourseFromUrl } from "./courseImport.js";

test("course import extracts page details through the server-side AI boundary", async () => {
  const fetches = [];
  const result = await importCourseFromUrl({
    url: "https://example.edu/courses/biol101",
    apiKey: "test-key",
    fetchImpl: async (url, options = {}) => {
      fetches.push({ url, options });
      if (url === "https://example.edu/courses/biol101") {
        return response(200, "<h1>BIOL101 Biology</h1><p>3 lectures 1 tutorial 1 lab</p>");
      }
      return response(200, {
        content: [{
          text: JSON.stringify({
            course: {
              code: "BIOL101",
              name: "Biology",
              recommended: 6,
              contact: { lectures: 3, tutorials: 1, labs: 1 },
            },
            assessments: [{ title: "Lab report", type: "Report", dueDate: "2026-06-20", weighting: 25, estimatedHours: 8 }],
          }),
        }],
      });
    },
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.course.code, "BIOL101");
  assert.equal(result.body.course.contact.lectures, 3);
  assert.equal(result.body.assessments[0].course, "BIOL101");
  assert.equal(fetches[1].options.headers["x-api-key"], "test-key");
});

test("course import falls back safely when no AI key is configured", async () => {
  const result = await importCourseFromUrl({
    url: "https://example.edu/courses/chem101",
    apiKey: "",
    fetchImpl: async () => response(200, "<h1>CHEM101 Chemistry</h1><p>2 lectures 1 lab</p>"),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.course.code, "CHEM101");
  assert.equal(result.body.course.contact.lectures, 2);
  assert.match(result.body.warning, /AI extraction is unavailable/);
});

test("course PDF import expands best-of recurring assessment series", async () => {
  const result = await importCourseFromDocument({
    fileName: "EMTH210-26S1 Course Outline.pdf",
    mimeType: "application/pdf",
    data: "JVBERi0xLjQ=",
    apiKey: "test-key",
    fetchImpl: async () => response(200, {
      content: [{
        text: JSON.stringify({
          course: {
            code: "EMTH210",
            name: "Engineering Mathematics 2",
            recommended: 10,
            contact: { lectures: 0, tutorials: 1, labs: 0 },
            semesterStart: "2026-02-16",
            semesterEnd: "2026-06-21",
          },
          assessments: [
            { title: "Mid-course Test", type: "Test", dueDate: "2026-04-28", weighting: 35, estimatedHours: 14 },
            { title: "Final Examination", type: "Exam", dateStatus: "to be advised", weighting: 45, estimatedHours: 24 },
          ],
          recurringAssessments: [
            { title: "Tutorial", type: "Tutorial", totalWeighting: 10, count: 12, bestOf: 10, gradingMode: "attendance-work", attendanceWeight: 50, workWeight: 50, estimatedHoursEach: 1.5 },
            { title: "Online Quiz", type: "Quiz", totalWeighting: 10, count: 12, bestOf: 10, dueDay: "Friday", dueTime: "17:00", estimatedHoursEach: 1 },
          ],
          keyDates: [{ title: "Semester 1", type: "teaching-period", startDate: "2026-02-16", endDate: "2026-06-21" }],
        }),
      }],
    }),
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.course.code, "EMTH210");
  assert.equal(result.body.assessments.filter((item) => item.seriesTitle === "Tutorial").length, 12);
  assert.equal(result.body.assessments.filter((item) => item.seriesTitle === "Online Quiz").length, 12);
  assert.equal(result.body.assessments.find((item) => item.title === "Tutorial 1").gradingMode, "attendance-work");
  assert.equal(result.body.assessments.find((item) => item.title === "Online Quiz 1").dueDate, "2026-02-20");
  assert.equal(result.body.assessments.find((item) => item.title === "Final Examination").dateStatus, "to be advised");
  assert.equal(result.body.keyDates[0].title, "Semester 1");
});

function response(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
    async json() {
      return typeof body === "string" ? JSON.parse(body) : body;
    },
  };
}
