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
  console.log("Fetching orders with paid_amount/total = 205...");
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*)')
    .or('total.eq.205,paid_amount.eq.205');
  
  if (error) {
    console.error(error);
  } else {
    orders.forEach(o => {
      console.log(`ID: ${o.id}, Total: ${o.total}, Paid: ${o.paid_amount}, Cash: ${o.paid_cash}, Wallet: ${o.paid_wallet}, Method: ${o.payment_method}, IsDeleted: ${o.is_deleted}, Notes: ${o.notes}, Created: ${o.created_at}`);
    });
  }
}

main().catch(console.error);
