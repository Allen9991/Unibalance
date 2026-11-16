import React from "react";
import { ChevronLeft, FileText, Link, Loader2, Plus, Trash2 } from "lucide-react";
import { AICapture } from "../components/AICapture.jsx";
import { AssessmentTable } from "../components/AssessmentTable.jsx";
import { Card, Pill, Progress } from "../components/ui.jsx";
import { importCourseLink, importCourseOutlineFile } from "../lib/aiClient.js";
import { calculateCourseGradeSnapshot } from "../lib/gradebook.js";

export function Courses({ state, strategy, dispatch }) {
  const [selectedCourseCode, setSelectedCourseCode] = React.useState("");
  const [draftCourse, setDraftCourse] = React.useState({ code: "", name: "", recommended: 5, lectures: 0, tutorials: 0, labs: 0 });
  const [courseUrl, setCourseUrl] = React.useState("");
  const [importingUrl, setImportingUrl] = React.useState(false);
  const [importingFile, setImportingFile] = React.useState(false);
  const [importMessage, setImportMessage] = React.useState("");
  const selectedCourse = state.courses.find((course) => course.code === selectedCourseCode);

  React.useEffect(() => {
    if (selectedCourseCode && !selectedCourse) setSelectedCourseCode("");
  }, [selectedCourseCode, selectedCourse]);

  function addCourse(event) {
    event.preventDefault();
    const code = draftCourse.code.trim().toUpperCase();
    dispatch({
      type: "addCourse",
      course: {
        code,
        name: draftCourse.name,
        recommended: draftCourse.recommended,
        contact: {
          lectures: draftCourse.lectures,
          tutorials: draftCourse.tutorials,
          labs: draftCourse.labs,
        },
      },
    });
    setSelectedCourseCode(code);
    setDraftCourse({ code: "", name: "", recommended: 5, lectures: 0, tutorials: 0, labs: 0 });
  }

  async function importFromCourseUrl(event) {
    event.preventDefault();
    if (!courseUrl.trim()) return;

    setImportingUrl(true);
    setImportMessage("");
    try {
      const result = await importCourseLink(courseUrl.trim());
      const summary = importCourseResult(result);
      setCourseUrl("");
      setImportMessage(result.warning || summary);
    } catch (error) {
      setImportMessage(error.message || "Could not import that course link.");
    } finally {
      setImportingUrl(false);
    }
  }

  async function importOutlineFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingFile(true);
    setImportMessage("");
    try {
      const result = await importCourseOutlineFile(file);
      const summary = importCourseResult(result);
      setImportMessage(result.warning || summary);
    } catch (error) {
      setImportMessage(error.message || "Could not import that course outline.");
    } finally {
      setImportingFile(false);
      event.target.value = "";
    }
  }

  function importCourseResult(result) {
    if (!result.course?.code) {
      if (result.keyDates?.length) {
        dispatch({ type: "addKeyDates", keyDates: result.keyDates });
        return `Imported ${result.keyDates.length} academic key dates.`;
      }
      throw new Error("I could not find a course code in that source.");
    }
    const alreadyExists = state.courses.some((course) => course.code === result.course.code);
    dispatch({
      type: alreadyExists ? "updateCourse" : "addCourse",
      courseCode: result.course.code,
      course: result.course,
      patch: result.course,
    });
    (result.assessments || []).forEach((assessment) => {
      dispatch({ type: "addAssessment", assessment: { ...assessment, course: result.course.code } });
    });
    if (result.keyDates?.length) dispatch({ type: "addKeyDates", keyDates: result.keyDates });
    setSelectedCourseCode(result.course.code);
    return `Imported ${result.course.code}${result.assessments?.length ? ` with ${result.assessments.length} tracked items` : ""}.`;
  }

  if (selectedCourse) {
    return (
      <CourseDetail
        course={selectedCourse}
        courses={state.courses}
        assessments={state.assessments}
        scoredAssessments={strategy.scoredAssessments}
        sortBy={state.sortBy}
        dispatch={dispatch}
        onBack={() => setSelectedCourseCode("")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <form onSubmit={importFromCourseUrl} className="mb-4 flex flex-col gap-2 border-b border-slate-100 pb-4 md:flex-row">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-blue-500">
            <Link className="h-4 w-4 flex-none text-blue-600" />
            <input value={courseUrl} onChange={(event) => setCourseUrl(event.target.value)} placeholder="Paste a university course-outline link" className="min-w-0 flex-1 text-sm outline-none" />
          </div>
          <button type="submit" disabled={importingUrl} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            {importingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Import link
          </button>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            {importingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Upload PDF
            <input type="file" accept="application/pdf,.pdf" onChange={importOutlineFile} disabled={importingFile} className="sr-only" />
          </label>
        </form>
        {importMessage && <p className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">{importMessage}</p>}
        <form onSubmit={addCourse} className="grid gap-3 lg:grid-cols-[120px_1fr_120px_90px_90px_90px_auto]">
          <input value={draftCourse.code} onChange={(event) => setDraftCourse((draft) => ({ ...draft, code: event.target.value }))} placeholder="Code" className="rounded-lg border border-slate-200 px-3 py-2 text-sm uppercase outline-none focus:border-blue-500" />
          <input value={draftCourse.name} onChange={(event) => setDraftCourse((draft) => ({ ...draft, name: event.target.value }))} placeholder="Course name" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <input type="number" min="0" value={draftCourse.recommended} onChange={(event) => setDraftCourse((draft) => ({ ...draft, recommended: Number(event.target.value) }))} aria-label="Recommended weekly hours" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <input type="number" min="0" value={draftCourse.lectures} onChange={(event) => setDraftCourse((draft) => ({ ...draft, lectures: Number(event.target.value) }))} aria-label="Lectures" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <input type="number" min="0" value={draftCourse.tutorials} onChange={(event) => setDraftCourse((draft) => ({ ...draft, tutorials: Number(event.target.value) }))} aria-label="Tutorials" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <input type="number" min="0" value={draftCourse.labs} onChange={(event) => setDraftCourse((draft) => ({ ...draft, labs: Number(event.target.value) }))} aria-label="Labs" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            <Plus className="h-4 w-4" />
            Add course
          </button>
        </form>
      </Card>

      {state.courses.length === 0 ? (
        <Card className="border border-dashed border-slate-300 bg-white">
          <h2 className="font-semibold">No courses yet</h2>
          <p className="mt-1 text-sm text-slate-500">Add or import the courses you are currently doing. Each course opens into its own editable workspace.</p>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {state.courses.map((course) => (
            <CourseListItem key={course.code} course={course} assessments={state.assessments} onSelect={() => setSelectedCourseCode(course.code)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseListItem({ course, assessments, onSelect }) {
  const pct = course.recommended > 0 ? (course.logged / course.recommended) * 100 : 0;
  const tone = pct < 85 ? "amber" : pct > 115 ? "violet" : "green";
  const grade = calculateCourseGradeSnapshot(course, assessments);
  const activeAssessments = assessments.filter((assessment) => assessment.course === course.code && assessment.status !== "done").length;

  return (
    <button onClick={onSelect} className="text-left">
      <Card className="h-full transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-bold">{course.code}</h2>
            <p className="text-sm text-slate-500">{course.name}</p>
          </div>
          <Pill color={pct < 85 ? "amber" : pct > 115 ? "blue" : "green"}>{pct < 85 ? "under" : pct > 115 ? "over" : "on track"}</Pill>
        </div>
        <div className="mb-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-lg bg-slate-50 p-3"><strong>{course.contact.lectures}</strong><br />Lectures</div>
          <div className="rounded-lg bg-slate-50 p-3"><strong>{course.contact.tutorials}</strong><br />Tutorials</div>
          <div className="rounded-lg bg-slate-50 p-3"><strong>{course.contact.labs}</strong><br />Labs</div>
        </div>
        <div className="mb-2 flex justify-between text-sm"><span>Logged this week</span><strong>{course.logged.toFixed(1)} / {course.recommended}h</strong></div>
        <Progress value={pct} tone={tone} />
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-950">
            <div className="text-blue-700">Grade</div>
            <strong>{grade.currentGrade.toFixed(1)}%</strong>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-slate-500">Weight done</div>
            <strong>{grade.completedWeight.toFixed(1)}%</strong>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-slate-500">Open tasks</div>
            <strong>{activeAssessments}</strong>
          </div>
        </div>
      </Card>
    </button>
  );
}

function CourseDetail({ course, courses, assessments, scoredAssessments, sortBy, dispatch, onBack }) {
  const grade = calculateCourseGradeSnapshot(course, assessments);
  const courseAssessments = scoredAssessments
    .filter((assessment) => assessment.course === course.code)
    .sort((a, b) => {
      if (sortBy === "due") return new Date(a.dueDate || "9999-12-31") - new Date(b.dueDate || "9999-12-31");
      if (sortBy === "drop") return b.dropSafetyScore - a.dropSafetyScore;
      return b.marginalValuePerHour - a.marginalValuePerHour;
    });

  function updateCourse(patch) {
    dispatch({ type: "updateCourse", courseCode: course.code, patch });
  }

  function deleteCourse() {
    if (!window.confirm(`Delete ${course.code} and all linked assessments/sessions?`)) return;
    dispatch({ type: "deleteCourse", courseCode: course.code });
    onBack();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
          <ChevronLeft className="h-4 w-4" />
          Courses
        </button>
        <button onClick={deleteCourse} className="inline-flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          <Trash2 className="h-4 w-4" />
          Delete course
        </button>
      </div>

      <Card>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-blue-700">{course.code}</div>
            <h2 className="text-2xl font-bold">{course.name}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Metric label="Current grade" value={`${grade.currentGrade.toFixed(1)}%`} />
            <Metric label="Completed" value={`${grade.completedWeight.toFixed(1)}%`} />
            <Metric label="Target" value={`${course.targetGrade || 75}%`} />
            <Metric label="Weekly target" value={`${course.recommended}h`} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Course name</span>
            <input value={course.name} onChange={(event) => updateCourse({ name: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Recommended study hours/week</span>
            <input type="number" min="0" value={course.recommended} onChange={(event) => updateCourse({ recommended: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Target grade</span>
            <input type="number" min="0" max="100" value={course.targetGrade || 75} onChange={(event) => updateCourse({ targetGrade: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Current baseline grade</span>
            <input type="number" min="0" max="100" value={course.gradeSoFar || 0} onChange={(event) => updateCourse({ gradeSoFar: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Lectures/week</span>
            <input type="number" min="0" value={course.contact.lectures} onChange={(event) => updateCourse({ contact: { ...course.contact, lectures: Number(event.target.value) } })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Tutorials/week</span>
            <input type="number" min="0" value={course.contact.tutorials} onChange={(event) => updateCourse({ contact: { ...course.contact, tutorials: Number(event.target.value) } })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Labs/week</span>
            <input type="number" min="0" value={course.contact.labs} onChange={(event) => updateCourse({ contact: { ...course.contact, labs: Number(event.target.value) } })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-500">Logged hours this week</span>
            <input type="number" min="0" step="0.25" value={course.logged} onChange={(event) => updateCourse({ logged: Number(event.target.value) })} className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
        </div>
      </Card>

      <RecurringAssessmentTracker assessments={assessments.filter((item) => item.course === course.code)} dispatch={dispatch} />

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{course.code} assessments</h2>
          <div className="flex gap-2">
            {[
              ["strategy", "Leverage"],
              ["drop", "Drop safety"],
              ["due", "Due date"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => dispatch({ type: "setSort", sortBy: key })} className={`rounded-lg px-3 py-2 text-sm ${sortBy === key ? "bg-slate-900 text-white" : "bg-slate-100"}`}>{label}</button>
            ))}
          </div>
        </div>
        <AssessmentTable
          assessments={courseAssessments}
          courses={courses}
          onUpdate={(assessmentId, patch) => dispatch({ type: "updateAssessment", assessmentId, patch })}
          onDelete={(assessmentId) => dispatch({ type: "deleteAssessment", assessmentId })}
        />
        {courseAssessments.length === 0 && <p className="mt-4 text-sm text-slate-500">No assessments for this course yet.</p>}
      </Card>

      <AICapture courses={[course]} onAdd={(assessment) => dispatch({ type: "addAssessment", assessment: { ...assessment, course: course.code } })} compact />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-slate-500">{label}</div>
      <strong>{value}</strong>
    </div>
  );
}

function RecurringAssessmentTracker({ assessments, dispatch }) {
  const groups = Object.values(assessments.filter((item) => item.seriesId).reduce((acc, item) => {
    acc[item.seriesId] = acc[item.seriesId] || [];
    acc[item.seriesId].push(item);
    return acc;
  }, {}));

  if (groups.length === 0) return null;

  return (
    <Card>
      <h2 className="mb-4 font-semibold">Weekly graded items</h2>
      <div className="space-y-4">
        {groups.map((items) => {
          const sortedItems = [...items].sort((a, b) => a.seriesIndex - b.seriesIndex);
          const first = sortedItems[0];
          const scored = sortedItems.filter((item) => item.grade !== undefined).sort((a, b) => b.grade - a.grade);
          const counted = scored.slice(0, first.bestOf || sortedItems.length);
          const average = counted.length ? counted.reduce((sum, item) => sum + Number(item.grade || 0), 0) / counted.length : 0;
          return (
            <div key={first.seriesId} className="rounded-lg border border-slate-100 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{first.course}: {first.seriesTitle}</div>
                  <div className="text-sm text-slate-500">Best {first.bestOf} of {first.seriesCount}, worth {first.totalSeriesWeighting}% total. Counted average: {average.toFixed(1)}%</div>
                </div>
                <Pill color="blue">{counted.length}/{first.bestOf || sortedItems.length} counted</Pill>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {sortedItems.map((item) => (
                  <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <strong>{item.title}</strong>
                      <span className="text-xs text-slate-500">{item.dueDate || "TBA"}</span>
                    </div>
                    {item.gradingMode === "attendance-work" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={(item.attendanceScore || 0) > 0} onChange={(event) => dispatch({ type: "updateAssessment", assessmentId: item.id, patch: { attendanceScore: event.target.checked ? 100 : 0, progress: event.target.checked || (item.workScore || 0) > 0 ? 100 : item.progress } })} />
                          Attend
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={(item.workScore || 0) > 0} onChange={(event) => dispatch({ type: "updateAssessment", assessmentId: item.id, patch: { workScore: event.target.checked ? 100 : 0, progress: event.target.checked || (item.attendanceScore || 0) > 0 ? 100 : item.progress } })} />
                          Work
                        </label>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2">
                        <span className="text-slate-500">Mark</span>
                        <input type="number" min="0" max="100" value={item.grade ?? ""} onChange={(event) => dispatch({ type: "updateAssessment", assessmentId: item.id, patch: { grade: Number(event.target.value), progress: 100, status: "done" } })} className="w-20 rounded-md border border-slate-200 px-2 py-1" />
                        <span>%</span>
                      </label>
                    )}
                    {item.grade !== undefined && <div className="mt-2 text-xs text-slate-500">Tracked mark: {Number(item.grade).toFixed(1)}%</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
