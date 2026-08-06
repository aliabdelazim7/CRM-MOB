-- =============================================================================
-- HANCES PRO — MASTER SCHEMA RECONCILIATION SCRIPT (حل جذري شامل)
-- =============================================================================
--  هذا الملف يضمن وجود جميع الجداول والأعمدة الـ 44 الخاصة بالنظام بالكامل.
--  آمن للتشغيل في أي وقت (Idempotent)، ولا يمس البيانات الحالية إطلاقاً.
-- =============================================================================

-- ── حظر التعارضات مع الـ Views القديمة إن وجدت ─────────────────────────────────
drop view if exists v_stock_gap cascade;

-- ── Table: products ─────────────────────────────────────────
create table if not exists products (id text primary key, created_at timestamptz default now());
alter table products add column if not exists name text;
alter table products add column if not exists barcode text;
alter table products add column if not exists image_url text;
alter table products add column if not exists purchase_price numeric default 0;
alter table products add column if not exists average_purchase_price numeric default 0;
alter table products add column if not exists sale_price numeric default 0;
alter table products add column if not exists discount_price numeric default 0;
alter table products add column if not exists wholesale_price numeric default 0;
alter table products add column if not exists half_wholesale_price numeric default 0;
alter table products add column if not exists season text;
alter table products add column if not exists stock_quantity numeric default 0;
alter table products add column if not exists display_quantity numeric default 0;
alter table products add column if not exists factory_quantity numeric default 0;
alter table products add column if not exists category_id text;
alter table products add column if not exists unit text;
alter table products add column if not exists is_hidden boolean default false;
alter table products add column if not exists color text;
alter table products add column if not exists supplier_name text;
alter table products add column if not exists website_ad_cost numeric default 0;
alter table products add column if not exists amazon_price numeric default 0;
alter table products add column if not exists amazon_discount_price numeric default 0;
alter table products add column if not exists amazon_commission numeric default 0;
alter table products add column if not exists amazon_ad_cost numeric default 0;
alter table products add column if not exists amazon_shipping numeric default 0;
alter table products add column if not exists noon_price numeric default 0;
alter table products add column if not exists noon_discount_price numeric default 0;
alter table products add column if not exists noon_commission numeric default 0;
alter table products add column if not exists noon_shipping numeric default 0;
alter table products add column if not exists noon_ad_cost numeric default 0;
alter table products add column if not exists jumia_price numeric default 0;
alter table products add column if not exists jumia_discount_price numeric default 0;
alter table products add column if not exists jumia_commission numeric default 0;
alter table products add column if not exists jumia_shipping numeric default 0;
alter table products add column if not exists jumia_ad_cost numeric default 0;
alter table products add column if not exists custom_stores jsonb;
alter table products enable row level security;
drop policy if exists "allow_all_anon_authenticated" on products;
create policy "allow_all_anon_authenticated" on products for all to anon, authenticated using (true) with check (true);
grant all on products to anon, authenticated;

-- ── Table: materials ─────────────────────────────────────────
create table if not exists materials (id text primary key, created_at timestamptz default now());
alter table materials add column if not exists name text;
alter table materials add column if not exists unit text;
alter table materials add column if not exists cost_per_unit numeric default 0;
alter table materials add column if not exists stock_quantity numeric default 0;
alter table materials add column if not exists supplier_id text;
alter table materials add column if not exists created_at text;
alter table materials enable row level security;
drop policy if exists "allow_all_anon_authenticated" on materials;
create policy "allow_all_anon_authenticated" on materials for all to anon, authenticated using (true) with check (true);
grant all on materials to anon, authenticated;

-- ── Table: production_orders ─────────────────────────────────────────
create table if not exists production_orders (id text primary key, created_at timestamptz default now());
alter table production_orders add column if not exists product_id text;
alter table production_orders add column if not exists product_name text;
alter table production_orders add column if not exists color text;
alter table production_orders add column if not exists code text;
alter table production_orders add column if not exists quantity numeric default 0;
alter table production_orders add column if not exists materials_cost numeric default 0;
alter table production_orders add column if not exists extra_costs numeric default 0;
alter table production_orders add column if not exists total_cost numeric default 0;
alter table production_orders add column if not exists cost_per_piece numeric default 0;
alter table production_orders add column if not exists sale_price numeric default 0;
alter table production_orders add column if not exists notes text;
alter table production_orders add column if not exists created_at text;
alter table production_orders enable row level security;
drop policy if exists "allow_all_anon_authenticated" on production_orders;
create policy "allow_all_anon_authenticated" on production_orders for all to anon, authenticated using (true) with check (true);
grant all on production_orders to anon, authenticated;

-- ── Table: devo_items ─────────────────────────────────────────
create table if not exists devo_items (id text primary key, created_at timestamptz default now());
alter table devo_items add column if not exists product_id text;
alter table devo_items add column if not exists product_name text;
alter table devo_items add column if not exists barcode text;
alter table devo_items add column if not exists quantity numeric default 0;
alter table devo_items add column if not exists unit_cost numeric default 0;
alter table devo_items add column if not exists supplier_id text;
alter table devo_items add column if not exists supplier_name text;
alter table devo_items add column if not exists reason text;
alter table devo_items add column if not exists status text;
alter table devo_items add column if not exists note text;
alter table devo_items add column if not exists created_at text;
alter table devo_items add column if not exists updated_at text;
alter table devo_items enable row level security;
drop policy if exists "allow_all_anon_authenticated" on devo_items;
create policy "allow_all_anon_authenticated" on devo_items for all to anon, authenticated using (true) with check (true);
grant all on devo_items to anon, authenticated;

