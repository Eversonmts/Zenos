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

    const func = await client.query(`
      SELECT routine_definition 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name = 'handle_new_user';
    `);
    console.log("Definição de handle_new_user:");
    console.log(func.rows[0]?.routine_definition);

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.end();
  }
}

run();
