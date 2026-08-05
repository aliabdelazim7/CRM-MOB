/* eslint-disable @typescript-eslint/no-explicit-any -- محاكاة استجابات Supabase */
/**
 * ── حفظ الإعدادات على قاعدة بيانات ناقصة أعمدة ──────────────────────────────
 *
 * الباج الأصلي: الحفظ بيبعت كل الأعمدة في UPDATE واحد، فعمود واحد ناقص كان
 * بيفشّل الحفظ **كله**. المستخدم كان عايز يغيّر اللوجو بس، والحفظ بيقع بسبب
 * `allow_cashier_employee_advance` — عمود ملهوش أي علاقة باللوجو.
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

/** الأعمدة اللي «موجودة» في قاعدة البيانات الوهمية — بيتغيّر لكل تست. */
let existingColumns = new Set<string>();
/** آخر payload اتبعت فعلاً ونجح. */
let lastSaved: Record<string, unknown> | null = null;
/** عدد محاولات الكتابة — بنتأكد إن مفيش لوب لا نهائية. */
let attempts = 0;

function writeResult(payload: Record<string, unknown>) {
  attempts++;
  const missing = Object.keys(payload).find((c) => !existingColumns.has(c));
  if (missing) {
    // نفس نص خطأ PostgREST الحقيقي
    return {
      error: {
        code: 'PGRST204',
        message: `Could not find the '${missing}' column of 'store_settings' in the schema cache`,
      },
    };
  }
  lastSaved = payload;
  return { error: null };
}

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: 'settings-1' } }) }) }),
      update: (payload: Record<string, unknown>) => ({ eq: async () => writeResult(payload) }),
      insert: async (payload: Record<string, unknown>) => writeResult(payload),
    }),
    rpc: async () => ({ data: null, error: null }),
  },
  fetchAllRows: async () => [],
}));

const { useStore, COLUMN_OF_SETTING, SETTING_LABEL_AR } = await import('../../src/store/useStore');

const ALL_COLUMNS = Object.values(COLUMN_OF_SETTING);

beforeEach(() => {
  existingColumns = new Set(ALL_COLUMNS);
  lastSaved = null;
  attempts = 0;
});

