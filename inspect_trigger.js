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

    // 1. Listar triggers na tabela transactions
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'transactions';
    `);
    console.log("\nTriggers na tabela 'transactions':");
    console.log(triggers.rows);

    // 2. Obter a definição da função do trigger de rateio
    const funcDef = await client.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname = 'handle_auto_revenue_apportionment';
    `);
    console.log("\nDefinição da função 'handle_auto_revenue_apportionment':");
    if (funcDef.rows.length > 0) {
      console.log(funcDef.rows[0].prosrc);
    } else {
      console.log("Nenhuma função com o nome 'handle_auto_revenue_apportionment' encontrada!");
    }

  } catch (err) {
    console.error("Erro ao inspecionar triggers:", err);
  } finally {
    await client.end();
  }
}

run();
