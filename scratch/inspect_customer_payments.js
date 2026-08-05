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
  const customerId = 'd205f7f1-5a95-4cd6-a006-44233c8a437a';
  
  console.log("Checking customer details...");
  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();
  
  if (cErr) {
    console.error("Error fetching customer:", cErr);
  } else {
    console.log("Customer:", customer);
  }

  console.log("\nChecking all orders for this customer (including deleted ones)...");
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });

  if (oErr) {
    console.error("Error fetching orders:", oErr);
  } else {
    orders.forEach(o => {
      console.log(`ID: ${o.id}, Total: ${o.total}, Paid: ${o.paid_amount}, Cash: ${o.paid_cash}, Wallet: ${o.paid_wallet}, Method: ${o.payment_method}, IsDeleted: ${o.is_deleted}, Notes: ${o.notes}, CreatedAt: ${o.created_at}`);
    });
  }
}

main().catch(console.error);
