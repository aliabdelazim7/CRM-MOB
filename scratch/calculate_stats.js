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
  const { data: orders, error: e1 } = await supabase.from('orders').select('*');
  const { data: expenses, error: e2 } = await supabase.from('expenses').select('*');
  const { data: purchaseInvoices, error: e3 } = await supabase.from('purchase_invoices').select('*');
  const { data: employeeTransactions, error: e4 } = await supabase.from('employee_transactions').select('*');
  const { data: storeSettings, error: e5 } = await supabase.from('store_settings').select('*');

  if (e1) console.error("orders error", e1);
  if (e2) console.error("expenses error", e2);
  if (e3) console.error("purchaseInvoices error", e3);

  console.log(`Orders: ${orders?.length}`);
  console.log(`Expenses: ${expenses?.length}`);
  console.log(`Purchase Invoices: ${purchaseInvoices?.length}`);
  console.log(`Employee Transactions: ${employeeTransactions?.length}`);

  let txs = [];

  const addSplits = (id, type, dateStr, cash, visa, wallet, instapay) => {
    const date = new Date(dateStr);
    if (cash > 0) txs.push({ id: `${id}-cash`, type, amount: cash, date, method: 'cash' });
    if (visa > 0) txs.push({ id: `${id}-visa`, type, amount: visa, date, method: 'visa' });
    if (wallet > 0) txs.push({ id: `${id}-wallet`, type, amount: wallet, date, method: 'wallet' });
    if (instapay > 0) txs.push({ id: `${id}-instapay`, type, amount: instapay, date, method: 'instapay' });
  };

  orders?.filter(o => !o.is_deleted).forEach(o => {
    if (o.paid_amount > 0) {
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
      addSplits(o.id, 'revenue', o.date, cash, visa, wallet, instapay);
    }
  });

  expenses?.forEach(e => {
    const isRevenue = e.amount < 0;
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
    addSplits(e.id, isRevenue ? 'revenue' : 'expense', e.date, cash, visa, wallet, instapay);
  });

  purchaseInvoices?.forEach(p => {
    if (p.paid_amount > 0) {
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
      addSplits(p.id, 'expense', p.created_at, cash, visa, wallet, instapay);
    }
  });

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
    addSplits(et.id, 'expense', et.created_at, cash, visa, wallet, instapay);
  });

  const methods = ['cash', 'visa', 'wallet', 'instapay'];
  const balances = {};
  
  methods.forEach(method => {
    const methodTxs = txs.filter(t => t.method === method);
    const rev = methodTxs.filter(t => t.type === 'revenue').reduce((s, t) => s + t.amount, 0);
    const exp = methodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    balances[method] = { revenues: rev, expenses: exp, net: rev - exp };
  });

  console.log("\n=== BALANCES BY METHOD ===");
  console.log(balances);

  const initial_balance = storeSettings?.[0]?.initial_balance || 0;
  console.log(`\nInitial Balance: ${initial_balance}`);
  
  const totalNet = txs.reduce((sum, tx) => sum + (tx.type === 'revenue' ? tx.amount : -tx.amount), 0);
  console.log(`Closing Balance (excluding initial): ${totalNet}`);
  console.log(`Total Closing Balance (including initial): ${totalNet + initial_balance}`);
}

main().catch(console.error);
