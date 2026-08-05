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
  const { data: orders } = await supabase.from('orders').select('*');
  const { data: expenses } = await supabase.from('expenses').select('*');
  const { data: purchaseInvoices } = await supabase.from('purchase_invoices').select('*');
  const { data: employeeTransactions } = await supabase.from('employee_transactions').select('*');
  const { data: storeSettings } = await supabase.from('store_settings').select('*');

  const activeOrders = orders?.filter(o => !o.is_deleted) || [];
  
  // 1. Debt payments per invoice (copied from Finance/Budget)
  const debtPaymentsByInvoice = new Map();
  activeOrders.forEach(o => {
    if (o.type === 'payment') {
      const match = o.notes?.match(/سداد أجل للفاتورة رقم #([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        mapAdd(debtPaymentsByInvoice, match[1], o.paid_amount || 0);
      }
    }
  });

  function mapAdd(map, key, val) {
    map.set(key, (map.get(key) || 0) + val);
  }

  const getInitialPaidAmount = (o) => {
    if (o.type === 'payment') return o.paid_amount || 0;
    const sumSplits = (o.paid_cash || 0) + (o.paid_visa || 0) + (o.paid_wallet || 0) + (o.paid_instapay || 0);
    if (sumSplits > 0) return sumSplits;
    const totalRefunded = o.items?.reduce((s, item) => s + (item.refunded_amount || 0), 0) || 0;
    return (o.paid_amount || 0) - (debtPaymentsByInvoice.get(o.id) || 0) + totalRefunded;
  };

  // Helper to extract payment splits
  const getSafeMethodAmount = (item, method, field = 'paid_amount') => {
    const cash = Number(item.paid_cash) || 0;
    const visa = Number(item.paid_visa) || 0;
    const wallet = Number(item.paid_wallet) || 0;
    const instapay = Number(item.paid_instapay) || 0;
    const splitsSum = cash + visa + wallet + instapay;

    if (splitsSum > 0) {
      if (method === 'cash') return cash;
      if (method === 'visa') return visa;
      if (method === 'wallet') return wallet;
      if (method === 'instapay') return instapay;
      return 0;
    }

    const primaryMethod = item.payment_method || 'cash';
    if (primaryMethod === method) {
      if (field === 'amount') return Math.abs(Number(item.amount) || 0);
      return Number(item[field]) || 0;
    }
    return 0;
  };

  const calculateMethodBalance = (method) => {
    // Orders (inflow)
    const ordersIn = activeOrders.reduce((sum, o) => {
      let amt = 0;
      let cash = o.paid_cash || 0;
      let visa = o.paid_visa || 0;
      let wallet = o.paid_wallet || 0;
      let instapay = o.paid_instapay || 0;
      let initialPaid = getInitialPaidAmount(o);
      
      if (cash + visa + wallet + instapay === 0) {
        if (o.payment_method === method) {
          amt = initialPaid;
        }
      } else {
        if (method === 'cash') amt = cash;
        if (method === 'visa') amt = visa;
        if (method === 'wallet') amt = wallet;
        if (method === 'instapay') amt = instapay;
      }
      return sum + amt;
    }, 0);

    // Expenses (outflow)
    const expensesOut = expenses?.reduce((sum, e) => {
      // If amount < 0, it's revenue (inflow), otherwise it's outflow (expense)
      const amt = e.amount;
      const val = getSafeMethodAmount(e, method, 'amount');
      if (amt < 0) {
        // revenue, so we subtract from outflow (i.e. add to balance)
        return sum - val;
      } else {
        return sum + val;
      }
    }, 0) || 0;

    // Purchases (outflow)
    const purchasesOut = purchaseInvoices?.reduce((sum, p) => {
      return sum + getSafeMethodAmount(p, method, 'paid_amount');
    }, 0) || 0;

    // Employee transactions (outflow)
    const employeeOut = employeeTransactions?.reduce((sum, et) => {
      return sum + getSafeMethodAmount(et, method, 'amount');
    }, 0) || 0;

    const initial = method === 'cash' ? (storeSettings?.[0]?.initial_balance || 0) : 0;
    return initial + ordersIn - expensesOut - purchasesOut - employeeOut;
  };

  console.log("=== FRONTEND BALANCE CARDS ===");
  const cashBal = calculateMethodBalance('cash');
  const visaBal = calculateMethodBalance('visa');
  const walletBal = calculateMethodBalance('wallet');
  const instaBal = calculateMethodBalance('instapay');

  console.log(`💵 Cash Safe (الخزنة): ${cashBal}`);
  console.log(`💳 Visa: ${visaBal}`);
  console.log(`📱 Wallet (المحفظة): ${walletBal}`);
  console.log(`⚡ Instapay: ${instaBal}`);
  console.log(`Total: ${cashBal + visaBal + walletBal + instaBal}`);
}

main().catch(console.error);