-- ── Table: write_offs ─────────────────────────────────────────
create table if not exists write_offs (id text primary key, created_at timestamptz default now());
alter table write_offs add column if not exists product_id text;
alter table write_offs add column if not exists product_name text;
alter table write_offs add column if not exists barcode text;
alter table write_offs add column if not exists quantity numeric default 0;
alter table write_offs add column if not exists unit_cost numeric default 0;
alter table write_offs add column if not exists total_cost numeric default 0;
alter table write_offs add column if not exists reason text;
alter table write_offs add column if not exists created_at text;
alter table write_offs enable row level security;
drop policy if exists "allow_all_anon_authenticated" on write_offs;
create policy "allow_all_anon_authenticated" on write_offs for all to anon, authenticated using (true) with check (true);
grant all on write_offs to anon, authenticated;

-- ── Table: categories ─────────────────────────────────────────
create table if not exists categories (id text primary key, created_at timestamptz default now());
alter table categories add column if not exists name text;
alter table categories add column if not exists image_url text;
alter table categories enable row level security;
drop policy if exists "allow_all_anon_authenticated" on categories;
create policy "allow_all_anon_authenticated" on categories for all to anon, authenticated using (true) with check (true);
grant all on categories to anon, authenticated;

-- ── Table: customers ─────────────────────────────────────────
create table if not exists customers (id text primary key, created_at timestamptz default now());
alter table customers add column if not exists name text;
alter table customers add column if not exists phone text;
alter table customers add column if not exists timestamp text;
alter table customers add column if not exists custom_id text;
alter table customers add column if not exists card_number text;
alter table customers enable row level security;
drop policy if exists "allow_all_anon_authenticated" on customers;
create policy "allow_all_anon_authenticated" on customers for all to anon, authenticated using (true) with check (true);
grant all on customers to anon, authenticated;

-- ── Table: suppliers ─────────────────────────────────────────
create table if not exists suppliers (id text primary key, created_at timestamptz default now());
alter table suppliers add column if not exists name text;
alter table suppliers add column if not exists phone text;
alter table suppliers add column if not exists address text;
alter table suppliers add column if not exists balance numeric default 0;
alter table suppliers add column if not exists created_at text;
alter table suppliers enable row level security;
drop policy if exists "allow_all_anon_authenticated" on suppliers;
create policy "allow_all_anon_authenticated" on suppliers for all to anon, authenticated using (true) with check (true);
grant all on suppliers to anon, authenticated;

-- ── Table: cashiers ─────────────────────────────────────────
create table if not exists cashiers (id text primary key, created_at timestamptz default now());
alter table cashiers add column if not exists name text;
alter table cashiers add column if not exists password text;
alter table cashiers add column if not exists pin text;
alter table cashiers add column if not exists phone text;
alter table cashiers add column if not exists photo_url text;
alter table cashiers add column if not exists created_at text;
alter table cashiers add column if not exists email text;
alter table cashiers add column if not exists full_access boolean default false;
alter table cashiers enable row level security;
drop policy if exists "allow_all_anon_authenticated" on cashiers;
create policy "allow_all_anon_authenticated" on cashiers for all to anon, authenticated using (true) with check (true);
grant all on cashiers to anon, authenticated;

-- ── Table: purchase_invoices ─────────────────────────────────────────
create table if not exists purchase_invoices (id text primary key, created_at timestamptz default now());
alter table purchase_invoices add column if not exists invoice_number text;
alter table purchase_invoices add column if not exists supplier_id text;
alter table purchase_invoices add column if not exists total numeric default 0;
alter table purchase_invoices add column if not exists paid_amount numeric default 0;
alter table purchase_invoices add column if not exists paid_cash numeric default 0;
alter table purchase_invoices add column if not exists paid_visa numeric default 0;
alter table purchase_invoices add column if not exists paid_wallet numeric default 0;
alter table purchase_invoices add column if not exists paid_instapay numeric default 0;
alter table purchase_invoices add column if not exists paid_method5 numeric default 0;
alter table purchase_invoices add column if not exists paid_method6 numeric default 0;
alter table purchase_invoices add column if not exists payment_method text;
alter table purchase_invoices add column if not exists created_at text;
alter table purchase_invoices add column if not exists notes text;
alter table purchase_invoices add column if not exists source_invoice_id text;
alter table purchase_invoices add column if not exists items text;
alter table purchase_invoices enable row level security;
drop policy if exists "allow_all_anon_authenticated" on purchase_invoices;
create policy "allow_all_anon_authenticated" on purchase_invoices for all to anon, authenticated using (true) with check (true);
grant all on purchase_invoices to anon, authenticated;

-- ── Table: purchase_items ─────────────────────────────────────────
create table if not exists purchase_items (id text primary key, created_at timestamptz default now());
alter table purchase_items add column if not exists product_id text;
alter table purchase_items add column if not exists quantity numeric default 0;
alter table purchase_items add column if not exists purchase_price numeric default 0;
alter table purchase_items add column if not exists to_display numeric default 0;
alter table purchase_items enable row level security;
drop policy if exists "allow_all_anon_authenticated" on purchase_items;
create policy "allow_all_anon_authenticated" on purchase_items for all to anon, authenticated using (true) with check (true);
grant all on purchase_items to anon, authenticated;

