import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Static files from Vite build
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SQLite Database setup
const dbPath = path.join(__dirname, 'db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to SQLite database');
    db.run(`
      CREATE TABLE IF NOT EXISTS flows (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Save flow data
app.post('/api/flows', (req, res) => {
  const { nodes, edges } = req.body;
  if (!nodes || !edges) {
    return res.status(400).json({ error: 'Nodes and edges are required' });
  }

  const id = uuidv4().split('-')[0]; // Use a shorter ID for sharing
  const data = JSON.stringify({ nodes, edges });

  db.run('INSERT INTO flows (id, data) VALUES (?, ?)', [id, data], function(err) {
    if (err) {
      console.error('Error saving flow', err);
      return res.status(500).json({ error: 'Failed to save flow' });
    }
    res.json({ id });
  });
});

// Load flow data
app.get('/api/flows/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT data FROM flows WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error loading flow', err);
      return res.status(500).json({ error: 'Failed to load flow' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json(JSON.parse(row.data));
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
