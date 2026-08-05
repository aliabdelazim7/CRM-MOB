-- ============================================================
-- السكريبت الموحد والشامل لإعداد قاعدة بيانات ADRIA (POS / Enterprise ERP)
-- شغّل هذا الملف بالكامل مرة واحدة في:
-- Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- ---------- 1) الإضافات (Extensions) ----------
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2) الجداول الأساسية وجداول HANCES PRO ERP
-- ============================================================

-- 1. إعدادات المتجر
create table if not exists store_settings (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'محل قطع غيار السيارات',
  currency text default 'ج.م',
  logo text default 'https://cdn-icons-png.flaticon.com/512/3143/3143641.png',
  tax_rate numeric default 0,
  theme_color text default '#4f46e5',
  address text default '',
  phone text default '',
  phone2 text default '',
  whatsapp_country_code text default '2',
  initial_balance numeric default 0,
  location_url text default ''
);

-- 2. التصنيفات
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- 3. المنتجات
create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  barcode text unique,
  purchase_price numeric default 0,
  average_purchase_price numeric default 0,
  sale_price numeric default 0,
  stock_quantity integer default 0,
  category_id uuid references categories(id) on delete set null,
  is_hidden boolean default false,
  created_at timestamptz default now()
);

-- 4. العملاء
create table if not exists customers (
  id uuid default gen_random_uuid() primary key,
  custom_id text unique,
  name text not null default 'بدون اسم',
  phone text unique not null,
  card_number text,
  created_at timestamptz default now()
);

-- 5. الموردين
create table if not exists suppliers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text,
  email text,
  address text,
  current_balance numeric default 0,
  credit_limit numeric default 0,
  created_at timestamptz default now()
);

-- 6. سيارات الصيانة والاشتراكات
create table if not exists car_subscriptions (
  id uuid primary key default gen_random_uuid(),
  car_number text not null,
  car_details text,
  customer_name text,
  customer_phone text,
  status text default 'active',
  subscription_duration_months integer,
  subscription_frequency_days integer,
  created_at timestamptz default now()
);

create table if not exists maintenance_appointments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references car_subscriptions(id) on delete cascade,
  appointment_date date not null,
  description text,
  report text,
  cost numeric default 0,
  status text default 'pending',
  is_reminded boolean default false,
  created_at timestamptz default now()
);

-- 7. فواتير المشتريات التكليفية والمتقدمة
create table if not exists purchase_invoices (
  id uuid default gen_random_uuid() primary key,
  invoice_number text not null,
  supplier_id uuid references suppliers(id) on delete set null,
  warehouse_id uuid,
  invoice_date date default current_date,
  due_date date,
  status text default 'approved',
  subtotal numeric default 0,
  discount numeric default 0,
  tax_amount numeric default 0,
  freight_cost numeric default 0,
  total numeric not null default 0,
  total_amount numeric default 0,
  paid_amount numeric default 0,
  paid_cash numeric default 0,
  paid_visa numeric default 0,
  paid_wallet numeric default 0,
  paid_instapay numeric default 0,
  payment_method text default 'cash',
  notes text,
  created_at timestamptz default now()
);

create table if not exists purchase_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references purchase_invoices(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  quantity integer not null default 1,
  purchase_price numeric not null default 0,
  landed_unit_cost numeric default 0,
  tax_rate numeric default 0,
  total_cost numeric default 0
);

-- 8. الفواتير والمبيعات (Orders)
create table if not exists orders (
  id text primary key,
  total numeric not null default 0,
  paid_amount numeric default 0,
  paid_cash numeric default 0,
  paid_visa numeric default 0,
  paid_wallet numeric default 0,
  paid_instapay numeric default 0,
  payment_method text default 'cash',
  type text default 'sale',
  customer_id uuid references customers(id) on delete set null,
  cashier_name text,
  car_id uuid references car_subscriptions(id) on delete set null,
  coupon_code text,
  discount_amount numeric default 0,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deletion_reason text,
  notes text,
  created_at timestamptz default now()
);
create index if not exists idx_orders_is_deleted on orders(is_deleted);
create index if not exists idx_orders_deleted_at on orders(deleted_at);