-- ── Table: stock_intakes ─────────────────────────────────────────
create table if not exists stock_intakes (id text primary key, created_at timestamptz default now());
alter table stock_intakes add column if not exists product_id text;
alter table stock_intakes add column if not exists product_name text;
alter table stock_intakes add column if not exists quantity numeric default 0;
alter table stock_intakes add column if not exists unit_cost numeric default 0;
alter table stock_intakes add column if not exists total_value numeric default 0;
alter table stock_intakes add column if not exists source text;
alter table stock_intakes add column if not exists note text;
alter table stock_intakes add column if not exists created_at text;
alter table stock_intakes enable row level security;
drop policy if exists "allow_all_anon_authenticated" on stock_intakes;
create policy "allow_all_anon_authenticated" on stock_intakes for all to anon, authenticated using (true) with check (true);
grant all on stock_intakes to anon, authenticated;

-- ── Table: orders ─────────────────────────────────────────
create table if not exists orders (id text primary key, created_at timestamptz default now());
alter table orders add column if not exists items text;
alter table orders add column if not exists total numeric default 0;
alter table orders add column if not exists paid_amount numeric default 0;
alter table orders add column if not exists paid_cash numeric default 0;
alter table orders add column if not exists paid_visa numeric default 0;
alter table orders add column if not exists paid_wallet numeric default 0;
alter table orders add column if not exists paid_instapay numeric default 0;
alter table orders add column if not exists paid_method5 numeric default 0;
alter table orders add column if not exists paid_method6 numeric default 0;
alter table orders add column if not exists type text;
alter table orders add column if not exists date text;
alter table orders add column if not exists payment_method text;
alter table orders add column if not exists refund_method text;
alter table orders add column if not exists refunded_cash numeric default 0;
alter table orders add column if not exists refunded_visa numeric default 0;
alter table orders add column if not exists refunded_wallet numeric default 0;
alter table orders add column if not exists refunded_instapay numeric default 0;
alter table orders add column if not exists refunded_method5 numeric default 0;
alter table orders add column if not exists refunded_method6 numeric default 0;
alter table orders add column if not exists refunded_at text;
alter table orders add column if not exists customer text;
alter table orders add column if not exists cashier_name text;
alter table orders add column if not exists salesperson_id text;
alter table orders add column if not exists salesperson_name text;
alter table orders add column if not exists sales_channel text;
alter table orders add column if not exists platform_name text;
alter table orders add column if not exists isOffline boolean default false;
alter table orders add column if not exists is_deleted boolean default false;
alter table orders add column if not exists deleted_at text;
alter table orders add column if not exists deletion_reason text;
alter table orders add column if not exists notes text;
alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists discount_amount numeric default 0;
alter table orders add column if not exists car_id text;
alter table orders add column if not exists exchange_data text;
alter table orders enable row level security;
drop policy if exists "allow_all_anon_authenticated" on orders;
create policy "allow_all_anon_authenticated" on orders for all to anon, authenticated using (true) with check (true);
grant all on orders to anon, authenticated;

-- ── Table: held_invoices ─────────────────────────────────────────
create table if not exists held_invoices (id text primary key, created_at timestamptz default now());
alter table held_invoices add column if not exists customer_name text;
alter table held_invoices add column if not exists customer_phone text;
alter table held_invoices add column if not exists customer_custom_id text;
alter table held_invoices add column if not exists items text;
alter table held_invoices add column if not exists total numeric default 0;
alter table held_invoices add column if not exists invoice_type text;
alter table held_invoices add column if not exists salesperson_id text;
alter table held_invoices add column if not exists salesperson_name text;
alter table held_invoices add column if not exists cashier_name text;
alter table held_invoices add column if not exists notes text;
alter table held_invoices add column if not exists deposit numeric default 0;
alter table held_invoices add column if not exists deposit_split numeric default 0;
alter table held_invoices add column if not exists created_at text;
alter table held_invoices add column if not exists expires_at text;
alter table held_invoices add column if not exists customer_address text;
alter table held_invoices add column if not exists shipping_note text;
alter table held_invoices add column if not exists kind text;
alter table held_invoices add column if not exists status text;
alter table held_invoices add column if not exists return_data text;
alter table held_invoices add column if not exists returned_at text;
alter table held_invoices add column if not exists shipping_return_cost numeric default 0;
alter table held_invoices add column if not exists order_id text;
alter table held_invoices add column if not exists status_at text;
alter table held_invoices add column if not exists status_note text;
alter table held_invoices enable row level security;
drop policy if exists "allow_all_anon_authenticated" on held_invoices;
create policy "allow_all_anon_authenticated" on held_invoices for all to anon, authenticated using (true) with check (true);
grant all on held_invoices to anon, authenticated;

-- ── Table: expenses ─────────────────────────────────────────
create table if not exists expenses (id text primary key, created_at timestamptz default now());
alter table expenses add column if not exists category text;
alter table expenses add column if not exists amount numeric default 0;
alter table expenses add column if not exists paid_cash numeric default 0;
alter table expenses add column if not exists paid_visa numeric default 0;
alter table expenses add column if not exists paid_wallet numeric default 0;
alter table expenses add column if not exists paid_instapay numeric default 0;
alter table expenses add column if not exists paid_method5 numeric default 0;
alter table expenses add column if not exists paid_method6 numeric default 0;
alter table expenses add column if not exists note text;
alter table expenses add column if not exists payment_method text;
alter table expenses add column if not exists date text;
alter table expenses add column if not exists car_id text;
alter table expenses add column if not exists employee_transaction_id text;
alter table expenses enable row level security;
drop policy if exists "allow_all_anon_authenticated" on expenses;
create policy "allow_all_anon_authenticated" on expenses for all to anon, authenticated using (true) with check (true);
grant all on expenses to anon, authenticated;

