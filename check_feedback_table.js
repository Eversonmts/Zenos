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

    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'admin_feedback';
    `);
    console.log("Colunas da tabela 'admin_feedback':");
    console.log(cols.rows);

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.end();
  }
}

run();
