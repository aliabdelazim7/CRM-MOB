-- =============================================================================
-- HANCES PRO — ملف إصلاح الحفظ وصلاحيات جدول المنتجات (ملف منفصل وآمن 100%)
-- =============================================================================
-- هذا الملف يقوم بالآتي:
-- 1. إضافة جميع الأعمدة الناقصة لجدول المنتجات (unit, amazon_shipping, is_hidden, إلخ)
-- 2. إزالة أي View قديم متعارض (مثل v_stock_gap)
-- 3. منح الصلاحيات الكاملة (SELECT, INSERT, UPDATE, DELETE) للـ anon و authenticated
-- 4. إعداد سياسة الأمان RLS المفتوحة لضمان عدم رفض Supabase لأي عملية حفظ
-- =============================================================================

-- ── 1. إزالة أي Views متعارضة ────────────────────────────────────────────────
drop view if exists v_stock_gap cascade;

-- ── 2. ضمان وجود جدول المنتجات وباقي الأعمدة بالكامل ──────────────────────────
create table if not exists products (
  id text primary key,
  created_at timestamptz default now()
);

alter table products add column if not exists name                   text;
alter table products add column if not exists barcode                text;
alter table products add column if not exists image_url              text;
alter table products add column if not exists purchase_price         numeric default 0;
alter table products add column if not exists average_purchase_price numeric default 0;
alter table products add column if not exists sale_price             numeric default 0;
alter table products add column if not exists discount_price         numeric default 0;
alter table products add column if not exists wholesale_price        numeric default 0;
alter table products add column if not exists half_wholesale_price   numeric default 0;
alter table products add column if not exists season                 text;
alter table products add column if not exists stock_quantity         numeric default 0;
alter table products add column if not exists display_quantity       numeric default 0;
alter table products add column if not exists factory_quantity       numeric default 0;
alter table products add column if not exists category_id            text;
alter table products add column if not exists unit                   text default 'قطعة';
alter table products add column if not exists is_hidden              boolean default false;
alter table products add column if not exists color                  text;
alter table products add column if not exists supplier_name          text;

-- أسعار ومصاريف المنصات والمتاجر
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

-- ── 3. تفعيل RLS وإعطاء الصلاحيات الكاملة للـ anon و authenticated ────────────
alter table products enable row level security;

drop policy if exists "allow_all_products_access" on products;
drop policy if exists "allow_all_anon_authenticated" on products;
drop policy if exists "allow all" on products;

create policy "allow_all_products_access"
  on products
  for all
  to anon, authenticated
  using (true)
  with check (true);

grant all on products to anon, authenticated;

-- ── 4. تحديث الـ Schema Cache الخاص بـ PostgREST ─────────────────────────────
notify pgrst, 'reload schema';