-- ── Table: car_subscriptions ─────────────────────────────────────────
create table if not exists car_subscriptions (id text primary key, created_at timestamptz default now());
alter table car_subscriptions add column if not exists car_number text;
alter table car_subscriptions add column if not exists car_details text;
alter table car_subscriptions add column if not exists customer_name text;
alter table car_subscriptions add column if not exists customer_phone text;
alter table car_subscriptions add column if not exists created_at text;
alter table car_subscriptions add column if not exists status text;
alter table car_subscriptions add column if not exists subscription_duration_months numeric default 0;
alter table car_subscriptions add column if not exists subscription_frequency_days numeric default 0;
alter table car_subscriptions enable row level security;
drop policy if exists "allow_all_anon_authenticated" on car_subscriptions;
create policy "allow_all_anon_authenticated" on car_subscriptions for all to anon, authenticated using (true) with check (true);
grant all on car_subscriptions to anon, authenticated;

-- ── Table: maintenance_appointments ─────────────────────────────────────────
create table if not exists maintenance_appointments (id text primary key, created_at timestamptz default now());
alter table maintenance_appointments add column if not exists subscription_id text;
alter table maintenance_appointments add column if not exists appointment_date text;
alter table maintenance_appointments add column if not exists description text;
alter table maintenance_appointments add column if not exists report text;
alter table maintenance_appointments add column if not exists cost numeric default 0;
alter table maintenance_appointments add column if not exists status text;
alter table maintenance_appointments add column if not exists is_reminded boolean default false;
alter table maintenance_appointments add column if not exists created_at text;
alter table maintenance_appointments enable row level security;
drop policy if exists "allow_all_anon_authenticated" on maintenance_appointments;
create policy "allow_all_anon_authenticated" on maintenance_appointments for all to anon, authenticated using (true) with check (true);
grant all on maintenance_appointments to anon, authenticated;

-- ── Table: financing_accounts ─────────────────────────────────────────
create table if not exists financing_accounts (id text primary key, created_at timestamptz default now());
alter table financing_accounts add column if not exists type text;
alter table financing_accounts add column if not exists lender_name text;
alter table financing_accounts add column if not exists lender_phone text;
alter table financing_accounts add column if not exists lender_details text;
alter table financing_accounts add column if not exists description text;
alter table financing_accounts add column if not exists principal_amount numeric default 0;
alter table financing_accounts add column if not exists collection_amount numeric default 0;
alter table financing_accounts add column if not exists collection_date text;
alter table financing_accounts add column if not exists installment_count numeric default 0;
alter table financing_accounts add column if not exists status text;
alter table financing_accounts add column if not exists created_at text;
alter table financing_accounts enable row level security;
drop policy if exists "allow_all_anon_authenticated" on financing_accounts;
create policy "allow_all_anon_authenticated" on financing_accounts for all to anon, authenticated using (true) with check (true);
grant all on financing_accounts to anon, authenticated;

-- ── Table: financing_payments ─────────────────────────────────────────
create table if not exists financing_payments (id text primary key, created_at timestamptz default now());
alter table financing_payments add column if not exists account_id text;
alter table financing_payments add column if not exists payment_type text;
alter table financing_payments add column if not exists due_date text;
alter table financing_payments add column if not exists amount numeric default 0;
alter table financing_payments add column if not exists paid_amount numeric default 0;
alter table financing_payments add column if not exists remaining_amount numeric default 0;
alter table financing_payments add column if not exists status text;
alter table financing_payments add column if not exists paid_at text;
alter table financing_payments add column if not exists expense_id text;
alter table financing_payments add column if not exists note text;
alter table financing_payments enable row level security;
drop policy if exists "allow_all_anon_authenticated" on financing_payments;
create policy "allow_all_anon_authenticated" on financing_payments for all to anon, authenticated using (true) with check (true);
grant all on financing_payments to anon, authenticated;

-- ── Table: financing_transactions ─────────────────────────────────────────
create table if not exists financing_transactions (id text primary key, created_at timestamptz default now());
alter table financing_transactions add column if not exists account_id text;
alter table financing_transactions add column if not exists payment_id text;
alter table financing_transactions add column if not exists transaction_type text;
alter table financing_transactions add column if not exists amount numeric default 0;
alter table financing_transactions add column if not exists remaining_after numeric default 0;
alter table financing_transactions add column if not exists payment_method text;
alter table financing_transactions add column if not exists expense_id text;
alter table financing_transactions add column if not exists note text;
alter table financing_transactions add column if not exists created_at text;
alter table financing_transactions enable row level security;
drop policy if exists "allow_all_anon_authenticated" on financing_transactions;
create policy "allow_all_anon_authenticated" on financing_transactions for all to anon, authenticated using (true) with check (true);
grant all on financing_transactions to anon, authenticated;

-- ── Table: store_settings ─────────────────────────────────────────
create table if not exists store_settings (id text primary key, created_at timestamptz default now());
alter table store_settings add column if not exists name text;
alter table store_settings add column if not exists currency text;
alter table store_settings add column if not exists logo text;
alter table store_settings add column if not exists taxRate numeric default 0;
alter table store_settings add column if not exists themeColor text;
alter table store_settings add column if not exists address text;
alter table store_settings add column if not exists phone text;
alter table store_settings add column if not exists phone2 text;
alter table store_settings add column if not exists whatsappCountryCode text;
alter table store_settings add column if not exists initial_balance numeric default 0;
alter table store_settings add column if not exists locationUrl text;
alter table store_settings add column if not exists cashierPermissions boolean default false;
alter table store_settings add column if not exists paymentLabels jsonb;
alter table store_settings add column if not exists paymentMethodsEnabled boolean default false;
alter table store_settings add column if not exists paymentOpeningBalances numeric default 0;
alter table store_settings add column if not exists savingsOpeningBalances numeric default 0;
alter table store_settings add column if not exists showInvoiceProfit boolean default false;
alter table store_settings add column if not exists allowCashierEmployeeAdvance boolean default false;
alter table store_settings add column if not exists dayStartHour numeric default 0;
alter table store_settings add column if not exists expenseCategories text;
alter table store_settings add column if not exists incomeCategories text;
alter table store_settings add column if not exists pagesQrUrl text;
alter table store_settings add column if not exists pagesQrLabel text;
alter table store_settings add column if not exists pagesQrImage text;
alter table store_settings enable row level security;
drop policy if exists "allow_all_anon_authenticated" on store_settings;
create policy "allow_all_anon_authenticated" on store_settings for all to anon, authenticated using (true) with check (true);
grant all on store_settings to anon, authenticated;

