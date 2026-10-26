const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
require('dotenv').config();

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files if present
const frontendDir = path.join(__dirname, '../frontend');
if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
}

// Database setup â€” file-based SQLite, zero config, persists between restarts
const db = new Database('bugs.db');

// Create table on first run
db.exec(`
  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    error_message TEXT,
    fix TEXT,
    tags TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bug_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id INTEGER NOT NULL,
    note TEXT NOT NULL,
    author TEXT DEFAULT 'Developer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE
  );
`);

// Health check â€” used to verify the backend is alive after deploy
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CREATE â€” POST /bugs
// Receives bug data from frontend, inserts into DB
// Returns the new record so the UI can append it without re-fetching all bugs
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.post('/bugs', (req, res) => {
  const { title, description, error_message, fix, tags } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const stmt = db.prepare(
    'INSERT INTO bugs (title, description, error_message, fix, tags) VALUES (?, ?, ?, ?, ?)'
  );
  const result = stmt.run(title, description, error_message || '', fix || '', tags || '');
  const newBug = db.prepare('SELECT * FROM bugs WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newBug);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// READ â€” GET /bugs
// Returns all bug logs, newest first
// Called on every page load so the list is always up to date
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.get('/bugs', (req, res) => {
  const bugs = db.prepare('SELECT * FROM bugs ORDER BY created_at DESC').all();
  res.json(bugs);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UPDATE â€” PUT /bugs/:id
// Updates a specific bug by ID with new values
// Falls back to existing values for any field not sent â€” safe partial update
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.put('/bugs/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, error_message, fix, tags } = req.body;

  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Bug not found' });
  }

  db.prepare(
    `UPDATE bugs SET
      title = ?,
      description = ?,
      error_message = ?,
      fix = ?,
      tags = ?
    WHERE id = ?`
  ).run(
    title ?? existing.title,
    description ?? existing.description,
    error_message !== undefined ? error_message : existing.error_message,
    fix !== undefined ? fix : existing.fix,
    tags !== undefined ? tags : existing.tags,
    id
  );

  const updated = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
  res.json(updated);
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DELETE â€” DELETE /bugs/:id
// Permanently removes a bug log by ID
// 204 No Content on success â€” nothing meaningful to return after deletion
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
app.delete('/bugs/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM bugs WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Bug not found' });
  }
  db.prepare('DELETE FROM bugs WHERE id = ?').run(id);
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`Bug Log Tracker backend running on port ${PORT}`);
});
