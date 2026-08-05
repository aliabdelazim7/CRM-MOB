/**
 * ── قواعد الصلاحيات ──────────────────────────────────────────────────────────
 *
 * القواعد دي كانت مكتوبة inline جوه AdminLayout و POS، فماكانش ينفع تتغطّى
 * باختبارات ولا تتراجع في مكان واحد. اتنقلت هنا من غير أي تغيير في السلوك.
 *
 * في نوعين مستقلين من الصلاحيات:
 *   1) مستخدم لوحة التحكم — `adminPermissions` قائمة مسارات، و null = المدير
 *      العام (كل حاجة).
 *   2) الكاشير — `cashierPermissions` في إعدادات المحل، مفاتيح منطقية
 *      **الافتراضي فيها مسموح** (بيتقفل بس لما تتحط false صراحةً).
 */

/** مفاتيح صلاحيات الكاشير المعروضة في الإعدادات. */
export const CASHIER_PERMISSION_KEYS = [
  'editDelete',
  'returns',
  'debt',
  'dayClosing',
  'wholesale',
  'savings',
  'barcodePrint',
  'employeeDeduction',
] as const;

export type CashierPermissionKey = (typeof CASHIER_PERMISSION_KEYS)[number];

export interface CashierLike {
  id?: string;
  full_access?: boolean;
}

export interface PermissionSettings {
  cashierPermissions?: Record<string, boolean>;
}

/** المدير العام: `adminPermissions === null` معناها صلاحيات كاملة. */
export function isOwner(adminPermissions: string[] | null | undefined): boolean {
  return adminPermissions === null || adminPermissions === undefined;
}

/** هل المستخدم يقدر يشوف صفحة لوحة تحكم معيّنة؟ */
export function canSeePage(adminPermissions: string[] | null | undefined, path: string): boolean {
  if (isOwner(adminPermissions)) return true;
  return (adminPermissions || []).includes(path);
}

/** الكاشير الرئيسي (المدير وهو واقف على الكاشير) — بيتخطّى كل القيود. */
export function isMasterCashier(cashier?: CashierLike | null): boolean {
  return cashier?.id === 'master';
}

/**
 * صلاحية كاملة للكاشير: بيتخطّى الـ OTP في العمليات الحسّاسة
 * (الخزنة الرئيسية، حذف فاتورة، أسعار الجملة).
 */
export function cashierHasFullAccess(cashier?: CashierLike | null): boolean {
  return isMasterCashier(cashier) || !!cashier?.full_access;
}

/**
 * صلاحية كاشير مفردة. **الافتراضي مسموح** — القفل بيحصل بـ false صراحةً فقط،
 * عشان محل مالوش إعدادات مايتقفلش عليه كل حاجة.
 */
export function cashierCan(
  cashier: CashierLike | null | undefined,
  settings: PermissionSettings | null | undefined,
  key: string,
): boolean {
  if (isMasterCashier(cashier)) return true;
  return settings?.cashierPermissions?.[key] !== false;
}

/** الاستبدال من غير OTP — إمّا صلاحية كاملة أو مسموح بيه من الإعدادات. */
export function canExchangeWithoutOtp(
  cashier: CashierLike | null | undefined,
  settings: PermissionSettings | null | undefined,
): boolean {
  return cashierHasFullAccess(cashier) || !!settings?.cashierPermissions?.exchangeNoOtp;
}

/**
 * أسعار الجملة/نص الجملة بتفضل مقفولة لحد ما يتأكد بـ OTP — إلا لو الكاشير
 * صلاحيته كاملة. فواتير القطاعي أسعارها ظاهرة دايماً.
 */
export function pricesHiddenFor(
  invoiceType: string,
  wholesaleUnlocked: boolean,
  cashier: CashierLike | null | undefined,
): boolean {
  return invoiceType !== 'retail' && !wholesaleUnlocked && !cashierHasFullAccess(cashier);
}
