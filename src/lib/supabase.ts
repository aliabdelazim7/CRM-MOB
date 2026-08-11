import { createClient } from '@supabase/supabase-js';

const customUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('CUSTOM_SUPABASE_URL') : null;
const customKey = typeof localStorage !== 'undefined' ? localStorage.getItem('CUSTOM_SUPABASE_ANON_KEY') : null;

const envUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  ''
) as string;

const envKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_PUBLISHABLE_KEY ||
  ''
) as string;

const DEFAULT_SUPABASE_URL = 'https://cysweirlohrlsofrdrgr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5c3dlaXJsb2hybHNvZnJkcmdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NDgyMzcsImV4cCI6MjEwMjAyNDIzN30.u0cxdSdh3eESW_vynIC1Q1gUUVRW59Te2Jem8w9MfpU';

export const supabaseUrl = customUrl || envUrl || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = customKey || envKey || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'placeholder'
);

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase environment variables missing or using placeholder! Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Environment Variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export function saveCustomSupabaseConfig(url: string, key: string) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('CUSTOM_SUPABASE_URL', url.trim());
    localStorage.setItem('CUSTOM_SUPABASE_ANON_KEY', key.trim());
    window.location.reload();
  }
}

// ── جلب كل الصفوف بتخطّي حد الـ1000 الافتراضي في Supabase ──────────────
// السبب: `select('*')` بيرجّع 1000 صف كحد أقصى، فحسابات الأرصدة (المصروفات/
// المشتريات/الرواتب/الطلبات) كانت بتنقص بمجرد ما يعدّي عدد الحركات 1000.
// بنجيب على دفعات (range) لحد ما ترجع دفعة أصغر من الحجم = النهاية.
export async function fetchAllRows<T = any>(
  table: string,
  select = '*',
  orderBy: { column: string; ascending?: boolean } = { column: 'created_at', ascending: false },
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .order(orderBy.column, { ascending: orderBy.ascending ?? false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data as T[]) || [];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}
