import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const { data: appts } = await supabase
    .from('maintenance_appointments')
    .select('*');
  
  console.log("Appointments:", appts.map(a => ({
    id: a.id,
    subscription_id: a.subscription_id,
    appointment_date: a.appointment_date,
    cost: a.cost,
    status: a.status,
    report: a.report
  })));
}

inspect();
