# UniBalance Web Roadmap

This is the plan for getting UniBalance from the current local MVP to a web app that real students can start using.

## Product Goal

UniBalance should become a personal study operating system for university students.

The app should answer:

- What should I work on next?
- Am I doing enough for each course?
- What can I safely reduce when life gets busy?
- How much do I need on future assessments to hit my goal?
- When should I start work, based on how long I actually take?
- How do my courses, grades, timetable, work, rest, and deadlines fit together?

## Current Milestone: Local Web MVP

Status: mostly built, not ready for public users yet.

Built:

- web app with React/Vite
- local browser persistence
- course list and course detail pages
- manual course entry
- course-outline link import
- PDF course-outline import
- AI-backed extraction through local proxy
- assessments CRUD
- recurring weekly item support
- best-of quiz/tutorial grade tracking
- attendance/work split marks
- current grade snapshots
- academic key dates and exam-window awareness
- planner and Pomodoro logging
- deterministic strategy engine
- AI assistant that explains deterministic outputs
- calendar/timetable import support

Not yet good enough:

- onboarding is too rough
- storage is local-only
- no accounts
- no cloud sync
- PDF import needs review/confirm before saving
- no production deployment
- no real user testing loop
- mobile web UI needs polish

## Phase 1: Web Stabilization

Goal: make the local web app reliable and pleasant enough for daily testing.

Tasks:

- Audit every main flow:
  - first launch
  - add course manually
  - import course by link
  - import course by PDF
  - edit course
  - edit assessment
  - track weekly quiz/tutorial marks
  - log study session
  - use planner
  - ask assistant
- Fix broken states, confusing empty states, and crashes.
- Add a review screen before imported PDF/link data is saved.
- Add better validation for:
  - missing due dates
  - TBA exam dates
  - duplicate imported assessments
  - course code conflicts
  - assessment weights over/under 100%
- Make course detail pages feel like the main workspace for a course.
- Improve mobile web layout for small screens.
- Keep tests passing after every change.

Exit criteria:

- A student can add/import all current courses without developer help.
- A student can edit bad imported data.
- App does not crash with partial or messy course data.
- `npm test` and `npm run build` pass.

## Phase 2: Data Model Cleanup

Goal: prepare the app for a real backend without changing the product experience.

Tasks:

- Define stable IDs for courses, assessments, recurring series, sessions, commitments, and key dates.
- Separate models clearly:
  - Course
  - Assessment
  - RecurringAssessmentSeries
  - RecurringAssessmentItem
  - StudySession
  - Commitment
  - AcademicKeyDate
  - UserPreference
  - ImportJob
- Stop relying on `Date.now()` for important IDs.
- Add migration tests for old local data.
- Make import logic idempotent, so uploading the same outline twice does not duplicate everything.

Exit criteria:

- Data can be exported/imported cleanly as JSON.
- Duplicate imports are controlled.
- Backend tables can be designed directly from the frontend models.

## Phase 3: Backend And Accounts

Goal: users can sign in and keep their data safely.

Tasks:

- Choose backend stack.
- Add authentication.
- Store user data in a database.
- Move persistence from browser-only storage to backend-backed sync.
- Keep local autosave/offline fallback where useful.
- Move all AI calls to hosted server endpoints.
- Add per-user authorization to every server route.
- Add import history so users can review what was extracted from PDFs/links.

Exit criteria:

- A user can create an account.
- Their courses survive across devices and browser refreshes.
- AI keys are never exposed to the client.
- Server routes are protected per user.

## Phase 4: Production Web Deployment

Goal: the app is usable from a normal public URL.

Tasks:

- Deploy the web app.
- Configure production environment variables.
- Add production logging for server errors.
- Add basic analytics for product flow health:
  - course added
  - PDF imported
  - assessment edited
  - planner generated
  - assistant used
- Add clear error messages for failed imports and failed AI calls.
- Add privacy and data-use copy.
- Add a backup/export option.

Exit criteria:

- A student can open the app from a public URL and sign in.
- Course import and AI assistant work in production.
- Failed AI/import requests are understandable, not silent.
- Basic monitoring exists.

## Phase 5: Private Beta

Goal: get the first real students using UniBalance.

Target group:

- 3 to 10 university students
- preferably students with real course outlines, weekly quizzes/tutorials, and mixed commitments

Tasks:

- Create a short onboarding checklist.
- Watch users add their real courses.
- Collect bugs and confusion points.
- Track which features they actually use.
- Improve:
  - import accuracy
  - grade tracking
  - planner usefulness
  - assistant answers
  - mobile web layout
- Add feedback capture inside the app.

Exit criteria:

- At least 3 students use it for one full week.
- Students can recover from bad imports without help.
- The planner gives useful study suggestions.
- The grade tracker matches each student's course rules closely enough to trust.

## Phase 6: Public Beta

Goal: make UniBalance usable by students outside the initial test group.

Tasks:

- Harden onboarding.
- Add templates for common assessment patterns:
  - weekly quizzes
  - weekly tutorials
  - lab portfolios
  - projects
  - tests
  - TBA final exams
- Add account deletion and data export.
- Improve performance on large course loads.
- Add better prompt/version tracking for AI imports.
- Add a simple landing/sign-in page.

Exit criteria:

- Students can self-serve without a developer present.
- Support load is manageable.
- Data privacy basics are in place.
- The app is stable enough to share more widely.

## Phase 7: Native Apps Revisited

Goal: decide whether iOS/Android apps are worth building.

Native work should restart only after the web app has active users.

Reasons to return to native:

- push notifications are important
- students use the app primarily on phones
- offline support becomes important
- native calendar integrations become necessary

Possible paths:

- keep Capacitor and wrap the web app
- rebuild native screens later
- stay web-only if mobile web is enough

## Immediate Next Sprint

Recommended next tasks:

1. Add an import review screen before saving PDF/link results.
2. Prevent duplicate imported assessments.
3. Add onboarding for first-time users.
4. Improve course detail page editing and mobile layout.
5. Add export/import JSON backup.
6. Decide backend/auth stack.

## Definition Of "Users Can Start Using It"

Students can start using UniBalance when:

- they can sign in
- they can add/import real courses
- imported data can be reviewed and corrected
- their data is stored safely in the cloud
- AI features work from the deployed web app
- grade tracking handles common course structures
- planner recommendations are understandable
- the app works well on laptop and mobile browser
- there is a way to report bugs or feedback

Until then, UniBalance is a strong local MVP, but not a real user-ready product.