-- ── Table: employees ─────────────────────────────────────────
create table if not exists employees (id text primary key, created_at timestamptz default now());
alter table employees add column if not exists name text;
alter table employees add column if not exists job_title text;
alter table employees add column if not exists phone text;
alter table employees add column if not exists working_hours text;
alter table employees add column if not exists monthly_salary numeric default 0;
alter table employees add column if not exists annual_leave_balance numeric default 0;
alter table employees add column if not exists monthly_leave_days numeric default 0;
alter table employees add column if not exists shift_start text;
alter table employees add column if not exists shift_end text;
alter table employees add column if not exists late_grace_minutes numeric default 0;
alter table employees add column if not exists friday_shift_start text;
alter table employees add column if not exists friday_shift_end text;
alter table employees add column if not exists friday_is_off boolean default false;
alter table employees add column if not exists hire_date text;
alter table employees add column if not exists is_active boolean default false;
alter table employees add column if not exists created_at text;
alter table employees add column if not exists cashier_id text;
alter table employees add column if not exists commission_rate numeric default 0;
alter table employees add column if not exists attendance_pin text;
alter table employees enable row level security;
drop policy if exists "allow_all_anon_authenticated" on employees;
create policy "allow_all_anon_authenticated" on employees for all to anon, authenticated using (true) with check (true);
grant all on employees to anon, authenticated;

-- ── Table: employee_transactions ─────────────────────────────────────────
create table if not exists employee_transactions (id text primary key, created_at timestamptz default now());
alter table employee_transactions add column if not exists employee_id text;
alter table employee_transactions add column if not exists amount numeric default 0;
alter table employee_transactions add column if not exists type text;
alter table employee_transactions add column if not exists payment_method text;
alter table employee_transactions add column if not exists paid_cash numeric default 0;
alter table employee_transactions add column if not exists paid_visa numeric default 0;
alter table employee_transactions add column if not exists paid_wallet numeric default 0;
alter table employee_transactions add column if not exists paid_instapay numeric default 0;
alter table employee_transactions add column if not exists paid_method5 numeric default 0;
alter table employee_transactions add column if not exists paid_method6 numeric default 0;
alter table employee_transactions add column if not exists month text;
alter table employee_transactions add column if not exists deductions numeric default 0;
alter table employee_transactions add column if not exists note text;
alter table employee_transactions add column if not exists created_at text;
alter table employee_transactions enable row level security;
drop policy if exists "allow_all_anon_authenticated" on employee_transactions;
create policy "allow_all_anon_authenticated" on employee_transactions for all to anon, authenticated using (true) with check (true);
grant all on employee_transactions to anon, authenticated;

-- ── Table: employee_leaves ─────────────────────────────────────────
create table if not exists employee_leaves (id text primary key, created_at timestamptz default now());
alter table employee_leaves add column if not exists employee_id text;
alter table employee_leaves add column if not exists start_date text;
alter table employee_leaves add column if not exists end_date text;
alter table employee_leaves add column if not exists days_count numeric default 0;
alter table employee_leaves add column if not exists leave_type text;
alter table employee_leaves add column if not exists deduction_amount numeric default 0;
alter table employee_leaves add column if not exists month text;
alter table employee_leaves add column if not exists note text;
alter table employee_leaves add column if not exists created_at text;
alter table employee_leaves add column if not exists waived_amount numeric default 0;
alter table employee_leaves add column if not exists waived_at text;
alter table employee_leaves add column if not exists waive_note text;
alter table employee_leaves enable row level security;
drop policy if exists "allow_all_anon_authenticated" on employee_leaves;
create policy "allow_all_anon_authenticated" on employee_leaves for all to anon, authenticated using (true) with check (true);
grant all on employee_leaves to anon, authenticated;

-- ── Table: employee_deductions ─────────────────────────────────────────
create table if not exists employee_deductions (id text primary key, created_at timestamptz default now());
alter table employee_deductions add column if not exists employee_id text;
alter table employee_deductions add column if not exists amount numeric default 0;
alter table employee_deductions add column if not exists days numeric default 0;
alter table employee_deductions add column if not exists reason text;
alter table employee_deductions add column if not exists month text;
alter table employee_deductions add column if not exists date text;
alter table employee_deductions add column if not exists created_at text;
alter table employee_deductions add column if not exists waived_amount numeric default 0;
alter table employee_deductions add column if not exists waived_at text;
alter table employee_deductions add column if not exists waive_note text;
alter table employee_deductions enable row level security;
drop policy if exists "allow_all_anon_authenticated" on employee_deductions;
create policy "allow_all_anon_authenticated" on employee_deductions for all to anon, authenticated using (true) with check (true);
grant all on employee_deductions to anon, authenticated;

