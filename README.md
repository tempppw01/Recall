# Recall

> AI-first todo app for capturing, planning, and actually finishing work.

Recall is a lightweight task manager focused on one thing: **reducing friction between “I need to do this” and “I’ve started doing it.”**

It combines fast task capture, practical AI assistance, and a clean day-to-day workflow, so you spend less time maintaining a system and more time moving things forward.

---

## ✨ What Recall is for

Most todo apps become powerful by becoming heavy.
Recall goes in the opposite direction:

- **Fast to capture** — write tasks the way you naturally think
- **Practical to manage** — prioritize, schedule, filter, and review without getting buried in settings
- **AI that helps with real work** — not just chat for the sake of chat
- **Local-first by default** — usable with minimal setup, with optional server-side capabilities when needed

In short: **Recall helps you focus on execution, not tool maintenance.**

---

## 🖼️ Screenshots

<img width="1168" height="730" alt="Recall screenshot 1" src="https://github.com/user-attachments/assets/47cd9f50-391a-4243-99b7-ad8440fa2627" />
<img width="1164" height="733" alt="Recall screenshot 2" src="https://github.com/user-attachments/assets/7ae8d841-db94-417a-a688-96398784d4fd" />
<img width="1169" height="741" alt="Recall screenshot 3" src="https://github.com/user-attachments/assets/5b309f57-9365-471f-b837-6c71dba34e3c" />

---

## 🚀 Core features

- **Natural language capture**  
  Type things like “Remind me tomorrow at 3pm to call the client” and turn them into structured tasks quickly.

- **Full task workflow**  
  Create, complete, pin, prioritize, filter, sort, tag, group into lists, and break work into subtasks.

- **Unified due-date shortcuts**  
  Quickly set tasks to today, tomorrow, tonight, or next Monday 9:00 with minimal clicks.

- **Compact task editing**  
  Edit dates and times directly from task cards with a lightweight inline picker.

- **Pomodoro mode with floating widget**  
  Stay focused with a timer that keeps running across views, supports floating display, dragging, docking, collapsing, and completion highlights.

- **Habits and countdowns**  
  Covers common personal productivity scenarios beyond simple task lists.

- **AI assistants built into the workflow**
  - **Todo Agent** for turning rough input into actionable tasks
  - **Manage Agent** for surfacing priorities and suggesting one-click actions

- **Local-first storage**  
  Works out of the box with LocalStorage, with optional Redis / PostgreSQL / WebDAV support depending on your setup.

- **PWA support**  
  Installable, cacheable, and notification-friendly.

---

## 🧠 AI workflow

Recall currently includes two practical AI roles:

### 1) Todo Agent
Best for:
- converting natural language into tasks
- splitting vague ideas into actionable items
- helping you capture faster with less manual editing

### 2) Manage Agent
Best for:
- identifying what deserves attention now
- recommending priority changes
- surfacing overdue or important tasks
- offering direct actions from recommendation cards

Supported quick actions include:
- `suggestedPriority` → one-click priority update
- `suggestedPinned` → one-click pin / unpin
- `suggestedDuePreset` → one-click set to today / tomorrow / tonight / next week

These actions reuse the existing task update flow rather than creating a separate write path, which keeps behavior consistent and predictable.

---

## 🧱 Tech stack

- **Next.js** (App Router)
- **React 18** + **TypeScript**
- **Tailwind CSS** + **Lucide Icons**
- **Prisma** (optional database layer)
- **Redis** (optional sync / queue capability)
- **WebDAV** (optional attachment storage)

---

## 🛠️ Local development

```bash
npm install
npm run dev
```

Default local address:

```bash
http://localhost:3000
```

Type check:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

---

## 🐳 Docker deployment

### Docker Hub image

Image:

```bash
34v0wphix/recall
```

Run directly:

```bash
docker pull 34v0wphix/recall:latest

docker run -d \
  --name recall_app \
  -p 3789:3789 \
  --restart always \
  34v0wphix/recall:latest
```

Open:

```bash
http://<your-server-ip>:3789
```

Health checks:

```bash
curl -fsS http://localhost:3789/api/health
curl -fsS http://localhost:3789/api/health?deep=1
```

> If `NEXTAUTH_SECRET` is not provided, the container can generate a temporary secret so the app still starts. For production, set it explicitly.

### Docker Compose example

#### Option A: with local PostgreSQL

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    profiles: ["local-db"]
    environment:
      POSTGRES_DB: recall
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  app:
    image: 34v0wphix/recall:latest
    restart: always
    ports:
      - "3789:3789"
    environment:
      NEXTAUTH_URL: http://localhost:3789
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-}
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/recall
```

```bash
docker compose --profile local-db up -d
```

#### Option B: with remote PostgreSQL

```yaml
version: '3.8'

services:
  app:
    image: 34v0wphix/recall:latest
    restart: always
    ports:
      - "3789:3789"
    environment:
      NEXTAUTH_URL: http://localhost:3789
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:-}
      DATABASE_URL: postgresql://USERNAME:PASSWORD@REMOTE_HOST:5432/recall
```

```bash
docker compose up -d
```

You can also compose your database config with:

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

---

## ⚙️ Environment variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | API key for AI features | - |
| `OPENAI_BASE_URL` | AI endpoint base URL | `https://ai.shuaihong.fun/v1` |
| `EMBEDDING_PROVIDER` | Embedding provider (`openai` / `local`) | `openai` |
| `NEXTAUTH_URL` | Public app URL for auth | `http://localhost:3789` |
| `NEXTAUTH_SECRET` | NextAuth secret | - |
| `DATABASE_URL` | Server-side database URL | `postgresql://postgres:postgres@postgres:5432/recall` |
| `REDIS_HOST` | Redis host | - |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_DB` | Redis database index | `0` |
| `REDIS_PASSWORD` | Redis password | - |

> The current default server-side persistence path is **PostgreSQL**. Browser-side LocalStorage behavior is still preserved for lightweight usage.

---

## 🐘 Database notes

Recall’s server-side persistence uses Prisma + PostgreSQL by default.
More details: `docs/plan/database.md`

### Quick init

```bash
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/recall'
npx prisma generate
npx prisma db push
```

### Quick check

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:5432/recall' ./scripts/db-check.sh
```

### Dynamic PG mode

Recall still supports a dynamic PostgreSQL mode via `x-pg-*` headers, but this is intentionally restricted:

- disabled by default
- requires `ENABLE_DYNAMIC_PG_HEADERS=true`
- only works for **unauthenticated** requests
- authenticated sessions always prefer the server database

Recommended when enabling:
- `PG_HEADERS_TOKEN`
- `PG_HEADERS_HOST_ALLOWLIST`

Use this only in trusted self-hosted environments.

---

## 🗺️ Roadmap

- stronger search / embedding resilience
- better multi-device sync and account support
- smoother mobile interactions and performance
- more reliable and more explainable AI assistance

---

## 🤝 Contributing

Issues, suggestions, and PRs are welcome.

Recommended commit prefixes:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code restructuring
- `chore:` tooling / maintenance

If you want to help shape a faster, cleaner, more practical AI todo experience, feel free to join in.

---

## 📄 License

MIT
