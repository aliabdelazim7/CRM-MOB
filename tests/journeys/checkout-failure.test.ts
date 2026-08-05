/* eslint-disable @typescript-eslint/no-explicit-any -- محاكاة استجابات Supabase */
/**
 * ── الفاتورة لما تفشل ───────────────────────────────────────────────────────
 *
 * الباج الأخطر في السيستم: checkout كان بيرجّع رقم فاتورة سواء نجح أو فشل،
 * فشاشة الكاشير بتشغّل صوت النجاح وتفتح مودال «تم الدفع بنجاح» وتطبع إيصال —
 * لفاتورة **ماوصلتش قاعدة البيانات أصلاً**. العميل بيدفع وياخد إيصال ومفيش
 * أي أثر للبيعة.
 *
 * دلوقتي الفشل بيرجّع null، وشاشة الكاشير بتقف عنده.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

function fakeStorage() {
  const m: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in m ? m[k] : null),
    setItem: (k: string, v: string) => { m[k] = v; },
    removeItem: (k: string) => { delete m[k]; },
  };
}
(globalThis as any).sessionStorage = fakeStorage();
(globalThis as any).localStorage = fakeStorage();
(globalThis as any).BroadcastChannel = class { postMessage() {} close() {} };
// navigator في Node له getter بس، فلازم defineProperty بدل الإسناد المباشر.
Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
(globalThis as any).alert = vi.fn();

/** الأعمدة الموجودة في جدول orders الوهمي. */
let orderColumns = new Set<string>();
/** أرقام الفواتير المستخدمة. */
let usedIds = new Set<string>();
/** آخر صف اتسجّل بنجاح. */
let insertedRow: Record<string, unknown> | null = null;
let counter = 1;

const ALL_ORDER_COLUMNS = [
  'id', 'total', 'paid_amount', 'paid_cash', 'paid_visa', 'paid_wallet', 'paid_instapay',
  'paid_method5', 'paid_method6', 'type', 'customer_id', 'payment_method', 'cashier_name',
  'salesperson_id', 'salesperson_name', 'notes', 'coupon_code', 'discount_amount',
  'car_id', 'created_at', 'client_ref',
];

function insertOrder(row: Record<string, unknown>) {
  const missing = Object.keys(row).find((c) => !orderColumns.has(c));
  if (missing) {
    return { error: { code: 'PGRST204', message: `Could not find the '${missing}' column of 'orders' in the schema cache` } };
  }
  const id = String(row.id);
  if (usedIds.has(id)) {
    return { error: { code: '23505', message: `duplicate key value violates unique constraint "orders_pkey"` } };
  }
  usedIds.add(id);
  insertedRow = row;
  return { error: null };
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: { current_value: counter }, error: null }) }),
        limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        order: () => ({ limit: async () => ({ data: [], error: null }) }),
      }),
      insert: async (row: any) => (table === 'orders' ? insertOrder(row) : { error: null }),
      update: () => ({ eq: async () => { counter++; return { error: null }; } }),
      upsert: async () => ({ error: null }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: async (fn: string) => {
      if (fn === 'next_invoice_number') {
        while (usedIds.has(String(counter))) counter++;
        return { data: counter++, error: null };
      }
      return { data: null, error: null };
    },
  },
  fetchAllRows: async () => [],
}));

const { useStore } = await import('../../src/store/useStore');

const PRODUCT = {
  id: 'p1', name: 'صنف', barcode: '1', unit: 'قطعة',
  purchase_price: 60, average_purchase_price: 60, sale_price: 100,
  stock_quantity: 10, category_id: 'c1',
};