-- ── Table: employee_bonuses ─────────────────────────────────────────
create table if not exists employee_bonuses (id text primary key, created_at timestamptz default now());
alter table employee_bonuses add column if not exists employee_id text;
alter table employee_bonuses add column if not exists amount numeric default 0;
alter table employee_bonuses add column if not exists reason text;
alter table employee_bonuses add column if not exists month text;
alter table employee_bonuses add column if not exists date text;
alter table employee_bonuses add column if not exists created_at text;
alter table employee_bonuses enable row level security;
drop policy if exists "allow_all_anon_authenticated" on employee_bonuses;
create policy "allow_all_anon_authenticated" on employee_bonuses for all to anon, authenticated using (true) with check (true);
grant all on employee_bonuses to anon, authenticated;

-- ── Table: employee_attendance ─────────────────────────────────────────
create table if not exists employee_attendance (id text primary key, created_at timestamptz default now());
alter table employee_attendance add column if not exists employee_id text;
alter table employee_attendance add column if not exists date text;
alter table employee_attendance add column if not exists check_in text;
alter table employee_attendance add column if not exists check_out text;
alter table employee_attendance add column if not exists shift_start text;
alter table employee_attendance add column if not exists late_minutes numeric default 0;
alter table employee_attendance add column if not exists deduction_amount numeric default 0;
alter table employee_attendance add column if not exists month text;
alter table employee_attendance add column if not exists note text;
alter table employee_attendance add column if not exists created_at text;
alter table employee_attendance add column if not exists waived_amount numeric default 0;
alter table employee_attendance add column if not exists waived_at text;
alter table employee_attendance add column if not exists waive_note text;
alter table employee_attendance enable row level security;
drop policy if exists "allow_all_anon_authenticated" on employee_attendance;
create policy "allow_all_anon_authenticated" on employee_attendance for all to anon, authenticated using (true) with check (true);
grant all on employee_attendance to anon, authenticated;

-- ── Table: product_suggestions ─────────────────────────────────────────
create table if not exists product_suggestions (id text primary key, created_at timestamptz default now());
alter table product_suggestions add column if not exists name text;
alter table product_suggestions add column if not exists notes text;
alter table product_suggestions add column if not exists is_purchased boolean default false;
alter table product_suggestions add column if not exists created_at text;
alter table product_suggestions enable row level security;
drop policy if exists "allow_all_anon_authenticated" on product_suggestions;
create policy "allow_all_anon_authenticated" on product_suggestions for all to anon, authenticated using (true) with check (true);
grant all on product_suggestions to anon, authenticated;

-- ── Table: coupons ─────────────────────────────────────────
create table if not exists coupons (id text primary key, created_at timestamptz default now());
alter table coupons add column if not exists code text;
alter table coupons add column if not exists discount_type text;
alter table coupons add column if not exists discount_value numeric default 0;
alter table coupons add column if not exists start_date text;
alter table coupons add column if not exists end_date text;
alter table coupons add column if not exists max_uses_per_customer numeric default 0;
alter table coupons add column if not exists max_uses_total numeric default 0;
alter table coupons add column if not exists used_count numeric default 0;
alter table coupons add column if not exists is_active boolean default false;
alter table coupons add column if not exists created_at text;
alter table coupons enable row level security;
drop policy if exists "allow_all_anon_authenticated" on coupons;
create policy "allow_all_anon_authenticated" on coupons for all to anon, authenticated using (true) with check (true);
grant all on coupons to anon, authenticated;

-- ── Table: cashier_notes ─────────────────────────────────────────
create table if not exists cashier_notes (id text primary key, created_at timestamptz default now());
alter table cashier_notes add column if not exists cashier_name text;
alter table cashier_notes add column if not exists note text;
alter table cashier_notes add column if not exists is_read boolean default false;
alter table cashier_notes add column if not exists created_at text;
alter table cashier_notes enable row level security;
drop policy if exists "allow_all_anon_authenticated" on cashier_notes;
create policy "allow_all_anon_authenticated" on cashier_notes for all to anon, authenticated using (true) with check (true);
grant all on cashier_notes to anon, authenticated;

-- ── Table: admin_users ─────────────────────────────────────────
create table if not exists admin_users (id text primary key, created_at timestamptz default now());
alter table admin_users add column if not exists name text;
alter table admin_users add column if not exists password text;
alter table admin_users add column if not exists email text;
alter table admin_users add column if not exists permissions text;
alter table admin_users add column if not exists created_at text;
alter table admin_users enable row level security;
drop policy if exists "allow_all_anon_authenticated" on admin_users;
create policy "allow_all_anon_authenticated" on admin_users for all to anon, authenticated using (true) with check (true);
grant all on admin_users to anon, authenticated;

-- ── Table: platform_collections ─────────────────────────────────────────
create table if not exists platform_collections (id text primary key, created_at timestamptz default now());
alter table platform_collections add column if not exists entity_type text;
alter table platform_collections add column if not exists entity_name text;
alter table platform_collections add column if not exists month text;
alter table platform_collections add column if not exists expected_amount numeric default 0;
alter table platform_collections add column if not exists collected_amount numeric default 0;
alter table platform_collections add column if not exists status text;
alter table platform_collections add column if not exists notes text;
alter table platform_collections add column if not exists created_at text;
alter table platform_collections enable row level security;
drop policy if exists "allow_all_anon_authenticated" on platform_collections;
create policy "allow_all_anon_authenticated" on platform_collections for all to anon, authenticated using (true) with check (true);
grant all on platform_collections to anon, authenticated;

