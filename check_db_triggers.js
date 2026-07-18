import pg from 'pg';

const client = new pg.Client({
  host: "db.ylanzkfdjvkjubolcgqq.supabase.co",
  port: 6543,
  user: "postgres",
  password: "Zenos2026DbPass",
  database: "postgres",
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    await client.connect();
    console.log("Conectado ao Supabase.");

    const triggers = await client.query(`
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `);
    console.log("Todas as triggers do schema public:");
    console.log(triggers.rows);

    const authTriggers = await client.query(`
      SELECT trigger_name, event_object_table, action_statement
      FROM information_schema.triggers
      WHERE trigger_schema = 'auth';
    `);
    console.log("Todas as triggers do schema auth:");
    console.log(authTriggers.rows);

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.end();
  }
}

run();
