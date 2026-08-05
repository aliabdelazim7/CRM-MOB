/* eslint-disable @typescript-eslint/no-explicit-any -- محاكاة استجابات Supabase */
/**
 * ── صورة المنتج مش بتتحفظ ──────────────────────────────────────────────────
 *
 * الباج الأصلي: المستخدم بيرفع صورة للمنتج ويحفظ، الصورة تبان في الجدول وفي
 * الكاشير، وبعد أول تحديث للصفحة تختفي. السبب إن عمود `image_url` مش موجود في
 * جدول products، و addProduct/updateProduct بيتخطّوا أي عمود ناقص ويكمّلوا
 * الحفظ من غيره **في صمت** — فالمستخدم شايف نجاح والحقيقة إن الصورة ضاعت.
 *
 * الإصلاح: db/74_product_image.sql بيضيف العمود، والـstore بقى يقول إيه اللي
 * اتخطّى (lastSkippedProductColumns) ويرجّع الحالة المحلية بدل ما يوري صورة
 * وهمية.
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

/** أعمدة جدول products «الموجودة» في القاعدة الوهمية — بتتغيّر لكل تست. */
let existingColumns = new Set<string>();
/** آخر payload اتبعت ونجحت. */
let lastSaved: Record<string, unknown> | null = null;
/** عدد محاولات الكتابة — بنتأكد إن مفيش لوب لا نهائية ولا رحلات على الفاضي. */
let attempts = 0;

const ALL_COLUMNS = [
  'name', 'barcode', 'image_url', 'purchase_price', 'average_purchase_price',
  'sale_price', 'discount_price', 'alert_limit', 'colors', 'wholesale_price',
  'half_wholesale_price', 'season', 'supplier_name', 'stock_quantity',
  'display_quantity', 'category_id', 'unit', 'website_ad_cost', 'amazon_price',
  'amazon_discount_price', 'amazon_commission', 'amazon_ad_cost', 'noon_price',
  'noon_discount_price', 'noon_commission', 'noon_shipping', 'noon_ad_cost',
  'jumia_price', 'jumia_discount_price', 'jumia_commission', 'jumia_shipping',
  'jumia_ad_cost', 'custom_stores',
];

function writeResult(payload: Record<string, unknown>) {
  attempts++;
  const missing = Object.keys(payload).find((c) => !existingColumns.has(c));
  if (missing) {
    // نفس نص خطأ PostgREST الحقيقي
    return {
      data: null,
      error: {
        code: 'PGRST204',
        message: `Could not find the '${missing}' column of 'products' in the schema cache`,
      },
    };
  }
  lastSaved = payload;
  return { data: { id: 'prod-1', ...payload }, error: null };
}

/** كائن بيشتغل مع await وكمان مع .select().single() — زي رد supabase-js. */
function thenable(res: any) {
  return {
    select: () => ({ single: async () => res, then: (r: any) => r(res) }),
    eq: async () => res,
    then: (r: any) => r(res),
  };
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: any) => (table === 'products' ? thenable(writeResult(payload)) : thenable({ data: [], error: null })),
      update: (payload: any) => (table === 'products' ? thenable(writeResult(payload)) : thenable({ data: [], error: null })),
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
        order: async () => ({ data: [], error: null }),
        limit: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
      delete: () => ({ eq: async () => ({ error: null }) }),
    }),
    rpc: async () => ({ data: null, error: null }),
    removeChannel: () => {},
  },
  fetchAllRows: async () => [],
}));

const { useStore, PRODUCT_LABEL_AR, PRODUCT_COLUMNS_FIX_SQL } = await import('../../src/store/useStore');

const IMAGE = 'data:image/jpeg;base64,AAAA';

/** منتج موجود في الحالة المحلية عشان نعدّله. */
function seedProduct(extra: Record<string, unknown> = {}) {
  useStore.setState({
    products: [{
      id: 'prod-1', name: 'شنطة', barcode: '123', purchase_price: 10,
      average_purchase_price: 10, sale_price: 20, stock_quantity: 5,
      category_id: 'cat-1', unit: 'قطعة', ...extra,
    } as any],
  });
}

