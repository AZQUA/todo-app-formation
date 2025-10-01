const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');


const app = express();
const PORT = 3000;

// Config Pool PostgreSQL (adapte password si tu as changé)
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'todos',
  password: 'Azqua_30',  // Ton mot de passe PG !
  port: 5432,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));  // Pour servir le front (HTML/JS/CSS)

// Init DB (crée table si absente)
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('DB PostgreSQL initialisée.');
  } catch (err) {
    console.error('Erreur init DB:', err);
    process.exit(1);
  }
}

// GET /api/todos - Lister les tâches
app.get('/api/todos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM todos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/todos - Ajouter une tâche
app.post('/api/todos', async (req, res) => {
  const { title } = req.body;
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title requis et non vide' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed',
      [title.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/todos/:id - Marquer comme done
app.put('/api/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const result = await pool.query(
      'UPDATE todos SET completed = true WHERE id = $1 RETURNING id, title, completed',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/todos/:id - Supprimer
app.delete('/api/todos/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: 'ID invalide' });
  try {
    const result = await pool.query('DELETE FROM todos WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    res.json({ message: 'Tâche supprimée' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route racine : Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Lancement
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Serveur Todo App sur http://localhost:${PORT}`);
    console.log(`API prête. Teste avec curl ou navigateur.`);
  });
}).catch(err => {
  console.error('Erreur démarrage serveur:', err);
  process.exit(1);
});

// Fermeture propre du pool
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Pool DB fermé.');
  process.exit(0);
});