-- ── Table: shipping_carriers ─────────────────────────────────────────
create table if not exists shipping_carriers (id text primary key, created_at timestamptz default now());
alter table shipping_carriers add column if not exists name text;
alter table shipping_carriers add column if not exists contact_person text;
alter table shipping_carriers add column if not exists phone text;
alter table shipping_carriers add column if not exists email text;
alter table shipping_carriers add column if not exists address text;
alter table shipping_carriers add column if not exists rate_per_kg numeric default 0;
alter table shipping_carriers add column if not exists base_fee numeric default 0;
alter table shipping_carriers add column if not exists tracking_url_template text;
alter table shipping_carriers add column if not exists notes text;
alter table shipping_carriers add column if not exists status text;
alter table shipping_carriers add column if not exists created_at text;
alter table shipping_carriers enable row level security;
drop policy if exists "allow_all_anon_authenticated" on shipping_carriers;
create policy "allow_all_anon_authenticated" on shipping_carriers for all to anon, authenticated using (true) with check (true);
grant all on shipping_carriers to anon, authenticated;

-- ── Table: shipments ─────────────────────────────────────────
create table if not exists shipments (id text primary key, created_at timestamptz default now());
alter table shipments add column if not exists carrier_id text;
alter table shipments add column if not exists invoice_id text;
alter table shipments add column if not exists tracking_number text;
alter table shipments add column if not exists status text;
alter table shipments add column if not exists shipping_cost numeric default 0;
alter table shipments add column if not exists delivery_fee numeric default 0;
alter table shipments add column if not exists recipient_name text;
alter table shipments add column if not exists recipient_phone text;
alter table shipments add column if not exists recipient_address text;
alter table shipments add column if not exists estimated_delivery text;
alter table shipments add column if not exists delivered_at text;
alter table shipments add column if not exists notes text;
alter table shipments add column if not exists created_at text;
alter table shipments enable row level security;
drop policy if exists "allow_all_anon_authenticated" on shipments;
create policy "allow_all_anon_authenticated" on shipments for all to anon, authenticated using (true) with check (true);
grant all on shipments to anon, authenticated;

-- ── Table: warehouses ─────────────────────────────────────────
create table if not exists warehouses (id text primary key, created_at timestamptz default now());
alter table warehouses add column if not exists name text;
alter table warehouses add column if not exists code text;
alter table warehouses add column if not exists location text;
alter table warehouses add column if not exists manager_name text;
alter table warehouses add column if not exists phone text;
alter table warehouses add column if not exists is_default boolean default false;
alter table warehouses add column if not exists created_at text;
alter table warehouses enable row level security;
drop policy if exists "allow_all_anon_authenticated" on warehouses;
create policy "allow_all_anon_authenticated" on warehouses for all to anon, authenticated using (true) with check (true);
grant all on warehouses to anon, authenticated;

-- ── Table: warehouse_stock ─────────────────────────────────────────
create table if not exists warehouse_stock (id text primary key, created_at timestamptz default now());
alter table warehouse_stock add column if not exists warehouse_id text;
alter table warehouse_stock add column if not exists product_id text;
alter table warehouse_stock add column if not exists stock_quantity numeric default 0;
alter table warehouse_stock add column if not exists min_stock numeric default 0;
alter table warehouse_stock enable row level security;
drop policy if exists "allow_all_anon_authenticated" on warehouse_stock;
create policy "allow_all_anon_authenticated" on warehouse_stock for all to anon, authenticated using (true) with check (true);
grant all on warehouse_stock to anon, authenticated;

-- ── Table: stock_transfers ─────────────────────────────────────────
create table if not exists stock_transfers (id text primary key, created_at timestamptz default now());
alter table stock_transfers add column if not exists transfer_number text;
alter table stock_transfers add column if not exists source_warehouse_id text;
alter table stock_transfers add column if not exists target_warehouse_id text;
alter table stock_transfers add column if not exists status text;
alter table stock_transfers add column if not exists notes text;
alter table stock_transfers add column if not exists created_by text;
alter table stock_transfers add column if not exists created_at text;
alter table stock_transfers add column if not exists items text;
alter table stock_transfers enable row level security;
drop policy if exists "allow_all_anon_authenticated" on stock_transfers;
create policy "allow_all_anon_authenticated" on stock_transfers for all to anon, authenticated using (true) with check (true);
grant all on stock_transfers to anon, authenticated;

-- ── Table: stock_transfer_items ─────────────────────────────────────────
create table if not exists stock_transfer_items (id text primary key, created_at timestamptz default now());
alter table stock_transfer_items add column if not exists transfer_id text;
alter table stock_transfer_items add column if not exists product_id text;
alter table stock_transfer_items add column if not exists quantity numeric default 0;
alter table stock_transfer_items add column if not exists notes text;
alter table stock_transfer_items enable row level security;
drop policy if exists "allow_all_anon_authenticated" on stock_transfer_items;
create policy "allow_all_anon_authenticated" on stock_transfer_items for all to anon, authenticated using (true) with check (true);
grant all on stock_transfer_items to anon, authenticated;

-- ── Table: stock_movement_logs ─────────────────────────────────────────
create table if not exists stock_movement_logs (id text primary key, created_at timestamptz default now());
alter table stock_movement_logs add column if not exists product_id text;
alter table stock_movement_logs add column if not exists warehouse_id text;
alter table stock_movement_logs add column if not exists type text;
alter table stock_movement_logs add column if not exists quantity numeric default 0;
alter table stock_movement_logs add column if not exists reference_type text;
alter table stock_movement_logs add column if not exists reference_id text;
alter table stock_movement_logs add column if not exists notes text;
alter table stock_movement_logs add column if not exists created_at text;
alter table stock_movement_logs enable row level security;
drop policy if exists "allow_all_anon_authenticated" on stock_movement_logs;
create policy "allow_all_anon_authenticated" on stock_movement_logs for all to anon, authenticated using (true) with check (true);
grant all on stock_movement_logs to anon, authenticated;

