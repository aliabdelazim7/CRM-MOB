-- =============================================================================
-- HANCES — db/74: صورة المنتج + ضمان باقي أعمدة جدول products
-- =============================================================================
--  المشكلة: الواجهة بتبعت image_url مع حفظ المنتج، لكن العمود مش موجود في جدول
--  products. و addProduct/updateProduct في src/store/useStore.ts بيتخطّوا أي
--  عمود ناقص ويكمّلوا حفظ الباقي — فالصورة كانت بتبان في الشاشة بعد الحفظ
--  (تحديث محلّي) وتختفي بعد أول تحديث للصفحة، من غير أي رسالة خطأ.
--
--  العمود بيخزّن يا رابط صورة عادي (https://...) يا data URL للصورة المرفوعة
--  من الجهاز بعد تصغيرها على canvas (نفس نمط store_settings.logo).
--
--  الملف كمان بيضمن باقي الأعمدة اللي الواجهة بتبعتها (أسعار المنصّات وخلافه)
--  عشان نفس الباج مايتكررش على حقل تاني. آمن للتشغيل أكتر من مرة (idempotent).
--
--  ⚠️ لو ضفت حقل جديد للمنتج في الواجهة، ضيف عموده هنا كمان.
-- =============================================================================

-- ── صورة المنتج (المطلوبة في جدول المنتجات وفي الكاشير/POS) ─────────────────
alter table products add column if not exists image_url text;

-- ── أعمدة موجودة في ميجريشنز سابقة — بنأكّدها لو القاعدة مااتحدّثتش ──────────
alter table products add column if not exists discount_price       numeric default 0; -- db/05
alter table products add column if not exists display_quantity     numeric default 0; -- db/06
alter table products add column if not exists season               text;              -- db/07
alter table products add column if not exists wholesale_price      numeric default 0; -- db/07
alter table products add column if not exists half_wholesale_price numeric default 0; -- db/07
alter table products add column if not exists color                text;              -- db/04
alter table products add column if not exists factory_quantity     numeric default 0; -- db/13
alter table products add column if not exists supplier_name        text;              -- db/31

-- ── أسعار ومصاريف المنصّات (الواجهة بتبعتها من مودال المنتج) ────────────────
alter table products add column if not exists website_ad_cost        numeric default 0;
alter table products add column if not exists amazon_price           numeric default 0;
alter table products add column if not exists amazon_discount_price  numeric default 0;
alter table products add column if not exists amazon_commission      numeric default 0;
alter table products add column if not exists amazon_shipping        numeric default 0;
alter table products add column if not exists amazon_ad_cost         numeric default 0;
alter table products add column if not exists noon_price             numeric default 0;
alter table products add column if not exists noon_discount_price    numeric default 0;
alter table products add column if not exists noon_commission        numeric default 0;
alter table products add column if not exists noon_shipping          numeric default 0;
alter table products add column if not exists noon_ad_cost           numeric default 0;
alter table products add column if not exists jumia_price            numeric default 0;
alter table products add column if not exists jumia_discount_price   numeric default 0;
alter table products add column if not exists jumia_commission       numeric default 0;
alter table products add column if not exists jumia_shipping         numeric default 0;
alter table products add column if not exists jumia_ad_cost          numeric default 0;
alter table products add column if not exists custom_stores          jsonb;
alter table products add column if not exists colors                 jsonb;
alter table products add column if not exists alert_limit            numeric default 5;
alter table products add column if not exists unit                   text not null default 'قطعة';

-- ── السماح الكامل للـ anon و authenticated بالحفظ والتعديل ─────────
grant all on products to anon, authenticated;
drop policy if exists "allow_all_anon_authenticated" on products;
create policy "allow_all_anon_authenticated" on products for all to anon, authenticated using (true) with check (true);

-- ── تحديث الـ schema cache بتاع PostgREST ───────────────────────────────────
-- من غير السطر ده Supabase ممكن يفضل يرجّع "Could not find the 'image_url'
-- column ... in the schema cache" لدقايق رغم إن العمود اتضاف فعلاً.
notify pgrst, 'reload schema';

-- ── تأكيد: بيعرض أي عمود لسه ناقص. المفروض النتيجة ترجع فاضية ───────────────
select c.column_name as "عمود لسه ناقص"
from (values
  ('image_url'),('discount_price'),('display_quantity'),('season'),
  ('wholesale_price'),('half_wholesale_price'),('color'),('factory_quantity'),
  ('supplier_name'),('website_ad_cost'),('amazon_price'),('amazon_discount_price'),
  ('amazon_commission'),('amazon_shipping'),('amazon_ad_cost'),('noon_price'),('noon_discount_price'),
  ('noon_commission'),('noon_shipping'),('noon_ad_cost'),('jumia_price'),
  ('jumia_discount_price'),('jumia_commission'),('jumia_shipping'),
  ('jumia_ad_cost'),('custom_stores'),('colors'),('alert_limit'),('unit')
) as c(column_name)
where not exists (
  select 1 from information_schema.columns i
  where i.table_name = 'products' and i.column_name = c.column_name
);
