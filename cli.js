const { Command } = require(`commander`);
const { Pool } = require(`pg`);
const path = require(`path`);
const readlineSync = require(`readline-sync`);

// Config connexion PostgreSQL (adapte host/user/password si besoin)
const pool = new Pool({
  user: process.env.PGUSER || `postgres`,
  host: process.env.PGHOST || `localhost`,  // Docker: `db`, local: `localhost`
  database: process.env.PGDATABASE || `todos`,
  password: process.env.PGPASSWORD || `Azqua_30`,  // Local: `password`, Docker: `postgres`
  port: process.env.PGPORT || 5432,
});

const program = new Command();

// Créer la table si elle n`existe pas
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
    console.log(`DB initialisée.`);
  } catch (err) {
    console.error(`Erreur init DB:`, err);
    process.exit(1);
  }
}

// Ajouter une tâche
async function addTask(title) {
  await initDB();
  try {
    const res = await pool.query(`INSERT INTO todos (title) VALUES ($1) RETURNING id`, [title]);
    console.log(`Tâche "${title}" ajoutée (ID: ${res.rows[0].id})`);
  } catch (err) {
    console.error(`Erreur ajout:`, err);
  }
}

// Lister les tâches
async function listTasks() {
  await initDB();
  try {
    const res = await pool.query(`SELECT * FROM todos ORDER BY id`);
    if (res.rows.length === 0) {
      console.log(`Aucune tâche !`);
    } else {
      res.rows.forEach(row => {
        const status = row.completed ? `[✓]` : `[ ]`;
        console.log(`${status} ${row.id}: ${row.title}`);
      });
    }
  } catch (err) {
    console.error(`Erreur list:`, err);
  }
}

// Marquer comme done
async function doneTask(id) {
  await initDB();
  try {
    const res = await pool.query(`UPDATE todos SET completed = true WHERE id = $1 RETURNING *`, [id]);
    if (res.rowCount === 0) {
      console.log(`Tâche ${id} non trouvée.`);
    } else {
      console.log(`Tâche ${id} marquée comme faite.`);
    }
  } catch (err) {
    console.error(`Erreur done:`, err);
  }
}

async function deleteTask(id) {
  await initDB();
  if (!id || isNaN(parseInt(id))) {
    console.error(`Erreur: ID numérique requis. Usage: node cli.js delete 1`);
    return;
  }
  const taskId = parseInt(id);
  try {
    const checkRes = await pool.query(`SELECT title FROM todos WHERE id = $1`, [taskId]);
    if (checkRes.rowCount === 0){
      console.log(`Tâche ${taskId} non trouvée.`)
      return;
    }
    const title = checkRes.rows[0].title;
    console.log(`Confirmez la suppression de "${title}" ? (y/N): `);
    const confirmation = readlineSync.question().toLowerCase().trim();
    if (confirmation === `y` || confirmation === `o` || confirmation === `yes` || confirmation === `oui`) {
      const deleteRes = await pool.query(`DELETE FROM todos WHERE id = $1`, [taskId]);
      if (deleteRes.rowCount === 1) {
        console.log(`Tâche ${taskId} (" ${title} ") supprimée avec succès !`);
      } else {
        console.error(`Erreur: Suppression échouée (tâche déjà supprimée ?).`);
      }
    } else {
      console.log(`Suppression annulée par l\'utilisateur.`);
    }
  } catch (err) {
    console.error(`Erreur lors de la suppression:`, err.message);
  }
}

// Fermer pool à la fin
process.on(`exit`, async () => {
  await pool.end();
});

program
  .command(`add <title>`)
  .description(`Ajouter une tâche`)
  .action(addTask);

program
  .command(`list`)
  .description(`Lister les tâches`)
  .action(listTasks);

program
  .command(`done <id>`)
  .description(`Marquer une tâche comme faite`)
  .action(doneTask);

program
  .command(`delete <id>`)
  .description(`Supprimer une tâche (avec confirmation)`)
  .action(deleteTask);

program.parse(process.argv);