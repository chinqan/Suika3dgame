/**
 * Leaderboard API Server — GDD Ch.8
 * Express + SQLite (better-sqlite3)
 */
import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 7860;
const HOST = process.env.HOST || '0.0.0.0';

// ---- Database ----
const db = new Database(join(__dirname, 'scores.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL DEFAULT 'guest',
    score INTEGER NOT NULL,
    difficulty TEXT DEFAULT 'normal',
    play_time INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const insertStmt = db.prepare(
  'INSERT INTO scores (player_id, score, difficulty, play_time) VALUES (?, ?, ?, ?)'
);
const selectStmt = db.prepare(
  'SELECT player_id, score, difficulty, play_time, created_at FROM scores ORDER BY score DESC LIMIT 50'
);

// ---- Express ----
const app = express();
app.use(express.json());

// POST /api/scores
app.post('/api/scores', (req, res) => {
  try {
    const { player_id = 'guest', score = 0, difficulty = 'normal', play_time = 0 } = req.body;
    insertStmt.run(String(player_id).slice(0, 16), Number(score), String(difficulty), Number(play_time));
    res.json({ ok: true });
  } catch (err) {
    console.error('Error inserting score:', err);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// GET /api/scores
app.get('/api/scores', (_req, res) => {
  try {
    const rows = selectStmt.all();
    res.json(rows);
  } catch (err) {
    console.error('Error fetching scores:', err);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
});

// Start
app.listen(Number(PORT), String(HOST), () => {
  console.log(`[Leaderboard API] http://${HOST}:${PORT}`);
});
