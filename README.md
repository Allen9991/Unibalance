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
- development-only Anthropic proxy (shared-service security work remains)
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

Use Node from `.node-version` and the exact pnpm version in `package.json` (`pnpm@10.34.9`). Install with `pnpm install --frozen-lockfile`. Copy `.env.example` to an ignored `.env` and supply a new provider credential locally:

```bash
ANTHROPIC_API_KEY=your_real_anthropic_api_key
```

Start the web app:

```bash
pnpm dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Quality Checks

```bash
pnpm check:secrets
pnpm lint
pnpm test
pnpm test:tooling
pnpm build
```

CI runs these checks on pull requests and `main`. The release workflow creates a static web archive with checksums after rerunning the checks. Hosting is undecided; no deployment runs. The built frontend does not include the development AI/import API. Passing CI does not mean all product workflows are correct or the app is ready for production.

For coordinated agent work, start with [AGENTS.md](AGENTS.md), the [architecture](docs/engineering/architecture.md), and the [agent workflow and local retrieval commands](docs/engineering/agent-workflow.md). Track remaining defects in the [remediation plan](docs/engineering/remediation-plan.md). See [security](docs/engineering/security.md) for credential response and [release artifacts](docs/engineering/releases.md) for packaging and deployment prerequisites.

## Roadmap

See [docs/web-roadmap.md](docs/web-roadmap.md).
