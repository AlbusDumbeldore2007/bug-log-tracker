# Bug Log Tracker

## What It Is
A web app to log and manage bugs you encounter while learning to code so you can reference them later instead of Googling the same error twice.

## The Problem It Solves
Every time I hit a tricky bug while learning, I would fix it, move on, and forget what caused it — then waste another 30 minutes when the same error appeared again. This app records every bug, error message, and working fix so I always have a personal searchable bug history to unblock myself immediately.

## What I Intentionally Excluded
- **User authentication** — adding login would require sessions or JWT tokens, significantly increasing complexity for an MVP I only need one person to use.
- **Search/filter query layer** — full-text search across bug logs would require FTS5 SQLite extensions or a more complex query layer; not needed for an MVP with a small number of entries.

## Tech Stack
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** Vanilla HTML + CSS + JavaScript (zero build step)
- **Database:** SQLite (file-based persistence)
- **Deployed:** Render (backend) + Netlify / GitHub Pages (frontend)

## Live Deployment
**Frontend:** https://albusdumbeldore2007.github.io/bug-log-tracker/
**Backend:** https://bug-log-tracker.onrender.com

> ⚠️ The Render free tier sleeps after 15 minutes of inactivity. The frontend shows an animated loading spinner during the 30–60 second cold start so users know the server is waking up.

## Running Locally

```bash
# 1. Start the Backend
cd backend
npm install
node server.js
# Backend runs at http://localhost:3000
# Health check: http://localhost:3000/health

# 2. Open the Frontend
# Open frontend/index.html in any browser
```

## API Routes (CRUD)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check endpoint returning `{ status: 'ok' }` |
| POST | `/bugs` | **Create** a new bug log with title, description, error message, fix, and tags |
| GET | `/bugs` | **Read** all bug logs ordered by newest first |
| PUT | `/bugs/:id` | **Update** an existing bug log by ID |
| DELETE | `/bugs/:id` | **Delete** a bug log permanently by ID |

## Data Model

```sql
CREATE TABLE bugs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  error_message TEXT,
  fix           TEXT,
  tags          TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bug_notes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  bug_id        INTEGER NOT NULL,
  note          TEXT NOT NULL,
  author        TEXT DEFAULT 'Developer',
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE
);
```
