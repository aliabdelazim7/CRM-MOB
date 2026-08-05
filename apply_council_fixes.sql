-- ============================================================
-- سكريبت إصلاحات أمان ونزاهة البيانات (LLM Council Fixes)
-- HANCES PRO ERP / POS System
-- ============================================================

-- 1. إضافة مفتاح منع تكرار الفواتير الأوفلاين (Idempotency Key)
alter table orders add column if not exists idempotency_key text unique;

-- 2. قيود حماية الأسعار والمخزون من الإدخالات السالبة
alter table products add constraint check_sale_price_positive check (sale_price >= 0);
alter table products add constraint check_purchase_price_positive check (purchase_price >= 0);

-- 3. دالة نقل مخزون ذرية بين المستودع والمعرض (Atomic Stock Transfer)
create or replace function rpc_transfer_warehouse_stock(
  p_product_id uuid,
  p_transfer_qty numeric,
  p_direction text -- 'to_display' (من المستودع للمحل) أو 'to_warehouse' (من المحل للمستودع)
) returns jsonb language plpgsql security definer as $$
declare
  v_prod record;
  v_new_display numeric;
begin
  select * into v_prod from products where id = p_product_id for update;
  if not found then
    return jsonb_build_object('success', false, 'message', 'المنتج غير موجود');
  end if;

  if p_direction = 'to_display' then
    -- التأكد من وجود كمية كافية في المستودع
    if (v_prod.stock_quantity - coalesce(v_prod.display_quantity, 0)) < p_transfer_qty then
      return jsonb_build_object('success', false, 'message', 'الكمية المتاحة بالمستودع غير كافية');
    end if;
    v_new_display := coalesce(v_prod.display_quantity, 0) + p_transfer_qty;
  elsif p_direction = 'to_warehouse' then
    if coalesce(v_prod.display_quantity, 0) < p_transfer_qty then
      return jsonb_build_object('success', false, 'message', 'الكمية المعروضة بالمحل غير كافية');
    end if;
    v_new_display := coalesce(v_prod.display_quantity, 0) - p_transfer_qty;
  else
    return jsonb_build_object('success', false, 'message', 'اتجاه النقل غير صحيح');
  end if;

  update products set display_quantity = v_new_display where id = p_product_id;

  return jsonb_build_object('success', true, 'new_display_quantity', v_new_display);
end;
$$;
