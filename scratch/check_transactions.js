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

console.log("URL:", supabaseUrl);
console.log("Key Length:", supabaseAnonKey ? supabaseAnonKey.length : 0);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('*, customer:customer_id(*)')
    .order('created_at', { ascending: false })
    .limit(10);

  if (oErr) {
    console.error("Orders Error:", oErr);
  } else {
    console.log("=== ORDERS ===");
    console.log(orders.map(o => ({ 
      id: o.id, 
      total: o.total, 
      paid: o.paid_amount, 
      car_id: o.car_id, 
      date: o.created_at, 
      notes: o.notes,
      customer: o.customer ? o.customer.name : 'null'
    })));
  }

  const { data: expenses, error: eErr } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (eErr) {
    console.error("Expenses Error:", eErr);
  } else {
    console.log("=== EXPENSES ===");
    console.log(expenses.map(e => ({ 
      id: e.id, 
      amount: e.amount, 
      car_id: e.car_id, 
      date: e.created_at, 
      note: e.note 
    })));
  }

  const { data: cars, error: cErr } = await supabase
    .from('car_subscriptions')
    .select('*');

  if (cErr) {
    console.error("Cars Error:", cErr);
  } else {
    console.log("=== CARS ===");
    console.log(cars.map(c => ({ id: c.id, car_number: c.car_number, name: c.customer_name })));
  }
}

check().catch(console.error);
