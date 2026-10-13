# SystemVerse

A system-design learning workspace built with **React**, **Java 21 / Spring Boot**, and **PostgreSQL**. No authentication.

## Run the full application

Install Docker with Compose, then run from this directory:

```bash
docker compose up --build -d
```

Open **http://localhost:3000**. The frontend proxies `/api` to Spring Boot; Flyway creates the PostgreSQL schema automatically. Data persists in the `postgres_data` Docker volume. Stop with `docker compose down` (keeps data).

## Local development

Requirements: Node.js 22+, Java 21+, Maven 3.9+, and Docker for PostgreSQL.

```bash
docker compose up -d postgres
cd backend
mvn spring-boot:run
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open the Vite URL (normally http://localhost:5173). Vite proxies API requests to localhost:8080. The frontend can also be explored without the backend: it labels this **Local preview**, caches changes in localStorage, and syncs pending changes on a reload when the backend becomes available.

## Included

- Responsive dashboard, HLD and LLD learning paths, topic search and filters.
- 12 lessons with original summaries, reflection exercises and embedded companion tutorials.
- Six Java challenges: parking lot, notification service, vending machine, LRU cache, elevators and expense splitting.
- Java editor, design requirements, hints, solution downloads and saved code.
- Completion tracking, bookmarks, personal notes and anonymous workspace persistence in PostgreSQL.
- Backend validation, versioned database migrations, Dockerfiles and Compose configuration.

Java practice is an editing and design-review workspace. Download `Main.java` and run `java Main.java` locally with Java 21+. There is **no in-browser/server Java execution or automatic grading**; challenge completion is self-assessed.

The starter curriculum is curated, not an exhaustive catalog of all system-design videos. Some topics use the same longer companion course. Study-time estimates describe the lesson, not the exact video duration. Videos remain hosted by their creators and embedding availability may change; every player has a direct YouTube fallback.

## Persistence and API

The browser generates a UUID and sends it as `X-Learner-Id`. This groups workspace data; it is **not authentication or access control**. Clearing browser storage loses the identifier. Local development services bind to loopback. No login, user accounts, or Spring Security are included.

| Endpoint              | Behavior                                      |
| --------------------- | --------------------------------------------- |
| `GET /api/health`     | Database readiness                            |
| `GET /api/catalog`    | Lessons and Java challenges                   |
| `GET /api/state`      | State for `X-Learner-Id`                      |
| `PUT /api/state/{id}` | Upsert `{completed, bookmarked, notes, code}` |

Configuration: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`. Compose accepts `POSTGRES_PASSWORD` (defaults to `systemverse` for local development).

Catalog source: `backend/src/main/resources/catalog.json`; the frontend ships a matching `frontend/src/catalog.json` for offline preview. Update both together. Lesson `video` values are YouTube video IDs. Progress and solutions live in PostgreSQL; the editorial catalog is versioned in source.

## Verification

### Continuous integration

[SystemVerse CI](.github/workflows/ci.yml) runs on every push to any branch,
on pull requests, and manually from the GitHub Actions tab. Each push checks
the pushed revision; commits that remain only on your machine do not trigger CI.

Two independent jobs must pass:

- **Frontend build:** Node.js 22, `npm ci`, and the production React/Vite build.
- **Backend build and tests:** Temurin Java 21 and `mvn --batch-mode --no-transfer-progress clean verify`, including compilation, enabled tests, and executable JAR packaging.

Dependency caches speed up subsequent runs. No repository secrets or running
database are needed for these build checks. PostgreSQL uses an upstream image
and has no application source to compile. These checks do not exercise database
startup or deploy the application.

`LearningControllerTest.java` exercises the controller and real service with a
mocked database. Its six tests run automatically in the backend CI job.

After committing and pushing the workflow, inspect results in the repository's
**Actions** tab. To prevent merging broken builds, configure the branch rules
to require **Frontend build** and **Backend build and tests**.

Action setup references: [setup-node](https://github.com/actions/setup-node)
and [setup-java](https://github.com/actions/setup-java).

### Local checks

```bash
npm run build --prefix frontend
mvn -f backend/pom.xml test
```

API tests cover catalog structure, invalid IDs, unknown lessons, payload limits, scoped reads, and writes. A real PostgreSQL smoke test can be run against a running backend:

```bash
python3 scripts/smoke_test.py
```

## Video sources

- [Software System Design for Beginners — freeCodeCamp / Gaurav Sen](https://www.freecodecamp.org/news/software-system-design-for-beginners/)
- [Load balancers — ByteByteGo](https://www.youtube.com/watch?v=LQuuoHTyYz8)
- [SOLID with Java examples — Geekific](https://www.youtube.com/watch?v=HoA6aZPR5K0)
- [Java Design Patterns tutorial](https://www.youtube.com/watch?v=VNyyC2IOvFo)

The full application requires a Java/PostgreSQL host. It is not deployed to Sites, whose runtime does not host Spring Boot.

Verified during implementation: production frontend build; all six backend tests; real PostgreSQL migrations, inserts, updates and workspace isolation; Chromium desktop/mobile walkthrough covering notes, bookmarks, progress, Java solution persistence, search, hints and offline synchronization. Embedded player presence and source links were checked; third-party video playback is controlled by YouTube.
