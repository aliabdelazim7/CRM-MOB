import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env manually
const envPath = path.resolve(process.cwd(), '.env');
const envConfig = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    acc[key.trim()] = value.join('=').trim();
  }
  return acc;
}, {});

const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const supabaseAnonKey = envConfig['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const { data: exp, error: e1 } = await supabase.from('expenses').select('*').limit(1);
  if (e1) console.error("Expenses error:", e1);
  else console.log("Expenses row keys:", exp.length > 0 ? Object.keys(exp[0]) : "Empty table");

  const { data: pur, error: e2 } = await supabase.from('purchase_invoices').select('*').limit(1);
  if (e2) console.error("Purchases error:", e2);
  else console.log("Purchases row keys:", pur.length > 0 ? Object.keys(pur[0]) : "Empty table");
}

main().catch(console.error);