beforeEach(() => {
  orderColumns = new Set(ALL_ORDER_COLUMNS);
  usedIds = new Set();
  insertedRow = null;
  counter = 1;
  (globalThis as any).alert = vi.fn();
  useStore.setState({
    products: [PRODUCT] as any,
    cart: [{ ...PRODUCT, quantity: 1, returned_quantity: 0 }] as any,
    customers: [], orders: [], invoiceType: 'retail', salesperson: null,
    storeSettings: { ...useStore.getState().storeSettings, dayStartHour: 3 } as any,
  } as any);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('بيعة سليمة', () => {
  it('بترجّع رقم الفاتورة', async () => {
    const id = await useStore.getState().checkout(100, undefined, 100);
    expect(id).not.toBeNull();
    expect(insertedRow).not.toBeNull();
    expect(String(insertedRow!.id)).toBe(id);
  });

  it('السلة بتتفضّى بعد النجاح', async () => {
    await useStore.getState().checkout(100, undefined, 100);
    expect(useStore.getState().cart).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عمود client_ref ناقص — ده اللي حصل فعلاً', () => {
  beforeEach(() => { orderColumns.delete('client_ref'); });

  it('البيعة بتتسجّل من غير العمود بدل ما تضيع', async () => {
    const id = await useStore.getState().checkout(100, undefined, 100);
    expect(id).not.toBeNull();
    expect(insertedRow).not.toBeNull();
    expect(insertedRow).not.toHaveProperty('client_ref');
  });

  it('بيحذّر المستخدم إن العمود اتساب عليه', async () => {
    await useStore.getState().checkout(100, undefined, 100);
    const msg = ((globalThis as any).alert as any).mock.calls.flat().join(' ');
    expect(msg).toContain('client_ref');
    expect(msg).toContain('73_ensure_orders_columns');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عمود أساسي ناقص — البيعة لازم تفشل بوضوح', () => {
  beforeEach(() => { orderColumns.delete('total'); });

  it('بترجّع null مش رقم فاتورة — ده كان الباج', async () => {
    const id = await useStore.getState().checkout(100, undefined, 100);
    // قبل الإصلاح كانت بترجّع رقم فاتورة، فالكاشير يطبع إيصال لبيعة مش موجودة
    expect(id).toBeNull();
    expect(insertedRow).toBeNull();
  });

  it('بيقول للمستخدم إن البيعة ماتسجّلتش', async () => {
    await useStore.getState().checkout(100, undefined, 100);
    const msg = ((globalThis as any).alert as any).mock.calls.flat().join(' ');
    expect(msg).toContain('ماتسجّلتش');
  });

  it('السلة مابتتفضّاش عشان الكاشير يقدر يعيد المحاولة', async () => {
    await useStore.getState().checkout(100, undefined, 100);
    expect(useStore.getState().cart.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('رقم الفاتورة متاخد', () => {
  it('بياخد الرقم اللي بعده ويكمّل بدل ما يقف', async () => {
    usedIds.add('1');
    usedIds.add('2');
    const id = await useStore.getState().checkout(100, undefined, 100);
    expect(id).not.toBeNull();
    expect(['3', '4']).toContain(String(id));
  });

  it('عدّاد متأخّر خالص لسه بيلاقي رقم فاضي', async () => {
    for (let i = 1; i <= 6; i++) usedIds.add(String(i));
    const id = await useStore.getState().checkout(100, undefined, 100);
    expect(id).not.toBeNull();
    expect(usedIds.has(String(id))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('سلة فاضية', () => {
  it('بترجّع null مش رقم فاتورة', async () => {
    useStore.setState({ cart: [] } as any);
    expect(await useStore.getState().checkout(0, undefined, 0)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الهجرة لازم تغطي كل عمود بيتبعت', () => {
  it('db/73 فيه كل أعمدة الفاتورة', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/store/useStore.ts', 'utf-8');
    const block = src.split('const orderRow = () => ({')[1].split('});')[0];
    const sent = [...block.matchAll(/^\s*([a-z_0-9]+):/gm)].map((m) => m[1]);

    const sql = fs.readFileSync('db/73_ensure_orders_columns.sql', 'utf-8');
    const covered = new Set([...sql.matchAll(/add column if not exists\s+([a-z_0-9]+)/g)].map((m) => m[1]));
    covered.add('id'); // المفتاح الأساسي، بيتعمل مع الجدول نفسه

    const missing = sent.filter((c) => !covered.has(c));
    expect(missing, `أعمدة بيبعتها الحفظ ومش في الهجرة: ${missing.join(', ')}`).toEqual([]);
  });
});
