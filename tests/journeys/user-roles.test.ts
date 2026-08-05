/**
 * ── رحلات المستخدمين ────────────────────────────────────────────────────────
 *
 * كل نوع مستخدم بيحاول يعمل كل حاجة، والتست بيتأكد إن اللي مسموح له بيعدّي
 * واللي ممنوع بيتقفل. الدوال هنا هي **نفس الدوال** اللي AdminLayout و POS
 * بينادوا عليها (src/utils/permissions.ts) — مش نسخة منها.
 */

import { describe, it, expect } from 'vitest';
import {
  isOwner, canSeePage, isMasterCashier, cashierHasFullAccess, cashierCan,
  canExchangeWithoutOtp, pricesHiddenFor, CASHIER_PERMISSION_KEYS,
} from '../../src/utils/permissions';
import { USERS, ALL_USER_KEYS, settingsWithCashierPerms } from '../support/personas';

/** كل صفحات لوحة التحكم اللي بتتحمى بصلاحية. */
const ADMIN_PAGES = [
  '/admin/overview', '/admin/inventory', '/admin/invoices', '/admin/customers',
  '/admin/suppliers', '/admin/finance', '/admin/settings', '/admin/users',
  '/admin/reports', '/admin/savings', '/admin/employees',
];

// ─────────────────────────────────────────────────────────────────────────────
describe('المدير العام', () => {
  const u = USERS.owner;

  it('adminPermissions = null معناها مدير عام', () => {
    expect(isOwner(u.adminPermissions)).toBe(true);
  });

  it('بيشوف كل صفحات لوحة التحكم من غير استثناء', () => {
    for (const page of ADMIN_PAGES) {
      expect(canSeePage(u.adminPermissions, page)).toBe(true);
    }
  });

  it('بيشوف حتى صفحة مش موجودة في أي قائمة', () => {
    expect(canSeePage(null, '/admin/any-future-page')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('مستخدم إدارة بصلاحيات محدودة', () => {
  const u = USERS.restrictedAdmin; // ['/admin/inventory', '/admin/invoices']

  it('مش مدير عام', () => {
    expect(isOwner(u.adminPermissions)).toBe(false);
  });

  it('بيشوف الصفحات المسموحة بس', () => {
    expect(canSeePage(u.adminPermissions, '/admin/inventory')).toBe(true);
    expect(canSeePage(u.adminPermissions, '/admin/invoices')).toBe(true);
  });

  it('مابيشوفش الإعدادات ولا المستخدمين ولا الخزنة', () => {
    expect(canSeePage(u.adminPermissions, '/admin/settings')).toBe(false);
    expect(canSeePage(u.adminPermissions, '/admin/users')).toBe(false);
    expect(canSeePage(u.adminPermissions, '/admin/savings')).toBe(false);
  });

  it('قائمة صلاحيات فاضية = مايشوفش حاجة (مش العكس)', () => {
    // مهم: [] لازم تبقى «مفيش صلاحيات»، مش «كل الصلاحيات».
    for (const page of ADMIN_PAGES) {
      expect(canSeePage([], page)).toBe(false);
    }
    expect(isOwner([])).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الكاشير الرئيسي (المدير على نقطة البيع)', () => {
  const u = USERS.masterOnPos;
  const settings = settingsWithCashierPerms(u.cashierPermissions);

  it('بيتعرف كماستر', () => {
    expect(isMasterCashier(u.cashier)).toBe(true);
    expect(cashierHasFullAccess(u.cashier)).toBe(true);
  });

  it('بيعدّي كل الصلاحيات حتى لو الإعدادات قافلاها كلها', () => {
    for (const key of CASHIER_PERMISSION_KEYS) {
      expect(settings.cashierPermissions[key]).toBe(false); // مقفولة في الإعدادات
      expect(cashierCan(u.cashier, settings, key)).toBe(true); // ومع ذلك بيعدّي
    }
  });

  it('بيستبدل من غير OTP', () => {
    expect(canExchangeWithoutOtp(u.cashier, settings)).toBe(true);
  });

  it('أسعار الجملة ظاهرة له من غير فتح', () => {
    expect(pricesHiddenFor('wholesale', false, u.cashier)).toBe(false);
    expect(pricesHiddenFor('half', false, u.cashier)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('كاشير بصلاحية كاملة', () => {
  const u = USERS.fullAccessCashier;
  const settings = settingsWithCashierPerms({});

  it('مش ماستر بس صلاحيته كاملة', () => {
    expect(isMasterCashier(u.cashier)).toBe(false);
    expect(cashierHasFullAccess(u.cashier)).toBe(true);
  });

  it('بيشوف أسعار الجملة من غير OTP', () => {
    expect(pricesHiddenFor('wholesale', false, u.cashier)).toBe(false);
  });

  it('بيستبدل من غير OTP', () => {
    expect(canExchangeWithoutOtp(u.cashier, settings)).toBe(true);
  });

  it('بس الصلاحيات المقفولة في الإعدادات بتتطبّق عليه', () => {
    // full_access بيتخطّى الـ OTP، مش قائمة صلاحيات الكاشير
    const locked = settingsWithCashierPerms({ returns: false });
    expect(cashierCan(u.cashier, locked, 'returns')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('كاشير عادي', () => {
  const u = USERS.normalCashier;
  const settings = settingsWithCashierPerms({});

  it('كل الصلاحيات مسموحة افتراضياً لما الإعدادات فاضية', () => {
    for (const key of CASHIER_PERMISSION_KEYS) {
      expect(cashierCan(u.cashier, settings, key)).toBe(true);
    }
  });

  it('محل من غير إعدادات خالص مايتقفلش عليه', () => {
    // ده مهم: محل جديد مالوش cashier_permissions لازم يشتغل عادي
    for (const key of CASHIER_PERMISSION_KEYS) {
      expect(cashierCan(u.cashier, undefined, key)).toBe(true);
      expect(cashierCan(u.cashier, {}, key)).toBe(true);
      expect(cashierCan(u.cashier, { cashierPermissions: {} }, key)).toBe(true);
    }
  });

  it('مش صلاحية كاملة — أسعار الجملة مقفولة لحد الـ OTP', () => {
    expect(cashierHasFullAccess(u.cashier)).toBe(false);
    expect(pricesHiddenFor('wholesale', false, u.cashier)).toBe(true);
  });

  it('بعد ما يتأكد بالـ OTP الأسعار بتظهر', () => {
    expect(pricesHiddenFor('wholesale', true, u.cashier)).toBe(false);
  });

  it('فاتورة القطاعي أسعارها ظاهرة دايماً', () => {
    expect(pricesHiddenFor('retail', false, u.cashier)).toBe(false);
  });

  it('مايستبدلش من غير OTP إلا لو الإعدادات سمحت', () => {
    expect(canExchangeWithoutOtp(u.cashier, settings)).toBe(false);
    const allowed = settingsWithCashierPerms({ exchangeNoOtp: true });
    expect(canExchangeWithoutOtp(u.cashier, allowed)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('كاشير مقيّد', () => {
  const u = USERS.limitedCashier;
  const settings = settingsWithCashierPerms(u.cashierPermissions);

  it('ممنوع من المرتجعات والحذف والتقفيل والجملة', () => {
    expect(cashierCan(u.cashier, settings, 'returns')).toBe(false);
    expect(cashierCan(u.cashier, settings, 'editDelete')).toBe(false);
    expect(cashierCan(u.cashier, settings, 'dayClosing')).toBe(false);
    expect(cashierCan(u.cashier, settings, 'wholesale')).toBe(false);
  });

  it('لسه مسموح له بالسداد الآجل وطباعة الباركود والخزنة', () => {
    expect(cashierCan(u.cashier, settings, 'debt')).toBe(true);
    expect(cashierCan(u.cashier, settings, 'barcodePrint')).toBe(true);
    expect(cashierCan(u.cashier, settings, 'savings')).toBe(true);
    expect(cashierCan(u.cashier, settings, 'employeeDeduction')).toBe(true);
  });

  it('قفل صلاحية مابيأثّرش على البقية', () => {
    const onlyReturns = settingsWithCashierPerms({ returns: false });
    expect(cashierCan(u.cashier, onlyReturns, 'returns')).toBe(false);
    for (const key of CASHIER_PERMISSION_KEYS.filter((k) => k !== 'returns')) {
      expect(cashierCan(u.cashier, onlyReturns, key)).toBe(true);
    }
  });

  it('true صراحةً برضه بيسمح', () => {
    expect(cashierCan(u.cashier, settingsWithCashierPerms({ returns: true }), 'returns')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الحالات الحدّية', () => {
  it('من غير كاشير مسجّل دخول: مش ماستر ولا صلاحية كاملة', () => {
    expect(isMasterCashier(null)).toBe(false);
    expect(isMasterCashier(undefined)).toBe(false);
    expect(cashierHasFullAccess(null)).toBe(false);
  });

  it('من غير كاشير: الصلاحيات الافتراضية لسه مسموحة (الإعدادات هي الحكم)', () => {
    expect(cashierCan(null, settingsWithCashierPerms({}), 'returns')).toBe(true);
    expect(cashierCan(null, settingsWithCashierPerms({ returns: false }), 'returns')).toBe(false);
  });

  it('من غير كاشير: أسعار الجملة مقفولة', () => {
    expect(pricesHiddenFor('wholesale', false, null)).toBe(true);
  });

  it('full_access = false مايدّيش صلاحية كاملة', () => {
    expect(cashierHasFullAccess({ id: 'c', full_access: false })).toBe(false);
  });

  it('كاشير id تاني اسمه شبه master مايتعاملش كماستر', () => {
    expect(isMasterCashier({ id: 'master-2' })).toBe(false);
    expect(isMasterCashier({ id: 'Master' })).toBe(false);
  });

  it('مفتاح صلاحية مش موجود = مسموح (الافتراضي)', () => {
    expect(cashierCan({ id: 'c' }, settingsWithCashierPerms({}), 'featureLater')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('مصفوفة كل المستخدمين × كل الصلاحيات', () => {
  it('كل نوع مستخدم بيدّي نتيجة ثابتة ومحدَّدة', () => {
    // جدول متوقّع مكتوب بالإيد — لو أي قاعدة اتغيّرت التست ده بيقع
    const expected: Record<string, { fullAccess: boolean; canReturns: boolean; wholesaleLocked: boolean }> = {
      owner: { fullAccess: true, canReturns: true, wholesaleLocked: false },
      masterOnPos: { fullAccess: true, canReturns: true, wholesaleLocked: false },
      fullAccessCashier: { fullAccess: true, canReturns: true, wholesaleLocked: false },
      normalCashier: { fullAccess: false, canReturns: true, wholesaleLocked: true },
      limitedCashier: { fullAccess: false, canReturns: false, wholesaleLocked: true },
      restrictedAdmin: { fullAccess: false, canReturns: true, wholesaleLocked: true },
    };

    for (const key of ALL_USER_KEYS) {
      const u = USERS[key];
      const settings = settingsWithCashierPerms(u.cashierPermissions);
      const got = {
        fullAccess: cashierHasFullAccess(u.cashier),
        canReturns: cashierCan(u.cashier, settings, 'returns'),
        wholesaleLocked: pricesHiddenFor('wholesale', false, u.cashier),
      };
      expect({ key, ...got }).toEqual({ key, ...expected[key] });
    }
  });

  it('كل مستخدم عنده صلاحيات محدودة مايشوفش صفحة مش في قائمته', () => {
    for (const key of ALL_USER_KEYS) {
      const u = USERS[key];
      if (isOwner(u.adminPermissions)) continue;
      const notMine = ADMIN_PAGES.filter((p) => !(u.adminPermissions || []).includes(p));
      for (const page of notMine) {
        expect(canSeePage(u.adminPermissions, page)).toBe(false);
      }
    }
  });
});