-- ── Table: supplier_ledger_entries ─────────────────────────────────────────
create table if not exists supplier_ledger_entries (id text primary key, created_at timestamptz default now());
alter table supplier_ledger_entries add column if not exists supplier_id text;
alter table supplier_ledger_entries add column if not exists transaction_type text;
alter table supplier_ledger_entries add column if not exists reference_number text;
alter table supplier_ledger_entries add column if not exists debit numeric default 0;
alter table supplier_ledger_entries add column if not exists credit numeric default 0;
alter table supplier_ledger_entries add column if not exists balance numeric default 0;
alter table supplier_ledger_entries add column if not exists payment_account_id text;
alter table supplier_ledger_entries add column if not exists note text;
alter table supplier_ledger_entries add column if not exists created_at text;
alter table supplier_ledger_entries enable row level security;
drop policy if exists "allow_all_anon_authenticated" on supplier_ledger_entries;
create policy "allow_all_anon_authenticated" on supplier_ledger_entries for all to anon, authenticated using (true) with check (true);
grant all on supplier_ledger_entries to anon, authenticated;

-- ── Table: adv_purchase_invoices ─────────────────────────────────────────
create table if not exists adv_purchase_invoices (id text primary key, created_at timestamptz default now());
alter table adv_purchase_invoices add column if not exists invoice_number text;
alter table adv_purchase_invoices add column if not exists supplier_id text;
alter table adv_purchase_invoices add column if not exists warehouse_id text;
alter table adv_purchase_invoices add column if not exists invoice_date text;
alter table adv_purchase_invoices add column if not exists due_date text;
alter table adv_purchase_invoices add column if not exists status text;
alter table adv_purchase_invoices add column if not exists subtotal numeric default 0;
alter table adv_purchase_invoices add column if not exists discount numeric default 0;
alter table adv_purchase_invoices add column if not exists tax_amount numeric default 0;
alter table adv_purchase_invoices add column if not exists freight_cost numeric default 0;
alter table adv_purchase_invoices add column if not exists total_amount numeric default 0;
alter table adv_purchase_invoices add column if not exists paid_amount numeric default 0;
alter table adv_purchase_invoices add column if not exists notes text;
alter table adv_purchase_invoices add column if not exists created_at text;
alter table adv_purchase_invoices add column if not exists items text;
alter table adv_purchase_invoices enable row level security;
drop policy if exists "allow_all_anon_authenticated" on adv_purchase_invoices;
create policy "allow_all_anon_authenticated" on adv_purchase_invoices for all to anon, authenticated using (true) with check (true);
grant all on adv_purchase_invoices to anon, authenticated;

-- ── Table: adv_purchase_invoice_items ─────────────────────────────────────────
create table if not exists adv_purchase_invoice_items (id text primary key, created_at timestamptz default now());
alter table adv_purchase_invoice_items add column if not exists purchase_invoice_id text;
alter table adv_purchase_invoice_items add column if not exists product_id text;
alter table adv_purchase_invoice_items add column if not exists quantity numeric default 0;
alter table adv_purchase_invoice_items add column if not exists unit_cost numeric default 0;
alter table adv_purchase_invoice_items add column if not exists landed_unit_cost numeric default 0;
alter table adv_purchase_invoice_items add column if not exists tax_rate numeric default 0;
alter table adv_purchase_invoice_items add column if not exists total_cost numeric default 0;
alter table adv_purchase_invoice_items enable row level security;
drop policy if exists "allow_all_anon_authenticated" on adv_purchase_invoice_items;
create policy "allow_all_anon_authenticated" on adv_purchase_invoice_items for all to anon, authenticated using (true) with check (true);
grant all on adv_purchase_invoice_items to anon, authenticated;

-- ── Table: supplier_transactions ─────────────────────────────────────────
create table if not exists supplier_transactions (id text primary key, created_at timestamptz default now());
alter table supplier_transactions add column if not exists supplier_id text;
alter table supplier_transactions add column if not exists type text;
alter table supplier_transactions add column if not exists amount numeric default 0;
alter table supplier_transactions add column if not exists balance_after numeric default 0;
alter table supplier_transactions add column if not exists payment_method text;
alter table supplier_transactions add column if not exists reference_no text;
alter table supplier_transactions add column if not exists created_at text;
alter table supplier_transactions enable row level security;
drop policy if exists "allow_all_anon_authenticated" on supplier_transactions;
create policy "allow_all_anon_authenticated" on supplier_transactions for all to anon, authenticated using (true) with check (true);
grant all on supplier_transactions to anon, authenticated;

-- ── Table: logistics_orders ─────────────────────────────────────────
create table if not exists logistics_orders (id text primary key, created_at timestamptz default now());
alter table logistics_orders add column if not exists order_id text;
alter table logistics_orders add column if not exists carrier_id text;
alter table logistics_orders add column if not exists tracking_number text;
alter table logistics_orders add column if not exists shipping_cost numeric default 0;
alter table logistics_orders add column if not exists status text;
alter table logistics_orders add column if not exists estimated_delivery text;
alter table logistics_orders add column if not exists shipped_at text;
alter table logistics_orders add column if not exists created_at text;
alter table logistics_orders enable row level security;
drop policy if exists "allow_all_anon_authenticated" on logistics_orders;
create policy "allow_all_anon_authenticated" on logistics_orders for all to anon, authenticated using (true) with check (true);
grant all on logistics_orders to anon, authenticated;

-- ── تحديث الـ schema cache بتاع PostgREST ───────────────────────────────────
notify pgrst, 'reload schema';
