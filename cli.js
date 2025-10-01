const { Command } = require('commander');
const { Pool } = require('pg');
const path = require('path');

// Config connexion PostgreSQL (adapte host/user/password si besoin)
const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'todos',
    password: process.env.PGPASSWORD || 'Azqua_30',
    port: process.env.PGPORT || 5432
});

const program = new Command();

// Créer la table si elle n'existe pas
async function initDB() {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    client.release();
    console.log('DB initialisée.');
  } catch (err) {
    console.error('Erreur init DB:', err);
    process.exit(1);
  }
}

// Ajouter une tâche
async function addTask(title) {
  await initDB();
  try {
    const res = await pool.query('INSERT INTO todos (title) VALUES ($1) RETURNING id', [title]);
    console.log(`Tâche "${title}" ajoutée (ID: ${res.rows[0].id})`);
  } catch (err) {
    console.error('Erreur ajout:', err);
  }
}

// Lister les tâches
async function listTasks() {
  await initDB();
  try {
    const res = await pool.query('SELECT * FROM todos ORDER BY id');
    if (res.rows.length === 0) {
      console.log('Aucune tâche !');
    } else {
      res.rows.forEach(row => {
        const status = row.completed ? '[✓]' : '[ ]';
        console.log(`${status} ${row.id}: ${row.title}`);
      });
    }
  } catch (err) {
    console.error('Erreur list:', err);
  }
}

// Marquer comme done
async function doneTask(id) {
  await initDB();
  try {
    const res = await pool.query('UPDATE todos SET completed = true WHERE id = $1 RETURNING *', [id]);
    if (res.rowCount === 0) {
      console.log(`Tâche ${id} non trouvée.`);
    } else {
      console.log(`Tâche ${id} marquée comme faite.`);
    }
  } catch (err) {
    console.error('Erreur done:', err);
  }
}

// Fermer pool à la fin
process.on('exit', async () => {
  await pool.end();
});

program
  .command('add <title>')
  .description('Ajouter une tâche')
  .action(addTask);

program
  .command('list')
  .description('Lister les tâches')
  .action(listTasks);

program
  .command('done <id>')
  .description('Marquer une tâche comme faite')
  .action(doneTask);

program.parse(process.argv);