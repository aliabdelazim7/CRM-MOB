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
  const { data: orders, error: e1 } = await supabase.from('orders').select('*, customer:customer_id(*)');
  const { data: expenses, error: e2 } = await supabase.from('expenses').select('*');
  const { data: purchaseInvoices, error: e3 } = await supabase.from('purchase_invoices').select('*');
  const { data: employeeTransactions, error: e4 } = await supabase.from('employee_transactions').select('*');

  let walletTxs = [];

  // Orders
  orders?.filter(o => !o.is_deleted).forEach(o => {
    let cash = o.paid_cash || 0;
    let visa = o.paid_visa || 0;
    let wallet = o.paid_wallet || 0;
    let instapay = o.paid_instapay || 0;
    
    if (cash + visa + wallet + instapay === 0) {
      cash = o.payment_method === 'cash' ? o.paid_amount : 0;
      visa = o.payment_method === 'visa' ? o.paid_amount : 0;
      wallet = o.payment_method === 'wallet' ? o.paid_amount : 0;
      instapay = o.payment_method === 'instapay' ? o.paid_amount : 0;
    }
    
    if (wallet > 0) {
      walletTxs.push({
        id: o.id,
        source: 'order',
        invoice_number: o.invoice_number,
        customer: o.customer ? o.customer.name : 'Unknown',
        amount: wallet,
        date: o.date || o.created_at,
        payment_method: o.payment_method,
        paid_amount: o.paid_amount,
        notes: o.notes
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
      const amt = Math.abs(e.amount || 0);
      cash = e.payment_method === 'cash' ? amt : 0;
      visa = e.payment_method === 'visa' ? amt : 0;
      wallet = e.payment_method === 'wallet' ? amt : 0;
      instapay = e.payment_method === 'instapay' ? amt : 0;
    }

    if (wallet > 0) {
      walletTxs.push({
        id: e.id,
        source: e.amount < 0 ? 'expense-income' : 'expense',
        note: e.note,
        amount: e.amount < 0 ? wallet : -wallet,
        date: e.date,
        payment_method: e.payment_method,
        raw_amount: e.amount
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
      visa = p.payment_method === 'visa' ? p.paid_amount : 0;
      wallet = p.payment_method === 'wallet' ? p.paid_amount : 0;
      instapay = p.payment_method === 'instapay' ? p.paid_amount : 0;
    }

    if (wallet > 0) {
      walletTxs.push({
        id: p.id,
        source: 'purchase',
        invoice_number: p.invoice_number,
        supplier_name: p.supplier_name,
        amount: -wallet,
        date: p.created_at,
        payment_method: p.payment_method,
        paid_amount: p.paid_amount
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
      visa = et.payment_method === 'visa' ? et.amount : 0;
      wallet = et.payment_method === 'wallet' ? et.amount : 0;
      instapay = et.payment_method === 'instapay' ? et.amount : 0;
    }

    if (wallet > 0) {
      walletTxs.push({
        id: et.id,
        source: 'employee_transaction',
        amount: -wallet,
        date: et.created_at,
        payment_method: et.payment_method
      });
    }
  });

  // Sort by date
  walletTxs.sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log("=== WALLET TRANSACTIONS ===");
  walletTxs.forEach((tx, idx) => {
    console.log(`${idx + 1}. Source: ${tx.source}, Date: ${tx.date}, Amount: ${tx.amount}, Method: ${tx.payment_method}, Details: ${tx.notes || tx.note || tx.invoice_number || tx.supplier_name || ''}`);
  });

  const total = walletTxs.reduce((sum, tx) => sum + tx.amount, 0);
  console.log(`\nCalculated Wallet Balance: ${total}`);
}

main().catch(console.error);
