import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read environment variables from .env or .env.local
const envPath = path.join(process.cwd(), '.env');
const envLocalPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const matchUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/);
  const matchKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
  if (matchUrl) supabaseUrl = matchUrl[1].trim().replace(/['"]/g, '');
  if (matchKey) supabaseKey = matchKey[1].trim().replace(/['"]/g, '');
} else if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const matchUrl = envContent.match(/VITE_SUPABASE_URL=(.*)/);
  const matchKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.*)/);
  if (matchUrl) supabaseUrl = matchUrl[1].trim().replace(/['"]/g, '');
  if (matchKey) supabaseKey = matchKey[1].trim().replace(/['"]/g, '');
}

console.log("Supabase URL:", supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase config not found.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  // Find customer "كريم المنباوي"
  const { data: customers, error: cErr } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', '%كريم المنباوي%');
  
  if (cErr) {
    console.error(cErr);
    process.exit(1);
  }
  
  console.log("Customers found:", customers);
  if (customers.length === 0) process.exit(0);

  const customerId = customers[0].id;

  // Find car subscriptions
  const { data: cars, error: carErr } = await supabase
    .from('car_subscriptions')
    .select('*')
    .eq('customer_phone', customers[0].phone);
  
  console.log("Cars found:", cars);

  if (cars.length === 0) process.exit(0);

  // Find maintenance appointments
  const { data: appts, error: apptErr } = await supabase
    .from('maintenance_appointments')
    .select('*')
    .eq('subscription_id', cars[0]?.id);
  
  console.log("Appointments found:", appts);

  // Find orders for this customer / car
  const { data: orders, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .or(`customer_id.eq.${customerId},car_id.eq.${cars[0]?.id}`);
  
  console.log("Orders found:", orders.map(o => ({
    id: o.id,
    total: o.total,
    paid_amount: o.paid_amount,
    type: o.type,
    notes: o.notes,
    date: o.date,
    car_id: o.car_id,
    created_at: o.created_at
  })));

  // Find expenses for this car
  const { data: expenses, error: expErr } = await supabase
    .from('expenses')
    .select('*')
    .eq('car_id', cars[0]?.id);
  
  console.log("Expenses found:", expenses);
}

inspect();
