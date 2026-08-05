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
  const { data: orders } = await supabase.from('orders').select('*, customer:customer_id(*)');
  const { data: expenses } = await supabase.from('expenses').select('*');
  const { data: purchaseInvoices } = await supabase.from('purchase_invoices').select('*');
  const { data: employeeTransactions } = await supabase.from('employee_transactions').select('*');

  let cashTxs = [];

  // Orders
  orders?.filter(o => !o.is_deleted).forEach(o => {
    let cash = o.paid_cash || 0;
    let visa = o.paid_visa || 0;
    let wallet = o.paid_wallet || 0;
    let instapay = o.paid_instapay || 0;
    
    if (cash + visa + wallet + instapay === 0) {
      cash = o.payment_method === 'cash' ? o.paid_amount : 0;
    }
    
    if (cash > 0) {
      cashTxs.push({
        id: o.id,
        source: 'order',
        amount: cash,
        date: o.date || o.created_at,
        notes: o.notes || `Order Total: ${o.total}`
      });
    }
  });

  // Expenses
  expenses?.forEach(e => {
    let cash = Math.abs(e.paid_cash || 0);
    let visa = Math.abs(e.paid_visa || 0);
    let wallet = Math.abs(e.paid_wallet || 0);
    let instapay = Math.abs(e.paid_instapay || 0);
    
    if (cash + visa + wallet + instapay === 0) {
      cash = e.payment_method === 'cash' ? Math.abs(e.amount) : 0;
    }

    if (cash > 0) {
      cashTxs.push({
        id: e.id,
        source: e.amount < 0 ? 'expense-income' : 'expense',
        amount: e.amount < 0 ? cash : -cash,
        date: e.date || e.created_at,
        notes: e.note
      });
    }
  });

  // Purchase Invoices
  purchaseInvoices?.forEach(p => {
    let cash = p.paid_cash || 0;
    let visa = p.paid_visa || 0;
    let wallet = p.paid_wallet || 0;
    let instapay = p.paid_instapay || 0;
    
    if (cash + visa + wallet + instapay === 0) {
      cash = p.payment_method === 'cash' ? p.paid_amount : 0;
    }

    if (cash > 0) {
      cashTxs.push({
        id: p.id,
        source: 'purchase',
        amount: -cash,
        date: p.created_at,
        notes: `Invoice: ${p.invoice_number}, Supplier: ${p.supplier_name || ''}`
      });
    }
  });

  // Employee Transactions
  employeeTransactions?.forEach(et => {
    let cash = et.paid_cash || 0;
    let visa = et.paid_visa || 0;
    let wallet = et.paid_wallet || 0;
    let instapay = et.paid_instapay || 0;
    
    if (cash + visa + wallet + instapay === 0) {
      cash = et.payment_method === 'cash' ? et.amount : 0;
    }

    if (cash > 0) {
      cashTxs.push({
        id: et.id,
        source: 'employee_transaction',
        amount: -cash,
        date: et.created_at,
        notes: et.notes
      });
    }
  });

  cashTxs.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log("=== CASH TRANSACTIONS ===");
  cashTxs.forEach((tx, idx) => {
    console.log(`${idx + 1}. Source: ${tx.source}, Date: ${tx.date}, Amount: ${tx.amount}, Details: ${tx.notes}`);
  });

  const total = cashTxs.reduce((sum, tx) => sum + tx.amount, 0);
  console.log(`\nCalculated Cash Balance: ${total}`);
}

main().catch(console.error);
