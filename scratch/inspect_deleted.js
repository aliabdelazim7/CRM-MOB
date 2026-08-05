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
  console.log("Checking deleted orders...");
  const { data: deletedOrders, error: e1 } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*)')
    .eq('is_deleted', true);
  
  if (e1) {
    console.error("Error fetching deleted orders:", e1);
  } else {
    console.log(`Found ${deletedOrders.length} deleted orders:`);
    deletedOrders.forEach(o => {
      console.log(`ID: ${o.id}, Invoice: ${o.invoice_number}, Customer: ${o.customer?.name}, Total: ${o.total}, Paid: ${o.paid_amount}, Date: ${o.date}, Wallet: ${o.paid_wallet}, Cash: ${o.paid_cash}, Notes: ${o.notes}`);
    });
  }

  console.log("\nChecking recently created orders on June 9...");
  const { data: june9Orders, error: e2 } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*)')
    .gte('date', '2026-06-09T00:00:00')
    .lte('date', '2026-06-09T23:59:59');

  if (e2) {
    console.error("Error fetching June 9 orders:", e2);
  } else {
    console.log(`Found ${june9Orders.length} orders on June 9:`);
    june9Orders.forEach(o => {
      console.log(`ID: ${o.id}, Invoice: ${o.invoice_number}, Customer: ${o.customer?.name}, Total: ${o.total}, Paid: ${o.paid_amount}, Date: ${o.date}, IsDeleted: ${o.is_deleted}, Wallet: ${o.paid_wallet}, Cash: ${o.paid_cash}, Notes: ${o.notes}`);
    });
  }

  console.log("\nChecking deleted purchase invoices...");
  const { data: deletedPurchases, error: e3 } = await supabase
    .from('purchase_invoices')
    .select('*')
    .eq('is_deleted', true);
  
  if (e3) {
    // If is_deleted column doesn't exist, we'll get an error
    console.log("Deleted purchase invoices error (column might not exist):", e3.message);
  } else {
    console.log(`Found ${deletedPurchases?.length || 0} deleted purchases:`);
    deletedPurchases?.forEach(p => {
      console.log(`ID: ${p.id}, Invoice: ${p.invoice_number}, Supplier: ${p.supplier_name}, Total: ${p.total_amount}, Paid: ${p.paid_amount}`);
    });
  }
}

main().catch(console.error);
