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

    const rls = await client.query(`
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE tablename = 'pots';
    `);
    console.log("Status de RLS da tabela 'pots':");
    console.log(rls.rows);

    const policies = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'pots';
    `);
    console.log("Políticas de RLS da tabela 'pots':");
    console.log(policies.rows);

    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'pots';
    `);
    console.log("Triggers da tabela 'pots':");
    console.log(triggers.rows);

  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await client.end();
  }
}

run();