// ─────────────────────────────────────────────────────────────────────────────
describe('قاعدة بيانات محدَّثة — كل الأعمدة موجودة', () => {
  it('الحفظ بينجح ومفيش حاجة اتخطّت', async () => {
    const r = await useStore.getState().updateSettings({ logo: 'data:image/png;base64,AAA', name: 'HANCES System' });
    expect(r.skipped).toEqual([]);
    expect(lastSaved).toEqual({ logo: 'data:image/png;base64,AAA', name: 'HANCES System' });
    expect(attempts).toBe(1);
  });

  it('بيبعت الأعمدة اللي اتغيّرت بس', async () => {
    await useStore.getState().updateSettings({ themeColor: '#111111' });
    expect(Object.keys(lastSaved!)).toEqual(['theme_color']);
  });

  it('الحالة المحلية بتتحدّث', async () => {
    await useStore.getState().updateSettings({ currency: 'USD' });
    expect(useStore.getState().storeSettings.currency).toBe('USD');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('العمود الناقص اللي وقع الحفظ (allow_cashier_employee_advance)', () => {
  beforeEach(() => { existingColumns.delete('allow_cashier_employee_advance'); });

  it('رفع اللوجو بينجح رغم إن العمود التاني ناقص — ده كان الباج', async () => {
    const r = await useStore.getState().updateSettings({
      logo: 'data:image/png;base64,LOGO',
      allowCashierEmployeeAdvance: true,
    });
    expect(lastSaved).toEqual({ logo: 'data:image/png;base64,LOGO' });
    expect(r.skipped).toEqual(['allow_cashier_employee_advance']);
  });

  it('اللوجو بيتحدّث محلياً، والإعداد اللي مااتحفظش لأ', async () => {
    const before = useStore.getState().storeSettings.allowCashierEmployeeAdvance;
    await useStore.getState().updateSettings({
      logo: 'data:image/png;base64,XYZ',
      allowCashierEmployeeAdvance: !before,
    });
    expect(useStore.getState().storeSettings.logo).toBe('data:image/png;base64,XYZ');
    // مهم: مانعرضش قيمة كأنها اتخزنت وهي مش متخزنة
    expect(useStore.getState().storeSettings.allowCashierEmployeeAdvance).toBe(before);
  });

  it('محاولتين بس: الأولى بتقع والتانية بتنجح', async () => {
    await useStore.getState().updateSettings({ logo: 'x', allowCashierEmployeeAdvance: true });
    expect(attempts).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('قاعدة بيانات قديمة — كذا عمود ناقص', () => {
  beforeEach(() => {
    // الأعمدة اللي كانت ناقصة من db/28 القديم
    for (const c of ['allow_cashier_employee_advance', 'payment_opening_balances',
                     'expense_categories', 'pages_qr_image']) existingColumns.delete(c);
  });

  it('بيتخطّاهم كلهم ويحفظ الباقي', async () => {
    const r = await useStore.getState().updateSettings({
      logo: 'LOGO', name: 'متجر',
      allowCashierEmployeeAdvance: true,
      paymentOpeningBalances: { cash: 100 },
      expenseCategories: ['أ'],
      pagesQrImage: 'QR',
    } as any);
    expect(lastSaved).toEqual({ logo: 'LOGO', name: 'متجر' });
    expect(r.skipped.sort()).toEqual([
      'allow_cashier_employee_advance', 'expense_categories', 'pages_qr_image', 'payment_opening_balances',
    ]);
  });

  it('لكل عمود متخطّى فيه اسم عربي يتعرض للمستخدم', async () => {
    const r = await useStore.getState().updateSettings({
      logo: 'L', allowCashierEmployeeAdvance: true, paymentOpeningBalances: {}, expenseCategories: [], pagesQrImage: 'Q',
    } as any);
    for (const col of r.skipped) {
      expect(SETTING_LABEL_AR[col], `مفيش اسم عربي للعمود ${col}`).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الحالات الحدّية', () => {
  it('الجدول ناقص خالص → بيرمي خطأ بيقول شغّل الهجرة', async () => {
    existingColumns = new Set();
    await expect(
      useStore.getState().updateSettings({ logo: 'L', name: 'N' }),
    ).rejects.toThrow(/28_ensure_settings_columns\.sql/);
  });

  it('خطأ مش بسبب عمود ناقص بيتقال زي ما هو (مايتبلعش)', async () => {
    const spy = vi.spyOn(await import('../../src/lib/supabase'), 'supabase' as any, 'get');
    spy.mockReturnValue({
      from: () => ({
        select: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: 'x' } }) }) }),
        update: () => ({ eq: async () => ({ error: { code: '42501', message: 'permission denied for table store_settings' } }) }),
      }),
    } as any);
    await expect(useStore.getState().updateSettings({ name: 'N' })).rejects.toThrow(/permission denied/);
    spy.mockRestore();
  });

  it('كل عمود في COLUMN_OF_SETTING له اسم عربي', () => {
    for (const col of ALL_COLUMNS) {
      expect(SETTING_LABEL_AR[col], `ناقص اسم عربي: ${col}`).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الهجرة لازم تغطي كل عمود بيتبعت', () => {
  it('db/28_ensure_settings_columns.sql فيه كل أعمدة COLUMN_OF_SETTING', async () => {
    // ده اللي كان مكسور: الهجرة كانت بتغطي ١٣ من ٢٤، فاللي بيشغّلها
    // بيقع في نفس الخطأ تاني بس على عمود مختلف.
    const fs = await import('node:fs');
    const sql = fs.readFileSync('db/28_ensure_settings_columns.sql', 'utf-8');
    const covered = new Set(
      [...sql.matchAll(/add column if not exists\s+([a-z_0-9]+)/g)].map((m) => m[1]),
    );
    const missing = ALL_COLUMNS.filter((c) => !covered.has(c));
    expect(missing, `أعمدة بيبعتها الحفظ ومش في الهجرة: ${missing.join(', ')}`).toEqual([]);
  });
});
