-- ADRIA — يضمن وجود كل أعمدة إعدادات المتجر.
-- آمن للتشغيل أكتر من مرة. شغّله لو الإعدادات (اللوجو، تسميات المحافظ، ...)
-- مش بتتحفظ وبتطلع رسالة "Could not find the '...' column of 'store_settings'".
--
-- السبب: حفظ الإعدادات بيبعت كل الأعمدة في UPDATE واحد، فأي عمود ناقص
-- بيفشّل الحفظ كله — بما فيه رفع اللوجو.
--
-- ⚠️ النسخة القديمة من الملف ده كانت بتغطي ١٣ عمود بس من ٢٤، فاللي بيشغّلها
-- كان بيقع في نفس الخطأ تاني بس على عمود مختلف (payment_opening_balances
-- أو expense_categories أو pages_qr_*). دلوقتي بتغطي **كل** الأعمدة اللي
-- updateSettings بيبعتها في src/store/useStore.ts.
--
-- لو ضفت عمود جديد في updateSettings، ضيفه هنا كمان.

-- ── الأعمدة الأساسية (من 01_setup_adria.sql — موجودة غالباً) ────────────────
alter table store_settings add column if not exists name                  text default 'ADRIA';
alter table store_settings add column if not exists currency              text default 'ج.م';
alter table store_settings add column if not exists logo                  text default '';
alter table store_settings add column if not exists tax_rate              numeric default 0;
alter table store_settings add column if not exists theme_color           text default '#4f46e5';
alter table store_settings add column if not exists address               text default '';
alter table store_settings add column if not exists phone                 text default '';
alter table store_settings add column if not exists phone2                text default '';
alter table store_settings add column if not exists whatsapp_country_code text default '2';
alter table store_settings add column if not exists initial_balance       numeric default 0;
alter table store_settings add column if not exists location_url          text default '';

-- ── وسائل الدفع والصلاحيات (19، 22، 24) ─────────────────────────────────────
alter table store_settings add column if not exists payment_labels                 jsonb;
alter table store_settings add column if not exists payment_methods_enabled        jsonb;
alter table store_settings add column if not exists cashier_permissions            jsonb;
alter table store_settings add column if not exists show_invoice_profit            boolean default true;
alter table store_settings add column if not exists allow_cashier_employee_advance boolean default false;

-- ── الأرصدة الافتتاحية (29، 32) ─────────────────────────────────────────────
alter table store_settings add column if not exists payment_opening_balances jsonb;
alter table store_settings add column if not exists savings_opening_balances jsonb;

-- ── اليوم المحاسبي (35) ─────────────────────────────────────────────────────
alter table store_settings add column if not exists day_start_hour integer default 3;

-- ── التصنيفات المخصّصة و QR الصفحات (43، 44) ────────────────────────────────
alter table store_settings add column if not exists expense_categories jsonb;
alter table store_settings add column if not exists income_categories  jsonb;
alter table store_settings add column if not exists pages_qr_url       text;
alter table store_settings add column if not exists pages_qr_label     text;
alter table store_settings add column if not exists pages_qr_image     text;

-- ── تحديث الـ schema cache بتاع PostgREST ───────────────────────────────────
-- من غير السطر ده Supabase ممكن يفضل يرجّع نفس الخطأ لدقايق رغم إن العمود
-- اتضاف فعلاً — لأن الكاش لسه مش عارف بيه. (ده بالظبط معنى رسالة
-- "in the schema cache".)
notify pgrst, 'reload schema';

-- ── تأكيد: بيعرض أي عمود لسه ناقص. المفروض النتيجة ترجع فاضية ───────────────
select c.column_name as "عمود لسه ناقص"
from (values
  ('name'),('currency'),('logo'),('tax_rate'),('theme_color'),('address'),
  ('phone'),('phone2'),('whatsapp_country_code'),('initial_balance'),
  ('location_url'),('payment_labels'),('payment_methods_enabled'),
  ('cashier_permissions'),('show_invoice_profit'),
  ('allow_cashier_employee_advance'),('payment_opening_balances'),
  ('savings_opening_balances'),('day_start_hour'),('expense_categories'),
  ('income_categories'),('pages_qr_url'),('pages_qr_label'),('pages_qr_image')
) as c(column_name)
where not exists (
  select 1 from information_schema.columns i
  where i.table_name = 'store_settings' and i.column_name = c.column_name
);
