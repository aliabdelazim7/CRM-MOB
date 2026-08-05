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
select 'متجر الفخامة للساعات والإكسسوارات والشنط', 'ج.م', 0, '#4f46e5', 0
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
select 'مخزن المعرض والفرع الثاني', 'معرض المنتجات', 'active'
where not exists (select 1 from warehouses where name = 'مخزن المعرض والفرع الثاني');

-- 4. التصنيفات (8 تصنيفات متخصصة)
insert into categories (name) values
  ('ساعات نسائية ورجالية'),
  ('سلاسل ونسبيات'),
  ('أساور وبراسلين'),
  ('شنط وحقائب يد'),
  ('خواتم ودلايات'),
  ('محافظ جلدية وإكسسوارات'),
  ('نظارات شمسية فاخرة'),
  ('طقم هدايا وتغليف')
on conflict do nothing;

-- 5. تشكيلة المنتجات والكوليكشن المتكامل
insert into products (name, barcode, purchase_price, average_purchase_price, sale_price, stock_quantity, category_id) values
-- 1) ساعات نسائية ورجالية
('ساعة رولكس ستيل مينا سوداء',              '1001', 1500, 1500, 2400, 15, (select id from categories where name='ساعات نسائية ورجالية')),
('ساعة كاسيو إيديفيس رجالي سبورت',           '1002', 650,  650,  1100, 25, (select id from categories where name='ساعات نسائية ورجالية')),
('ساعة كارتييه سانتوس جلد بني',              '1003', 1800, 1800, 2900, 10, (select id from categories where name='ساعات نسائية ورجالية')),
('ساعة أوميغا سيمستر استيل',                '1004', 2100, 2100, 3400, 8,  (select id from categories where name='ساعات نسائية ورجالية')),
('ساعة نسائية روز جولد فصوص كريستال',        '1005', 450,  450,  850,  30, (select id from categories where name='ساعات نسائية ورجالية')),
('ساعة ذكية سمارت ووتش الترا',               '1006', 550,  550,  950,  40, (select id from categories where name='ساعات نسائية ورجالية')),
('ساعة هوبلوت مطاط أسود رجالي',              '1007', 1400, 1400, 2200, 12, (select id from categories where name='ساعات نسائية ورجالية')),

-- 2) سلاسل ونسبيات
('سلسلة فضة عيار 925 دلاية قلب',             '2001', 280,  280,  480,  35, (select id from categories where name='سلاسل ونسبيات')),
('سلسلة ذهب صيني لون ثابت دلاية فراشة',      '2002', 120,  120,  240,  50, (select id from categories where name='سلاسل ونسبيات')),
('عقد لؤلؤ طبيعي كلاسيك',                  '2003', 450,  450,  850,  20, (select id from categories where name='سلاسل ونسبيات')),
('سلسلة رجالي كارتييه ستيل ذهبي',             '2004', 190,  190,  360,  30, (select id from categories where name='سلاسل ونسبيات')),
('سلسلة نسائية متعددة الطبقات Layered',     '2005', 160,  160,  310,  25, (select id from categories where name='سلاسل ونسبيات')),
('كوليه سهرة فصوص زيركون براقة',             '2006', 380,  380,  720,  15, (select id from categories where name='سلاسل ونسبيات')),

-- 3) أساور وبراسلين
('إسوارة كارتييه لوف ستيل ذهبي مع مفك',       '3001', 320,  320,  580,  30, (select id from categories where name='أساور وبراسلين')),
('إسوارة فان كليف أربيلس 5 وردات',          '3002', 290,  290,  540,  35, (select id from categories where name='أساور وبراسلين')),
('بوشرون إسوارة عريضة جولد',                '3003', 350,  350,  650,  20, (select id from categories where name='أساور وبراسلين')),
('أسوارة جلد رجالي مع قفل استيل',             '3004', 140,  140,  270,  40, (select id from categories where name='أساور وبراسلين')),
('طقم أساور تنس فصوص زيركون',               '3005', 260,  260,  490,  25, (select id from categories where name='أساور وبراسلين')),
('إسوارة فضة حريمي أحجار زرقاء',             '3006', 310,  310,  590,  18, (select id from categories where name='أساور وبراسلين')),

