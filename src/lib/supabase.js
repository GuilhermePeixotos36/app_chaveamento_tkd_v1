// Redeploy trigger: 2026-02-14 13:10
import { createClient } from '@supabase/supabase-js';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Normalização da URL para evitar erros de fetch
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}
if (supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

console.log('--- DEBUG SUPABASE ---');
console.log('URL definida:', supabaseUrl ? 'SIM' : 'NÃO');
console.log('Chave definida:', supabaseAnonKey ? 'SIM' : 'NÃO');
if (supabaseUrl) console.log('Início da URL:', supabaseUrl.substring(0, 15));

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
