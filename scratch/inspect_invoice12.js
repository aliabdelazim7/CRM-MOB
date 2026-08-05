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
  console.log("Fetching order 12...");
  const { data: order12, error: e1 } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*)')
    .eq('id', '12')
    .single();
  
  if (e1) console.error(e1);
  else console.log("Order 12:", order12);

  console.log("\nFetching all transactions with notes containing '#12'...");
  const { data: txs, error: e2 } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*)')
    .like('notes', '%#12%');
  
  if (e2) console.error(e2);
  else {
    txs.forEach(t => {
      console.log(`ID: ${t.id}, Total: ${t.total}, Paid: ${t.paid_amount}, Cash: ${t.paid_cash}, Wallet: ${t.paid_wallet}, Method: ${t.payment_method}, IsDeleted: ${t.is_deleted}, Notes: ${t.notes}, Created: ${t.created_at}`);
    });
  }
}

main().catch(console.error);
