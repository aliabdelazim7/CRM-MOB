-- ADRIA — يضمن وجود كل أعمدة جدول الفواتير.
-- آمن للتشغيل أكتر من مرة.
--
-- المشكلة اللي بيحلّها: «تعذّر حفظ الفاتورة: Could not find the 'client_ref'
-- column of 'orders' in the schema cache».
--
-- زي إعدادات المتجر بالظبط: تسجيل الفاتورة بيبعت كل الأعمدة في INSERT واحد،
-- فأي عمود ناقص كان بيضيّع **البيعة كلها**. والأخطر إن شاشة الكاشير كانت
-- بتكمّل عادي وتطبع إيصال وتقول «تم الدفع بنجاح» — والفاتورة مش موجودة أصلاً.
--
-- الأعمدة دي بتتراكم من هجرات مختلفة (14 للبائع، 24 لطرق الدفع 5/6،
-- 63 لبصمة التكرار...). لو قاعدة بيانات اتعملت من نسخة قديمة أو من سكربت
-- seed، بيبقى فيها نقص. الملف ده بيلحّقهم كلهم مرة واحدة.

-- ── المبالغ وتقسيمة الدفع ───────────────────────────────────────────────────
alter table orders add column if not exists total           numeric default 0;
alter table orders add column if not exists paid_amount     numeric default 0;
alter table orders add column if not exists paid_cash       numeric default 0;
alter table orders add column if not exists paid_visa       numeric default 0;
alter table orders add column if not exists paid_wallet     numeric default 0;
alter table orders add column if not exists paid_instapay   numeric default 0;
alter table orders add column if not exists paid_method5    numeric default 0;  -- db/24
alter table orders add column if not exists paid_method6    numeric default 0;  -- db/24
alter table orders add column if not exists payment_method  text default 'cash';

-- ── العميل والكاشير والبائع ─────────────────────────────────────────────────
alter table orders add column if not exists customer_id      uuid;
alter table orders add column if not exists cashier_name     text;
alter table orders add column if not exists salesperson_id   uuid;  -- db/14
alter table orders add column if not exists salesperson_name text;  -- db/14

-- ── بيانات إضافية ───────────────────────────────────────────────────────────
alter table orders add column if not exists type            text default 'sale';
alter table orders add column if not exists notes           text;
alter table orders add column if not exists coupon_code     text;
alter table orders add column if not exists discount_amount numeric default 0;
alter table orders add column if not exists car_id          uuid;
alter table orders add column if not exists created_at      timestamptz default now();

-- ── بصمة منع التكرار (db/63) ────────────────────────────────────────────────
-- من غيرها لو النت فصل بعد ما الطلب وصل السيرفر، الكاشير بيعيد الحفظ
-- فالفاتورة بتتسجّل مرتين.
alter table orders add column if not exists client_ref text;
create unique index if not exists orders_client_ref_uniq
  on orders (client_ref)
  where client_ref is not null;
create index if not exists orders_client_ref_idx on orders (client_ref);

-- ── تحديث schema cache بتاع PostgREST ───────────────────────────────────────
-- من غير السطر ده Supabase بيفضل يرجّع نفس الخطأ لدقايق رغم إن العمود اتضاف.
notify pgrst, 'reload schema';

-- ── تأكيد: بيعرض أي عمود لسه ناقص. المفروض النتيجة ترجع فاضية ───────────────
select c.column_name as "عمود لسه ناقص"
from (values
  ('id'),('total'),('paid_amount'),('paid_cash'),('paid_visa'),('paid_wallet'),
  ('paid_instapay'),('paid_method5'),('paid_method6'),('payment_method'),
  ('customer_id'),('cashier_name'),('salesperson_id'),('salesperson_name'),
  ('type'),('notes'),('coupon_code'),('discount_amount'),('car_id'),
  ('created_at'),('client_ref')
) as c(column_name)
where not exists (
  select 1 from information_schema.columns i
  where i.table_name = 'orders' and i.column_name = c.column_name
);
