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

console.log("Supabase URL:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findAnomalies() {
  console.log("Checking purchase invoices...");
  const { data: purchases, error: pErr } = await supabase
    .from('purchase_invoices')
    .select('*');
  
  if (pErr) {
    console.error("Error fetching purchases:", pErr);
  } else {
    const anomalousPurchases = purchases.filter(p => 
      p.payment_method === 'cash' && p.paid_wallet > 0
    );
    console.log(`Found ${anomalousPurchases.length} anomalous purchases:`);
    console.log(JSON.stringify(anomalousPurchases.map(p => ({
      id: p.id,
      invoice_number: p.invoice_number,
      payment_method: p.payment_method,
      paid_amount: p.paid_amount,
      paid_cash: p.paid_cash,
      paid_wallet: p.paid_wallet,
      paid_visa: p.paid_visa,
      paid_instapay: p.paid_instapay,
      supplier_name: p.supplier_name,
      created_at: p.created_at
    })), null, 2));
  }

  console.log("\nChecking expenses...");
  const { data: expenses, error: eErr } = await supabase
    .from('expenses')
    .select('*');
  
  if (eErr) {
    console.error("Error fetching expenses:", eErr);
  } else {
    const anomalousExpenses = expenses.filter(e => 
      e.payment_method === 'cash' && e.paid_wallet > 0
    );
    console.log(`Found ${anomalousExpenses.length} anomalous expenses:`);
    console.log(JSON.stringify(anomalousExpenses.map(e => ({
      id: e.id,
      payment_method: e.payment_method,
      amount: e.amount,
      paid_cash: e.paid_cash,
      paid_wallet: e.paid_wallet,
      paid_visa: e.paid_visa,
      paid_instapay: e.paid_instapay,
      note: e.note,
      date: e.date
    })), null, 2));
  }
}

findAnomalies().catch(console.error);