-- عداد أرقام الفواتير
create table if not exists invoice_counter (
  id int primary key default 1,
  current_value integer default 1,
  check (id = 1)
);
insert into invoice_counter (id, current_value) values (1, 1)
on conflict (id) do nothing;

-- بنود الفاتورة
create table if not exists order_items (
  id uuid default gen_random_uuid() primary key,
  order_id text references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  barcode text,
  quantity integer default 1,
  returned_quantity integer default 0,
  refunded_amount numeric default 0,
  sale_price numeric default 0,
  purchase_price numeric default 0
);

-- 9. المصروفات
create table if not exists expenses (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  amount numeric not null default 0,
  note text,
  payment_method text default 'cash',
  paid_cash numeric default 0,
  paid_visa numeric default 0,
  paid_wallet numeric default 0,
  paid_instapay numeric default 0,
  car_id uuid references car_subscriptions(id) on delete set null,
  created_at timestamptz default now()
);

-- 10. التمويل (السلف والجمعيات)
create table if not exists financing_accounts (
  id uuid default gen_random_uuid() primary key,
  type text not null default 'loan',
  lender_name text not null,
  lender_phone text default '',
  lender_details text default '',
  description text default '',
  principal_amount numeric not null default 0,
  collection_amount numeric not null default 0,
  collection_date date not null,
  installment_count integer not null default 1,
  status text not null default 'open',
  created_at timestamptz default now()
);

create table if not exists financing_payments (
  id uuid default gen_random_uuid() primary key,
  account_id uuid references financing_accounts(id) on delete cascade,
  payment_type text not null,
  due_date date not null,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  remaining_amount numeric not null default 0,
  status text not null default 'pending',
  paid_at timestamptz,
  expense_id uuid references expenses(id) on delete set null,
  note text,
  created_at timestamptz default now()
);

create table if not exists financing_transactions (
  id uuid default gen_random_uuid() primary key,
  account_id uuid references financing_accounts(id) on delete cascade,
  payment_id uuid references financing_payments(id) on delete cascade,
  transaction_type text not null,
  amount numeric not null default 0,
  remaining_after numeric not null default 0,
  payment_method text not null default 'cash',
  expense_id uuid references expenses(id) on delete set null,
  note text,
  created_at timestamptz default now()
);

-- 11. الكاشيرين والموظفين
create table if not exists cashiers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  password text,
  phone text,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists employees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  job_title text,
  phone text,
  working_hours text,
  monthly_salary numeric default 0,
  annual_leave_balance numeric not null default 0,
  hire_date date default current_date,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists idx_employees_is_active on employees(is_active);

create table if not exists employee_transactions (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) on delete cascade,
  amount numeric not null,
  type text check (type in ('salary', 'advance', 'incentive')),
  payment_method text default 'cash',
  paid_cash numeric default 0,
  paid_visa numeric default 0,
  paid_wallet numeric default 0,
  paid_instapay numeric default 0,
  deductions numeric default 0,
  month text,
  note text,
  created_at timestamptz default now()
);

create table if not exists employee_leaves (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  days_count numeric not null default 1,
  leave_type text not null check (leave_type in ('paid', 'unpaid')),
  deduction_amount numeric not null default 0,
  month text,
  note text,
  created_at timestamptz default now()
);

-- 12. اقتراحات المنتجات وملاحظات الكاشير والكوبونات
create table if not exists product_suggestions (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  notes text,
  is_purchased boolean default false,
  created_at timestamptz default now()
);

