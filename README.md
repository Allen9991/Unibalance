# UniBalance

UniBalance is a web-first study and life-balance app for university students. The current goal is to make the web app reliable enough for real students to use before returning to iOS or Android builds.

## Current Direction

We are focusing on the web app only for now.

Native iOS and Android work is paused until:

- core web workflows are stable
- bugs from real use are fixed
- the app has a backend and accounts
- a small group of students can use it successfully on the web

## Current App State

The app currently supports:

- local React/Vite web app
- local persistence in browser storage
- secure local Anthropic proxy
- course creation and editing
- course import from a university course-outline link
- course-outline PDF upload/import
- focused course detail pages
- assessment editing/deleting
- recurring weekly quizzes/tutorials
- best-of grading, such as best 10 of 12
- split tutorial marks, such as attendance plus completed work
- current grade tracking
- study-hour targets
- planner blocks around fixed commitments
- Pomodoro/session logging against assessments
- strategic recommendations:
  - best next hour
  - drop safety
  - minimum viable week
  - procrastination judo
- AI assistant grounded in current app state
- academic key dates and exam-window awareness

## Run Locally

Create `.env`:

```bash
ANTHROPIC_API_KEY=your_real_anthropic_api_key
```

Start the web app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Quality Checks

```bash
npm test
npm run build
```

## Roadmap

See [docs/web-roadmap.md](docs/web-roadmap.md).