beforeEach(() => {
  existingColumns = new Set(ALL_COLUMNS);
  lastSaved = null;
  attempts = 0;
  useStore.setState({ lastSkippedProductColumns: [] });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('قاعدة بيانات فيها عمود image_url (بعد db/74)', () => {
  it('تحديث المنتج بيبعت الصورة لقاعدة البيانات — ده جوهر الباج', async () => {
    seedProduct();
    await useStore.getState().updateProduct('prod-1', { name: 'شنطة', image_url: IMAGE });
    expect((lastSaved as any)?.image_url).toBe(IMAGE);
    expect(attempts).toBe(1);
    expect(useStore.getState().lastSkippedProductColumns).toEqual([]);
  });

  it('الصورة بتفضل في الحالة المحلية (الجدول والكاشير بيقروا منها)', async () => {
    seedProduct();
    await useStore.getState().updateProduct('prod-1', { image_url: IMAGE });
    expect(useStore.getState().products[0].image_url).toBe(IMAGE);
  });

  it('منتج جديد بيتحفظ بصورته', async () => {
    const created = await useStore.getState().addProduct({
      name: 'كوتشي', barcode: '999', image_url: IMAGE, purchase_price: 50,
      average_purchase_price: 50, sale_price: 90, stock_quantity: 0,
      category_id: 'cat-1', unit: 'قطعة',
    } as any);
    expect((lastSaved as any)?.image_url).toBe(IMAGE);
    expect(created?.image_url).toBe(IMAGE);
  });

  it('حقول الواجهة اللي مالهاش عمود (discount_percent) مابتتبعتش أصلاً', async () => {
    seedProduct();
    await useStore.getState().updateProduct('prod-1', { image_url: IMAGE, discount_percent: 20 } as any);
    expect(lastSaved).not.toHaveProperty('discount_percent');
    // محاولة واحدة بس — قبل كده كانت بتضيع رحلة كاملة للسيرفر على الفاضي
    expect(attempts).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('قاعدة بيانات من غير عمود image_url (قبل تشغيل db/74)', () => {
  beforeEach(() => { existingColumns.delete('image_url'); });

  it('باقي الحقول بتتحفظ، والصورة بتتقال إنها اتخطّت', async () => {
    seedProduct();
    await useStore.getState().updateProduct('prod-1', { name: 'شنطة جديدة', image_url: IMAGE });
    expect(lastSaved).toEqual({ name: 'شنطة جديدة' });
    expect(useStore.getState().lastSkippedProductColumns).toEqual(['image_url']);
  });

  it('الشاشة مابتفضلش موريّة الصورة كأنها اتحفظت', async () => {
    seedProduct({ image_url: 'OLD' });
    await useStore.getState().updateProduct('prod-1', { image_url: IMAGE });
    // ده كان الباج: الصورة تبان بعد الحفظ وتختفي بعد التحديث
    expect(useStore.getState().products[0].image_url).toBe('OLD');
  });

  it('العمود المتخطّى ليه اسم عربي وملف هجرة يتقالوا للمستخدم', async () => {
    seedProduct();
    await useStore.getState().updateProduct('prod-1', { image_url: IMAGE });
    for (const col of useStore.getState().lastSkippedProductColumns) {
      expect(PRODUCT_LABEL_AR[col], `مفيش اسم عربي للعمود ${col}`).toBeTruthy();
    }
    expect(PRODUCT_COLUMNS_FIX_SQL).toBe('db/74_product_image.sql');
  });

  it('محاولتين بس: الأولى بتقع والتانية بتنجح', async () => {
    seedProduct();
    await useStore.getState().updateProduct('prod-1', { name: 'ا', image_url: IMAGE });
    expect(attempts).toBe(2);
  });

  it('حفظ جديد بعديه بيبدأ من نضيف (مش بيورّث تحذير الحفظ اللي فات)', async () => {
    seedProduct();
    await useStore.getState().updateProduct('prod-1', { image_url: IMAGE });
    expect(useStore.getState().lastSkippedProductColumns).toEqual(['image_url']);
    existingColumns.add('image_url');
    await useStore.getState().updateProduct('prod-1', { image_url: IMAGE });
    expect(useStore.getState().lastSkippedProductColumns).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الهجرة لازم تغطي كل عمود بيتبعت', () => {
  it('db/74_product_image.sql فيه image_url وكل أعمدة مودال المنتج', async () => {
    const fs = await import('node:fs');
    const sql = fs.readFileSync('db/74_product_image.sql', 'utf-8');
    const covered = new Set(
      [...sql.matchAll(/add column if not exists\s+([a-z_0-9]+)/g)].map((m) => m[1]),
    );
    expect(covered.has('image_url')).toBe(true);
    // الأعمدة الأساسية (name/barcode/...) جاية من إنشاء الجدول نفسه
    const base = new Set(['name', 'barcode', 'purchase_price', 'average_purchase_price',
      'sale_price', 'stock_quantity', 'category_id', 'unit']);
    const missing = ALL_COLUMNS.filter((c) => !base.has(c) && !covered.has(c));
    expect(missing, `أعمدة بيبعتها الحفظ ومش في الهجرة: ${missing.join(', ')}`).toEqual([]);
  });
});
