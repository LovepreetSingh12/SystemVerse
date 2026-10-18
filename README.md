# SystemVerse

A system-design learning workspace built with **React**, **Java 21 / Spring Boot**, and **PostgreSQL**. Firebase Authentication with Google, email/password, and phone OTP.

## Run the full application

Configure Firebase Authentication as described below, then install Docker with Compose and run from this directory:

```bash
docker compose up --build -d
```

Open **http://localhost:3000**. The frontend proxies `/api` to Spring Boot; Flyway creates the PostgreSQL schema automatically. Data persists in the `postgres_data` Docker volume. Stop with `docker compose down` (keeps data).

## Local development

Requirements: Node.js 22+, Java 21+, Maven 3.9+, and Docker for PostgreSQL.

```bash
docker compose up -d postgres
cd backend
FIREBASE_PROJECT_ID=your-project-id mvn spring-boot:run
```

In another terminal:

```bash
cd frontend
npm ci
cp .env.example .env.local # Fill in Firebase web app configuration
npm run dev
```

Open the Vite URL (normally http://localhost:5173). Vite proxies API requests to localhost:8080. Sign in to open your workspace. When the backend is unavailable, changes are cached per account in localStorage and sync on reload. Firebase must be reachable for sign-in.

## Authentication setup

1. Create a Firebase project and register a Web app in Project settings. Copy its configuration into `frontend/.env.local` using `frontend/.env.example`. For Docker Compose, copy the root `.env.example` to `.env` and fill it in instead.
2. In Firebase Authentication → Sign-in method, enable **Google**, **Email/Password**, and **Phone**. Configure the Google support email, SMS region policy, and any required SMS billing. Set a password policy (at least 8 characters) and enable email enumeration protection.
3. Add your deployment hostname to Authentication → Settings → Authorized domains. Add `localhost` explicitly for local email/Google development. For phone testing, use Firebase's fictional test numbers/codes and an authorized hosted domain; see [Firebase phone authentication setup](https://firebase.google.com/docs/auth/web/phone-auth) for domain and reCAPTCHA requirements. Production SMS uses reCAPTCHA and provider quotas; no codes are generated or logged by this app.
4. Set backend `FIREBASE_PROJECT_ID` to the same project used by the frontend. Docker Compose passes it automatically from the root `.env`. Restart the backend and rebuild the frontend after configuration changes. Vite embeds its configuration at build time.

Google uses a sign-in popup. Email supports registration, login, and password reset. Phone uses an SMS OTP (no phone/password flow). Firebase manages passwords, SMS verification, session persistence, and token refresh. Its web app configuration is public client configuration; never place service-account private keys in `VITE_*` variables. No Firebase Admin credentials are required. The frontend pins a patched `@grpc/grpc-js` range through an npm override because Firebase also installs the unused Firestore dependency tree.

The backend verifies RS256 signatures with Google's published keys and checks issuer, audience, expiry, issue/authentication time, and subject, following [Firebase token verification requirements](https://firebase.google.com/docs/auth/admin/verify-id-tokens). Protected requests require `Authorization: Bearer <Firebase ID token>`. Without configuration, protected endpoints remain locked and the UI displays setup status. Health and catalog remain public. Serve deployments over HTTPS.

Workspace IDs are derived from the verified issuer and Firebase UID; caller-supplied `X-Learner-Id` headers are ignored. Different provider accounts have separate workspaces unless linked in Firebase; automatic account linking is not implemented. Old anonymous workspaces are retained in PostgreSQL but are not automatically claimed, because their browser IDs are not proof of ownership. Old anonymous browser caches are not imported.

Sign-out clears the Firebase session and returns to the login screen. Offline workspace caches remain on that browser, scoped by UID; clear site data on shared devices to remove those copies. Bearer tokens already issued remain valid until their expiration (typically one hour); server-side revocation checking is not implemented.

## Included

- Responsive dashboard, HLD and LLD learning paths, topic search and filters.
- 12 lessons with original summaries, reflection exercises and embedded companion tutorials.
- Six Java challenges: parking lot, notification service, vending machine, LRU cache, elevators and expense splitting.
- Java editor, design requirements, hints, solution downloads and saved code.
- Completion tracking, bookmarks, personal notes and authenticated per-account persistence in PostgreSQL.
- Backend validation, versioned database migrations, Dockerfiles and Compose configuration.

Java practice is an editing and design-review workspace. Download `Main.java` and run `java Main.java` locally with Java 21+. There is **no in-browser/server Java execution or automatic grading**; challenge completion is self-assessed.

The starter curriculum is curated, not an exhaustive catalog of all system-design videos. Some topics use the same longer companion course. Study-time estimates describe the lesson, not the exact video duration. Videos remain hosted by their creators and embedding availability may change; every player has a direct YouTube fallback.

## Persistence and API

Learning state is scoped to the verified Firebase account.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Public database readiness |
| `GET /api/catalog` | Public lessons and Java challenges |
| `GET /api/state` | Authenticated account state |
| `PUT /api/state/{id}` | Authenticated upsert of `{completed, bookmarked, notes, code}` |

Configuration: `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `FIREBASE_PROJECT_ID`. Compose accepts `POSTGRES_PASSWORD` (defaults to `systemverse` for local development).

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
mocked database. Authentication and token-claim tests also run automatically in the backend CI job.

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

API tests cover catalog structure, missing/invalid authentication, spoofed workspace headers, unknown lessons, payload limits, account-scoped reads, and writes. Token tests cover issuer, audience, expiry, and required claims. A real PostgreSQL smoke test can be run against a running backend:

```bash
# Supply fresh ID tokens for two distinct, dedicated test accounts.
# This writes the first account’s practice-1 state.
export SYSTEMVERSE_TEST_TOKEN=...
export SYSTEMVERSE_OTHER_TEST_TOKEN=...
python3 scripts/smoke_test.py
```

## Video sources

- [Software System Design for Beginners — freeCodeCamp / Gaurav Sen](https://www.freecodecamp.org/news/software-system-design-for-beginners/)
- [Load balancers — ByteByteGo](https://www.youtube.com/watch?v=LQuuoHTyYz8)
- [SOLID with Java examples — Geekific](https://www.youtube.com/watch?v=HoA6aZPR5K0)
- [Java Design Patterns tutorial](https://www.youtube.com/watch?v=VNyyC2IOvFo)

The full application requires a Java/PostgreSQL host. It is not deployed to Sites, whose runtime does not host Spring Boot.

Live Google/SMS/email flows require a configured Firebase project and are not exercised by CI. Manually verify each provider, password reset, logout/relogin, and switching between two accounts before deployment.