create table if not exists cashier_notes (
  id uuid default gen_random_uuid() primary key,
  cashier_name text not null,
  note text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists coupons (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  discount_type text not null default 'percentage' check (discount_type in ('percentage','fixed')),
  discount_value numeric not null default 0,
  start_date timestamptz,
  end_date timestamptz,
  max_uses_per_customer integer,
  max_uses_total integer,
  used_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- ============================================================
-- 13. جداول موديولات HANCES PRO ERP
-- ============================================================

-- 1) شركات الشحن
create table if not exists shipping_carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  tracking_url_template text,
  status text default 'active',
  created_at timestamptz default now()
);

-- 2) شحنات اللوجستيات
create table if not exists logistics_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  carrier_id uuid references shipping_carriers(id) on delete set null,
  tracking_number text,
  shipping_cost numeric default 0,
  status text default 'pending',
  estimated_delivery date,
  shipped_at timestamptz,
  created_at timestamptz default now()
);

-- 3) المخازن والتحويلات
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  manager_id text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text unique not null,
  source_warehouse_id uuid references warehouses(id) on delete restrict,
  target_warehouse_id uuid references warehouses(id) on delete restrict,
  status text default 'pending',
  notes text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid references stock_transfers(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  quantity numeric not null check (quantity > 0)
);

create table if not exists stock_movement_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  warehouse_id uuid references warehouses(id) on delete set null,
  type text not null, -- in, out, transfer, adjustment
  quantity numeric not null,
  reference_type text,
  reference_id text,
  notes text,
  created_at timestamptz default now()
);

-- 4) سجل معاملات الموردين
create table if not exists supplier_transactions (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete cascade,
  type text not null, -- PURCHASE, PAYMENT, RETURN
  amount numeric not null,
  balance_after numeric not null,
  payment_method text,
  reference_no text,
  created_at timestamptz default now()
);

create table if not exists supplier_ledger (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete cascade,
  transaction_type text not null,
  reference_number text,
  debit numeric default 0,
  credit numeric default 0,
  balance numeric default 0,
  payment_account_id text,
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- 3) تفعيل RLS + السياسات الأمنية
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'store_settings','categories','products','customers','suppliers',
    'car_subscriptions','maintenance_appointments','purchase_invoices','purchase_items',
    'orders','invoice_counter','order_items','expenses',
    'financing_accounts','financing_payments','financing_transactions',
    'cashiers','employees','employee_transactions','employee_leaves',
    'product_suggestions','cashier_notes','coupons',
    'shipping_carriers','logistics_orders','warehouses','stock_transfers',
    'stock_transfer_items','stock_movement_logs','supplier_transactions','supplier_ledger'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    if not exists (
      select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'allow all'
    ) then
      execute format('create policy "allow all" on %I for all using (true) with check (true);', t);
    end if;
  end loop;
end $$;

-- ============================================================
-- 4) البيانات الأولية البذرية (Initial Seed Data)
-- ============================================================

-- 1. إعدادات المتجر
insert into store_settings (name, currency, tax_rate, theme_color, initial_balance)
select 'محل قطع غيار السيارات', 'ج.م', 0, '#4f46e5', 0
where not exists (select 1 from store_settings);

-- 2. شركات الشحن الافتراضية
insert into shipping_carriers (name, phone, email, tracking_url_template, status)
select 'SMSA Express', '920009999', 'support@smsaexpress.com', 'https://www.smsaexpress.com/track/{TN}', 'active'
where not exists (select 1 from shipping_carriers where name = 'SMSA Express');

insert into shipping_carriers (name, phone, email, tracking_url_template, status)
select 'FedEx', '18004633339', 'support@fedex.com', 'https://www.fedex.com/fedextrack/?trknbr={TN}', 'active'
where not exists (select 1 from shipping_carriers where name = 'FedEx');

insert into shipping_carriers (name, phone, email, tracking_url_template, status)
select 'Aramex', '920027447', 'support@aramex.com', 'https://www.aramex.com/track/results?mode=0&ShipmentNumber={TN}', 'active'
where not exists (select 1 from shipping_carriers where name = 'Aramex');

