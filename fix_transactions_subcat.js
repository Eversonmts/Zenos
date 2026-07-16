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

    console.log("Adicionando coluna subcategory_id à tabela public.transactions...");
    await client.query(`
      ALTER TABLE public.transactions 
      ADD COLUMN IF NOT EXISTS subcategory_id UUID REFERENCES public.subcategories(id) ON DELETE SET NULL;
    `);
    console.log("Coluna subcategory_id adicionada com sucesso!");

  } catch (err) {
    console.error("Erro ao alterar a tabela transactions:", err.message);
  } finally {
    await client.end();
  }
}

run();
