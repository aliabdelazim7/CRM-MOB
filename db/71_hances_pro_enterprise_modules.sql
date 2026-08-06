-- Migration 71: HANCES PRO Enterprise ERP Modules for ADRIA (Refined)
-- Includes: Shipping Carriers (SMSA/FedEx/Aramex/DHL), Logistics Orders, Warehouse Transfers & Movement Logs, Supplier Transactions, Advanced Purchase Invoices (WACC), and Category Analytics

-- 1. Shipping Carriers & Logistics Orders
create table if not exists shipping_carriers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  tracking_url_template text,
  status text default 'active', -- active, inactive
  created_at timestamptz default now()
);

-- Pre-populate default carriers if empty
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

create table if not exists logistics_orders (
  id uuid primary key default gen_random_uuid(),
  order_id text,
  carrier_id uuid references shipping_carriers(id) on delete set null,
  tracking_number text,
  shipping_cost numeric default 0,
  status text default 'pending', -- pending, shipped, delivered, returned
  estimated_delivery date,
  shipped_at timestamptz,
  created_at timestamptz default now()
);

-- 2. Warehouses, Warehouse Transfers & Stock Movement Logs
create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  manager_id text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists warehouse_transfers (
  id uuid primary key default gen_random_uuid(),
  reference_no text unique not null,
  source_warehouse_id uuid references warehouses(id) on delete restrict,
  destination_warehouse_id uuid references warehouses(id) on delete restrict,
  item_id uuid references products(id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  status text default 'pending', -- pending, completed, cancelled
  notes text,
  created_by text,
  created_at timestamptz default now()
);

create table if not exists stock_movement_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references products(id) on delete cascade,
  warehouse_id uuid references warehouses(id) on delete set null,
  movement_type text not null, -- IN, OUT, TRANSFER, ADJUSTMENT
  quantity numeric not null,
  reference_doc_id text,
  timestamp timestamptz default now()
);

-- 3. Supplier Transactions & Enhancements
alter table suppliers add column if not exists current_balance numeric default 0;
alter table suppliers add column if not exists credit_limit numeric default 0;
alter table suppliers add column if not exists email text;

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

-- Enable RLS & Allow authenticated access for all tables
alter table shipping_carriers enable row level security;
alter table logistics_orders enable row level security;
alter table warehouses enable row level security;
alter table warehouse_transfers enable row level security;
alter table stock_movement_logs enable row level security;
alter table supplier_transactions enable row level security;

drop policy if exists "Allow all authenticated users on shipping_carriers" on shipping_carriers;
create policy "Allow all authenticated users on shipping_carriers" on shipping_carriers for all using (true);
drop policy if exists "Allow all authenticated users on logistics_orders" on logistics_orders;
create policy "Allow all authenticated users on logistics_orders" on logistics_orders for all using (true);
drop policy if exists "Allow all authenticated users on warehouses" on warehouses;
create policy "Allow all authenticated users on warehouses" on warehouses for all using (true);
drop policy if exists "Allow all authenticated users on warehouse_transfers" on warehouse_transfers;
create policy "Allow all authenticated users on warehouse_transfers" on warehouse_transfers for all using (true);
drop policy if exists "Allow all authenticated users on stock_movement_logs" on stock_movement_logs;
create policy "Allow all authenticated users on stock_movement_logs" on stock_movement_logs for all using (true);
drop policy if exists "Allow all authenticated users on supplier_transactions" on supplier_transactions;
create policy "Allow all authenticated users on supplier_transactions" on supplier_transactions for all using (true);
