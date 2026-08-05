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
  console.log("=== ALL TRANSACTIONS ON JUNE 9 ===");
  
  // Orders
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*)');
  
  if (oErr) console.error(oErr);
  else {
    const june9Orders = orders.filter(o => {
      const date = o.created_at || o.date;
      return date && date.startsWith('2026-06-09');
    });
    console.log(`Orders (${june9Orders.length}):`);
    june9Orders.forEach(o => {
      console.log(`- ID: ${o.id}, Total: ${o.total}, Paid: ${o.paid_amount}, Cash: ${o.paid_cash}, Wallet: ${o.paid_wallet}, Method: ${o.payment_method}, IsDeleted: ${o.is_deleted}, Notes: ${o.notes}, Created: ${o.created_at}`);
    });
  }

  // Expenses
  const { data: expenses, error: eErr } = await supabase
    .from('expenses')
    .select('*');
  
  if (eErr) console.error(eErr);
  else {
    const june9Expenses = expenses.filter(e => {
      const date = e.created_at || e.date;
      return date && date.startsWith('2026-06-09');
    });
    console.log(`Expenses (${june9Expenses.length}):`);
    june9Expenses.forEach(e => {
      console.log(`- ID: ${e.id}, Category: ${e.category}, Amount: ${e.amount}, Cash: ${e.paid_cash}, Wallet: ${e.paid_wallet}, Method: ${e.payment_method}, Note: ${e.note}, Created: ${e.created_at}`);
    });
  }

  // Purchase Invoices
  const { data: purchases, error: pErr } = await supabase
    .from('purchase_invoices')
    .select('*');
  
  if (pErr) console.error(pErr);
  else {
    const june9Purchases = purchases.filter(p => {
      const date = p.created_at;
      return date && date.startsWith('2026-06-09');
    });
    console.log(`Purchase Invoices (${june9Purchases.length}):`);
    june9Purchases.forEach(p => {
      console.log(`- ID: ${p.id}, Inv: ${p.invoice_number}, Total: ${p.total}, Paid: ${p.paid_amount}, Cash: ${p.paid_cash}, Wallet: ${p.paid_wallet}, Method: ${p.payment_method}, Created: ${p.created_at}`);
    });
  }
}

main().catch(console.error);
