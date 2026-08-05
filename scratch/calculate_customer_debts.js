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
  const customerId = 'd205f7f1-5a95-4cd6-a006-44233c8a437a';
  
  // Fetch orders and items
  const { data: orders, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId);

  if (oErr) {
    console.error(oErr);
    return;
  }

  const activeCustomerOrders = orders.filter(o => !o.is_deleted);
  
  console.log("=== Active Orders for customer ===");
  activeCustomerOrders.forEach(o => {
    console.log(`ID: ${o.id}, Total: ${o.total}, Paid: ${o.paid_amount}, Type: ${o.type}, Notes: ${o.notes}`);
  });

  const calculateOrderReturnValue = (o) => {
    // Let's assume returned value is 0 for simplicity since we don't have items loaded, but let's check
    return 0;
  };

  const totalDebt = Math.max(0, activeCustomerOrders.reduce((sum, o) => {
    if (o.type === 'payment' && o.notes?.includes('سداد أجل للفاتورة رقم')) {
      console.log(`Ignoring payment order ${o.id} in debt calculation because notes match: "${o.notes}"`);
      return sum;
    }
    const returnedValue = calculateOrderReturnValue(o);
    const effectiveTotal = o.type === 'payment' ? 0 : o.total - returnedValue;
    const itemDebt = effectiveTotal - o.paid_amount;
    console.log(`Order ${o.id}: type=${o.type}, effectiveTotal=${effectiveTotal}, paid=${o.paid_amount}, itemDebt=${itemDebt}`);
    return sum + itemDebt;
  }, 0));

  console.log(`\nComputed totalDebt: ${totalDebt}`);
}

main().catch(console.error);
