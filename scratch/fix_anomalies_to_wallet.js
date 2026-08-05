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
  // 1. Purchase Invoices
  const purchaseIds = [
    "b84023bc-cdd1-4320-89a9-90247b4893ff",
    "f7753b49-94c2-4e69-aa22-91a60a4ac78d",
    "76fe202b-75a4-45a7-bf66-7c0d39578434",
    "046862ab-ad10-4784-8790-e32b72eea22c"
  ];

  console.log("Updating purchase invoices to wallet...");
  for (const id of purchaseIds) {
    const { data: fetchRes, error: fetchErr } = await supabase
      .from('purchase_invoices')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchErr) {
      console.error(`Error fetching purchase ${id}:`, fetchErr);
      continue;
    }

    const { data: updateRes, error: updateErr } = await supabase
      .from('purchase_invoices')
      .update({
        paid_cash: 0,
        paid_wallet: fetchRes.paid_amount,
        payment_method: 'wallet'
      })
      .eq('id', id)
      .select();

    if (updateErr) {
      console.error(`Error updating purchase ${id}:`, updateErr);
    } else {
      console.log(`Successfully updated purchase invoice ${fetchRes.invoice_number} to wallet`);
    }
  }

  // 2. Expenses
  const expenseIds = [
    "297abf83-859d-4893-b5a8-9d1050734e35",
    "fb1c01a8-d7fb-4221-b596-a7063979e43e",
    "eaa076a1-845e-4eb7-83df-926c513dbb23"
  ];

  console.log("\nUpdating expenses to wallet...");
  for (const id of expenseIds) {
    const { data: fetchRes, error: fetchErr } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchErr) {
      console.error(`Error fetching expense ${id}:`, fetchErr);
      continue;
    }

    const { data: updateRes, error: updateErr } = await supabase
      .from('expenses')
      .update({
        paid_cash: 0,
        paid_wallet: Math.abs(fetchRes.amount),
        payment_method: 'wallet'
      })
      .eq('id', id)
      .select();

    if (updateErr) {
      console.error(`Error updating expense ${id}:`, updateErr);
    } else {
      console.log(`Successfully updated expense ID: ${id} to wallet`);
    }
  }

  console.log("\nFinished database corrections!");
}

main().catch(console.error);