-- 4) شنط وحقائب يد
('شنطة يد كوتش جلد طبيعي بيج',              '4001', 850,  850,  1450, 15, (select id from categories where name='شنط وحقائب يد')),
('شنطة كروس شانيل غطاء حزام سلسلة',         '4002', 950,  950,  1650, 12, (select id from categories where name='شنط وحقائب يد')),
('شنطة ظهر لويس فيتون مونوغرام',             '4003', 1100, 1100, 1850, 10, (select id from categories where name='شنط وحقائب يد')),
('شنطة يد حريمي كلاسيك برادا سوداء',          '4004', 900,  900,  1550, 14, (select id from categories where name='شنط وحقائب يد')),
('شنطة يد وسط مايكل كورس جولد',             '4005', 780,  780,  1350, 18, (select id from categories where name='شنط وحقائب يد')),
('حقيبة يد نسائية للمناسبات والسهرة',         '4006', 420,  420,  780,  22, (select id from categories where name='شنط وحقائب يد')),

-- 5) خواتم ودلايات
('خاتم توينز فضة فصوص زيركون',              '5001', 210,  210,  390,  30, (select id from categories where name='خواتم ودلايات')),
('خاتم سوليتير أنيق لون فضي',               '5002', 180,  180,  340,  35, (select id from categories where name='خواتم ودلايات')),
('دبلة رجالي تيتانيوم أسود',                '5003', 130,  130,  250,  40, (select id from categories where name='خواتم ودلايات')),
('دلاية فضة عيار 925 شكل ما شاء الله',        '5004', 150,  150,  290,  25, (select id from categories where name='خواتم ودلايات')),

-- 6) محافظ جلدية وإكسسوارات
('محفظة رجالي جلد طبيعي تومي',               '6001', 180,  180,  340,  40, (select id from categories where name='محافظ جلدية وإكسسوارات')),
('محفظة كروت ذكية ألومنيوم ضد السرقة',        '6002', 90,   90,   190,  50, (select id from categories where name='محافظ جلدية وإكسسوارات')),
('بورتفيه نسائي سواريه جلد طبيعي',           '6003', 290,  290,  520,  25, (select id from categories where name='محافظ جلدية وإكسسوارات')),
('حزام رجالي جلد طبيعي قفل اتوماتيك',        '6004', 170,  170,  320,  30, (select id from categories where name='محافظ جلدية وإكسسوارات')),

-- 7) نظارات شمسية فاخرة
('نظارة شمسية راي بان أفياتور كلاسيك',        '7001', 420,  420,  780,  20, (select id from categories where name='نظارات شمسية فاخرة')),
('نظارة شمسية كارتييه فريم جولد',             '7002', 580,  580,  990,  15, (select id from categories where name='نظارات شمسية فاخرة')),
('نظارة شمسية حريمي كات آي ديور',            '7003', 480,  480,  850,  18, (select id from categories where name='نظارات شمسية فاخرة')),

-- 8) طقم هدايا وتغليف
('علبة هدايا قطيفة فاخرة للساعات والأسورة',    '8001', 45,   45,   95,   80, (select id from categories where name='طقم هدايا وتغليف')),
('بوكس هدايا VIP مجمع (ساعة + سلسلة + قلم + محفظة)', '8002', 750, 750, 1350, 15, (select id from categories where name='طقم هدايا وتغليف'))
on conflict (barcode) do nothing;

-- ============================================================
-- تم الإعداد بنجاح! قاعدة البيانات وتشكيلة الساعات والإكسسوارات والشنط جاهزة.
-- ============================================================