insert into shipping_carriers (name, phone, email, tracking_url_template, status)
select 'DHL', '18002255345', 'support@dhl.com', 'https://www.dhl.com/en/express/tracking.html?AWB={TN}', 'active'
where not exists (select 1 from shipping_carriers where name = 'DHL');

-- 3. المخازن الافتراضية
insert into warehouses (name, location, status)
select 'المخزن الرئيسي', 'المقر الرئيسي', 'active'
where not exists (select 1 from warehouses where name = 'المخزن الرئيسي');

insert into warehouses (name, location, status)
select 'مخزن الفرع الثاني', 'الفرع الثاني', 'active'
where not exists (select 1 from warehouses where name = 'مخزن الفرع الثاني');

-- 4. التصنيفات (8 تصنيفات)
insert into categories (name) values
  ('فلاتر وزيوت'),
  ('فرامل'),
  ('نظام التعليق والعفشة'),
  ('كهرباء وبطاريات'),
  ('المحرك والتبريد'),
  ('الإطارات والجنوط'),
  ('الإضاءة والكشافات'),
  ('إكسسوارات وكماليات')
on conflict do nothing;

-- 5. المنتجات (72 منتج متكامل)
insert into products (name, barcode, purchase_price, average_purchase_price, sale_price, stock_quantity, category_id) values
-- 1) فلاتر وزيوت
('فلتر زيت تويوتا أصلي',            '1001', 90,  90,  150,  60, (select id from categories where name='فلاتر وزيوت')),
('فلتر هواء هيونداي',               '1002', 120, 120, 200,  40, (select id from categories where name='فلاتر وزيوت')),
('فلتر بنزين بوش',                  '1003', 80,  80,  140,  50, (select id from categories where name='فلاتر وزيوت')),
('فلتر تكييف كابين',                '1004', 110, 110, 190,  45, (select id from categories where name='فلاتر وزيوت')),
('زيت محرك توتال 5W-30 (4 لتر)',    '1005', 850, 850, 1150, 30, (select id from categories where name='فلاتر وزيوت')),
('زيت محرك موبيل 1 10W-40 (4 لتر)', '1006', 950, 950, 1300, 25, (select id from categories where name='فلاتر وزيوت')),
('زيت فتيس أوتوماتيك ATF',          '1007', 220, 220, 340,  35, (select id from categories where name='فلاتر وزيوت')),
('زيت فرامل DOT4',                  '1008', 70,  70,  120,  50, (select id from categories where name='فلاتر وزيوت')),
('شحم تشحيم متعدد الأغراض',         '1009', 60,  60,  110,  40, (select id from categories where name='فلاتر وزيوت')),
-- 2) فرامل
('تيل فرامل أمامي كوري',            '2001', 350, 350, 520,  30, (select id from categories where name='فرامل')),
('تيل فرامل خلفي',                  '2002', 300, 300, 460,  25, (select id from categories where name='فرامل')),
('هوب فرامل خلفي (طقم)',            '2003', 280, 280, 430,  20, (select id from categories where name='فرامل')),
('اسطوانة فرامل ماستر',            '2004', 650, 650, 950,  10, (select id from categories where name='فرامل')),
('ديسك فرامل أمامي (حلة)',          '2005', 700, 700, 1050, 15, (select id from categories where name='فرامل')),
('طقم خراطيم فرامل',                '2006', 180, 180, 300,  25, (select id from categories where name='فرامل')),
('علبة زيت فرامل ATE',              '2007', 90,  90,  150,  40, (select id from categories where name='فرامل')),
('حساس ABS',                        '2008', 420, 420, 650,  12, (select id from categories where name='فرامل')),
('كرتيرة فرامل اليد',               '2009', 130, 130, 220,  18, (select id from categories where name='فرامل')),
-- 3) نظام التعليق والعفشة
('مساعد أمامي KYB',                 '3001', 750,  750,  1050, 16, (select id from categories where name='نظام التعليق والعفشة')),
('مساعد خلفي KYB',                  '3002', 700,  700,  1000, 16, (select id from categories where name='نظام التعليق والعفشة')),
('طقم مقصات أمامي',                 '3003', 1300, 1300, 1850, 8,  (select id from categories where name='نظام التعليق والعفشة')),
('كاوتش مقص (جلبة)',                '3004', 90,   90,   160,  50, (select id from categories where name='نظام التعليق والعفشة')),
('عمود إكسل CV',                    '3005', 950,  950,  1400, 10, (select id from categories where name='نظام التعليق والعفشة')),
('رمان بلي عجل أمامي',              '3006', 280,  280,  450,  22, (select id from categories where name='نظام التعليق والعفشة')),
('كرة إيد (بول جوينت)',             '3007', 150,  150,  260,  30, (select id from categories where name='نظام التعليق والعفشة')),
('طقم جلب مساعد',                   '3008', 120,  120,  210,  28, (select id from categories where name='نظام التعليق والعفشة')),
('قاعدة محرك (كرسي ماكينة)',        '3009', 320,  320,  500,  14, (select id from categories where name='نظام التعليق والعفشة')),
-- 4) كهرباء وبطاريات
('بطارية كلورايد 70 أمبير',         '4001', 1900, 1900, 2400, 20, (select id from categories where name='كهرباء وبطاريات')),
('بطارية AC ديلكو 60 أمبير',        '4002', 1700, 1700, 2150, 18, (select id from categories where name='كهرباء وبطاريات')),
('طقم بوجيهات NGK',                 '4003', 320,  320,  470,  30, (select id from categories where name='كهرباء وبطاريات')),
('موبينة كهرباء (كويل)',            '4004', 520,  520,  760,  15, (select id from categories where name='كهرباء وبطاريات')),
('مارش (ستارتر) مجدد',              '4005', 1200, 1200, 1750, 8,  (select id from categories where name='كهرباء وبطاريات')),
('دينامو شحن',                      '4006', 1500, 1500, 2100, 6,  (select id from categories where name='كهرباء وبطاريات')),
('حساس أكسجين (بلاجة)',             '4007', 600,  600,  900,  12, (select id from categories where name='كهرباء وبطاريات')),
('منظم جهد (ريجيليتر)',             '4008', 280,  280,  440,  16, (select id from categories where name='كهرباء وبطاريات')),
('أسلاك بوجيهات (طقم)',             '4009', 180,  180,  300,  25, (select id from categories where name='كهرباء وبطاريات')),
-- 5) المحرك والتبريد
('سير كاتينة (تيمنج) دايكو',        '5001', 250, 250, 400,  20, (select id from categories where name='المحرك والتبريد')),
('سير مكنة (سير دينامو)',           '5002', 120, 120, 210,  35, (select id from categories where name='المحرك والتبريد')),
('طلمبة مياه',                      '5003', 380, 380, 580,  18, (select id from categories where name='المحرك والتبريد')),
('ترموستات',                        '5004', 110, 110, 190,  30, (select id from categories where name='المحرك والتبريد')),
('رادياتير ألومنيوم',               '5005', 950, 950, 1400, 10, (select id from categories where name='المحرك والتبريد')),
('طلمبة بنزين بوش',                 '5006', 600, 600, 900,  12, (select id from categories where name='المحرك والتبريد')),
('جوان وش سلندر',                   '5007', 280, 280, 450,  20, (select id from categories where name='المحرك والتبريد')),
('طلمبة زيت',                       '5008', 420, 420, 650,  14, (select id from categories where name='المحرك والتبريد')),
('مروحة تبريد كهربائية',            '5009', 700, 700, 1050, 8,  (select id from categories where name='المحرك والتبريد')),
-- 6) الإطارات والجنوط
('إطار 175/70 R13',                 '6001', 1200, 1200, 1650, 24, (select id from categories where name='الإطارات والجنوط')),
('إطار 185/65 R15',                 '6002', 1600, 1600, 2150, 20, (select id from categories where name='الإطارات والجنوط')),
('إطار 195/55 R16',                 '6003', 1900, 1900, 2500, 16, (select id from categories where name='الإطارات والجنوط')),
('جنط حديد 14 بوصة',                '6004', 600,  600,  900,  18, (select id from categories where name='الإطارات والجنوط')),
('جنط سبور 15 بوصة',                '6005', 1400, 1400, 2000, 12, (select id from categories where name='الإطارات والجنوط')),
('غطاء جنط (طاسة) طقم',             '6006', 220,  220,  360,  25, (select id from categories where name='الإطارات والجنوط')),
('صمام هواء (بلف) طقم',             '6007', 25,   25,   50,   80, (select id from categories where name='الإطارات والجنوط')),
('طقم صواميل عجل',                  '6008', 90,   90,   160,  40, (select id from categories where name='الإطارات والجنوط')),
('عجلة احتياطي (ستبني)',            '6009', 1100, 1100, 1550, 10, (select id from categories where name='الإطارات والجنوط')),
-- 7) الإضاءة والكشافات
('فانوس أمامي LED',                 '7001', 1100, 1100, 1600, 10, (select id from categories where name='الإضاءة والكشافات')),
('لمبة هالوجين H4',                 '7002', 60,   60,   110,  60, (select id from categories where name='الإضاءة والكشافات')),
('لمبة LED بيضاء H7',               '7003', 180,  180,  300,  40, (select id from categories where name='الإضاءة والكشافات')),
('كشاف ضباب أمامي',                 '7004', 320,  320,  500,  18, (select id from categories where name='الإضاءة والكشافات')),
('فانوس خلفي (ستوب)',               '7005', 450,  450,  700,  14, (select id from categories where name='الإضاءة والكشافات')),
('لمبة إشارة (فلاشر)',              '7006', 30,   30,   60,   70, (select id from categories where name='الإضاءة والكشافات')),
('كشاف داخلي LED',                  '7007', 70,   70,   130,  45, (select id from categories where name='الإضاءة والكشافات')),
('ريليه فلاشر',                     '7008', 80,   80,   140,  30, (select id from categories where name='الإضاءة والكشافات')),
('شريط LED مرن للديكور',            '7009', 120,  120,  220,  35, (select id from categories where name='الإضاءة والكشافات')),
-- 8) إكسسوارات وكماليات
('مساحات زجاج أمامي (طقم)',         '8001', 130,  130,  230,  50,  (select id from categories where name='إكسسوارات وكماليات')),
('فرش أرضية مطاط (طقم)',            '8002', 250,  250,  420,  30,  (select id from categories where name='إكسسوارات وكماليات')),
('كفر تابلوه جلد',                  '8003', 180,  180,  320,  25,  (select id from categories where name='إكسسوارات وكماليات')),
('شاحن موبايل للسيارة USB',         '8004', 90,   90,   170,  60,  (select id from categories where name='إكسسوارات وكماليات')),
('حامل موبايل مغناطيسي',            '8005', 70,   70,   140,  55,  (select id from categories where name='إكسسوارات وكماليات')),
('معطر جو للسيارة',                 '8006', 25,   25,   55,   100, (select id from categories where name='إكسسوارات وكماليات')),
('كاميرا خلفية للرجوع',             '8007', 350,  350,  580,  16,  (select id from categories where name='إكسسوارات وكماليات')),
('شاشة أندرويد 9 بوصة',             '8008', 2200, 2200, 3200, 8,   (select id from categories where name='إكسسوارات وكماليات')),
('طفاية حريق صغيرة للسيارة',        '8009', 150,  150,  270,  20,  (select id from categories where name='إكسسوارات وكماليات'))
on conflict (barcode) do nothing;

-- ============================================================
-- تم الإعداد بنجاح! قاعدة البيانات وجداول النظام وموديولات HANCES PRO جاهزة.
-- ============================================================
