
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
    // Note: This table might not exist, but we check if we get a proper Supabase response (even if 404 from RLS)
    // instead of a network error.
    if (error && error.code === 'PGRST116') { // Table not found but connected
        return { success: true, message: 'Conectado (Tabela de teste não encontrada, o que é esperado)' };
    }
    if (error) throw error;
    return { success: true, message: 'Conectado com sucesso!' };
  } catch (error: any) {
    console.error('Supabase connection error:', error);
    return { success: false, message: error.message || 'Erro ao conectar ao Supabase' };
  }
}
