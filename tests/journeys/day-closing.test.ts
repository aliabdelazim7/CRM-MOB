/* eslint-disable @typescript-eslint/no-explicit-any -- صفوف بشكل قاعدة البيانات الخام */
/**
 * ── تقفيل اليوم وسلامة الفلوس ───────────────────────────────────────────────
 *
 * السيناريو: يوم شغل كامل من فتح المحل لحد التقفيل، بكل أنواع العملاء
 * والحركات — وبعدها نتأكد إن الدرج والكشف وشجرة الحسابات كلهم بيقولوا نفس
 * الرقم، وإن فحص السلامة بيمسك الحركات الناقصة طرف.
 */

import { describe, it, expect } from 'vitest';
import { computeShopAvailable } from '../../src/utils/treasury';
import { buildPaymentLedger } from '../../src/utils/paymentLedger';
import { runIntegrityChecks, checkSalaryPairs, checkRefundSanity, checkSplitConsistency, checkDuplicateInvoices } from '../../src/utils/accounting/integrity';
import { businessDateStr, businessDayRange, dayStartHour, timestampForBusinessDate } from '../../src/utils/businessDay';
import { calculateInvoiceProfit } from '../../src/utils/invoiceProfit';
import { calculateOrderReturnValue } from '../../src/utils/returns';
import {
  PRODUCTS, CUSTOMERS, SETTINGS, buildOrder, buildDebtPayment, buildExpense, sumBucket, round2,
} from '../support/personas';

const D = (h: number, m = 0) =>
  new Date(2026, 2, 10, h, m, 0).toISOString(); // 10 مارس 2026 بالتوقيت المحلي

// ─────────────────────────────────────────────────────────────────────────────
describe('اليوم المحاسبي بيبدأ ٣ الصبح مش نص الليل', () => {
  it('الساعة الافتراضية ٣', () => {
    expect(dayStartHour(null)).toBe(3);
    expect(dayStartHour({})).toBe(3);
    expect(dayStartHour(SETTINGS)).toBe(3);
  });

  it('بيعة الساعة ١ بالليل بتتحسب على اليوم اللي فات', () => {
    // ١ صباحاً يوم ١١ مارس → لسه يوم ١٠ محاسبياً
    expect(businessDateStr(SETTINGS, new Date(2026, 2, 11, 1, 0))).toBe('2026-03-10');
  });

  it('بيعة الساعة ٤ الصبح بتتحسب على اليوم الجديد', () => {
    expect(businessDateStr(SETTINGS, new Date(2026, 2, 11, 4, 0))).toBe('2026-03-11');
  });

  it('الساعة ٣ بالظبط = بداية اليوم الجديد', () => {
    expect(businessDateStr(SETTINGS, new Date(2026, 2, 11, 3, 0))).toBe('2026-03-11');
  });

  it('محل بيقفل ٦ الصبح: بيعة ٥ ص لسه على امبارح', () => {
    const late = { ...SETTINGS, dayStartHour: 6 };
    expect(businessDateStr(late, new Date(2026, 2, 11, 5, 30))).toBe('2026-03-10');
    expect(businessDateStr(late, new Date(2026, 2, 11, 6, 30))).toBe('2026-03-11');
  });

  it('نطاق اليوم ٢٤ ساعة من ساعة البداية', () => {
    const { start, end } = businessDayRange('2026-03-10', SETTINGS);
    expect(start.getHours()).toBe(3);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('تسجيل بأثر رجعي بيقع جوه نطاق اليوم المطلوب', () => {
    const ts = timestampForBusinessDate('2026-03-10', SETTINGS);
    const { start, end } = businessDayRange('2026-03-10', SETTINGS);
    const t = new Date(ts).getTime();
    expect(t).toBeGreaterThanOrEqual(start.getTime());
    expect(t).toBeLessThan(end.getTime());
  });

  it('إعداد غلط بيرجع للافتراضي ٣', () => {
    expect(dayStartHour({ dayStartHour: 99 } as any)).toBe(3);
    expect(dayStartHour({ dayStartHour: -1 } as any)).toBe(3);
    expect(dayStartHour({ dayStartHour: NaN } as any)).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('يوم شغل كامل — من الفتح للتقفيل', () => {
  /*
   * الحركات (كلها يوم ١٠ مارس):
   *  ٠٩:٣٠  عابر    تي شيرت ×٢               ٢٠٠ كاش
   *  ١٠:١٥  مسجّل   جاكيت خصم ٤٢٠            ٢٠٠ كاش + ٢٢٠ فيزا
   *  ١١:٠٠  آجل     ٥ تي شيرت = ٥٠٠، دفع ٢٠٠  ٢٠٠ كاش   (دين ٣٠٠)
   *  ١٢:٣٠  جملة    ١٠٠ شراب × ١٥ = ١٥٠٠      ١٥٠٠ انستاباي
   *  ١٤:٠٠  مرتجع   باع ٤٠٠ كاش ورد ١٠٠ كاش   صافي ٣٠٠
   *  ١٥:٠٠  سداد    عميل آجل قديم سدّد ١٨٠     ١٨٠ كاش
   *  ١٦:٠٠  مصروف   بوفيه ١٥٠                 −١٥٠ كاش
   *  ١٧:٠٠  إيراد    بيع كرتونة فاضية ٥٠       +٥٠ كاش  (مصروف بمبلغ سالب)
   */
  const orders = [
    buildOrder({ id: 'o1', date: D(9, 30), items: [{ product: PRODUCTS.tshirt, quantity: 2 }] }),
    buildOrder({
      id: 'o2', date: D(10, 15), items: [{ product: PRODUCTS.jacket, quantity: 1, price: 420 }],
      customer: CUSTOMERS.registered.customer, split: { cash: 200, visa: 220 },
    }),
    buildOrder({
      id: 'o3', date: D(11), items: [{ product: PRODUCTS.tshirt, quantity: 5 }],
      customer: CUSTOMERS.deferred.customer, paid: 200, split: { cash: 200 },
    }),
    buildOrder({
      id: 'o4', date: D(12, 30), items: [{ product: PRODUCTS.socks, quantity: 100, price: 15 }],
      customer: CUSTOMERS.wholesale.customer, split: { instapay: 1500 },
    }),
    buildOrder({
      id: 'o5', date: D(14),
      items: [{ product: PRODUCTS.tshirt, quantity: 4, returned_quantity: 1, refunded_amount: 100 }],
      total: 400, paid: 400, split: { cash: 400 }, refundedSplit: { cash: 100 },
    }),
    buildDebtPayment({
      id: 'o6', date: D(15), amount: 180,
      customer: CUSTOMERS.deferred.customer, targetInvoiceId: 'o3',
    }),
  ];

  const expenses = [
    buildExpense({ id: 'e1', date: D(16), amount: 150, category: 'مصاريف عامة', note: 'بوفيه' }),
    buildExpense({ id: 'e2', date: D(17), amount: -50, category: 'إيرادات أخرى', note: 'بيع كراتين' }),
  ];

  const box = computeShopAvailable({ orders, expenses, purchases: [], salaries: [] }, SETTINGS);

  it('الكاش في الدرج آخر اليوم = ٩٨٠', () => {
    // 200 + 200 + 200 + 400 + 180 − 100 رد − 150 مصروف + 50 إيراد
    expect(box.cash).toBe(980);
  });

  it('الفيزا ٢٢٠', () => {
    expect(box.visa).toBe(220);
  });

  it('الانستاباي ١٥٠٠', () => {
    expect(box.instapay).toBe(1500);
  });

  it('إجمالي الخزنة ٢٧٠٠', () => {
    expect(sumBucket(box)).toBe(2700);
  });

  it('كشف الحساب صافيه = رصيد الخزنة بالظبط', () => {
    const ledger = buildPaymentLedger(orders, expenses, []);
    const net = ledger.reduce((s, e) => s + e.inAmount - e.outAmount, 0);
    expect(round2(net)).toBe(round2(sumBucket(box)));
  });

  it('كل بند في الكشف على وسيلة معروفة وبمبلغ في اتجاه واحد', () => {
    const ledger = buildPaymentLedger(orders, expenses, []);
    expect(ledger.length).toBeGreaterThan(0);
    for (const e of ledger) {
      expect(['cash', 'visa', 'wallet', 'instapay', 'method5', 'method6']).toContain(e.method);
      // بند واحد مايكونش وارد وصادر مع بعض
      expect(e.inAmount === 0 || e.outAmount === 0).toBe(true);
      expect(e.inAmount + e.outAmount).toBeGreaterThan(0);
    }
  });

  it('الإيراد اليدوي (مصروف سالب) بيتصنّف income مش expense', () => {
    const ledger = buildPaymentLedger(orders, expenses, []);
    const income = ledger.find((e) => e.id.startsWith('e2'));
    expect(income?.kind).toBe('income');
    expect(income?.inAmount).toBe(50);
    expect(income?.outAmount).toBe(0);
  });

  it('المصروف العادي بيتصنّف expense وصادر', () => {
    const ledger = buildPaymentLedger(orders, expenses, []);
    const exp = ledger.find((e) => e.id.startsWith('e1'));
    expect(exp?.kind).toBe('expense');
    expect(exp?.outAmount).toBe(150);
  });

  it('ربح اليوم من البضاعة = ١٠٢٠', () => {
    // o1: 80 | o2: 120 | o3: 200 | o4: 500 | o5: 120 | o6 سداد = 0
    const profit = orders.reduce((s, o) => s + calculateInvoiceProfit(o), 0);
    expect(profit).toBe(1020);
  });

  it('ديون العملاء آخر اليوم = ١٢٠', () => {
    // o3: 500 إجمالي − 200 مدفوع − 180 سداد = 120
    const paymentsByInvoice = new Map<string, number>();
    for (const o of orders) {
      const m = o.notes?.match(/سداد أجل للفاتورة رقم #([\w-]+)/);
      if (o.type === 'payment' && m) {
        paymentsByInvoice.set(m[1], (paymentsByInvoice.get(m[1]) || 0) + o.paid_amount);
      }
    }
    const debt = orders
      .filter((o) => o.type === 'sale' && !o.is_deleted)
      .reduce((s, o) => s + Math.max(
        0,
        o.total - calculateOrderReturnValue(o) - o.paid_amount - (paymentsByInvoice.get(o.id) || 0),
      ), 0);
    expect(debt).toBe(120);
  });

  it('اليوم ده نضيف — فحص السلامة مايلاقيش أي خطأ', () => {
    const issues = runIntegrityChecks({
      orders, expenses, purchaseInvoices: [], employeeTransactions: [], savingsTransactions: [],
    });
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('كل الحركات واقعة جوه اليوم المحاسبي ١٠ مارس', () => {
    const { start, end } = businessDayRange('2026-03-10', SETTINGS);
    for (const o of orders) {
      const t = new Date(o.date).getTime();
      expect(t).toBeGreaterThanOrEqual(start.getTime());
      expect(t).toBeLessThan(end.getTime());
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('رصيد افتتاحي في الدرج', () => {
  it('الرصيد الافتتاحي بيتضاف للحركات', () => {
    // paymentOpeningBalances هو المصدر الرسمي؛ initial_balance بديل قديم للكاش
    const withOpening = { ...SETTINGS, paymentOpeningBalances: { cash: 500, visa: 100 } };
    const orders = [buildOrder({ id: 'x1', date: D(10), items: [{ product: PRODUCTS.tshirt, quantity: 1 }] })];
    const box = computeShopAvailable({ orders, expenses: [], purchases: [], salaries: [] }, withOpening);
    expect(box.cash).toBe(600); // 500 افتتاحي + 100 بيع
    expect(box.visa).toBe(100);
  });

  it('من غير رصيد افتتاحي الدرج بيبدأ صفر', () => {
    const box = computeShopAvailable({ orders: [], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(sumBucket(box)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('فحص السلامة بيمسك المشاكل الحقيقية', () => {
  const empty = { orders: [], expenses: [], purchaseInvoices: [], employeeTransactions: [], savingsTransactions: [] };

  it('خصم على موظف من غير صرف من الخزنة', () => {
    const issues = checkSalaryPairs({
      ...empty,
      employeeTransactions: [{ id: 't1', created_at: D(12), amount: 500, note: 'سلفة' }],
      expenses: [], // مفيش مصروف مقابل
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].title).toContain('من غير صرف');
  });

  it('صرف من الخزنة من غير تسجيل على الموظف', () => {
    const issues = checkSalaryPairs({
      ...empty,
      employeeTransactions: [],
      expenses: [{ id: 'e1', created_at: D(12), date: D(12), amount: 500, category: 'رواتب', note: 'راتب' }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].title).toContain('من غير تسجيل على الموظف');
  });

  it('الراتب المتزاوج صح مايطلّعش مشكلة', () => {
    const issues = checkSalaryPairs({
      ...empty,
      employeeTransactions: [{ id: 't1', created_at: D(12), amount: 500, note: 'راتب' }],
      expenses: [{ id: 'e1', created_at: D(12), date: D(12), amount: 500, category: 'رواتب', note: 'راتب' }],
    });
    expect(issues).toEqual([]);
  });

  it('صفّين بنفس المبلغ ونفس اليوم بيتعدّوا بالعدد مش بالمطابقة', () => {
    // ٢ حركة موظف مقابل مصروف واحد = فيه واحدة زيادة
    const issues = checkSalaryPairs({
      ...empty,
      employeeTransactions: [
        { id: 't1', created_at: D(12), amount: 500, note: 'سلفة' },
        { id: 't2', created_at: D(13), amount: 500, note: 'سلفة' },
      ],
      expenses: [{ id: 'e1', created_at: D(12), date: D(12), amount: 500, category: 'رواتب', note: 'راتب' }],
    });
    expect(issues).toHaveLength(1);
  });

  it('مرتجع أكبر من المباع', () => {
    const bad = buildOrder({
      id: 'bad1', date: D(12),
      items: [{ product: PRODUCTS.tshirt, quantity: 2, returned_quantity: 5, refunded_amount: 500 }],
      total: 200, paid: 200,
    });
    const issues = checkRefundSanity({ ...empty, orders: [bad] });
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    // الاتنين: الكمية أكبر، والمبلغ أكبر من الإجمالي
    expect(issues[0].rows.length).toBe(2);
  });

  it('مرتجع سليم مايطلّعش مشكلة', () => {
    const ok = buildOrder({
      id: 'ok1', date: D(12),
      items: [{ product: PRODUCTS.tshirt, quantity: 4, returned_quantity: 1, refunded_amount: 100 }],
      total: 400, paid: 400, split: { cash: 400 }, refundedSplit: { cash: 100 },
    });
    expect(checkRefundSanity({ ...empty, orders: [ok] })).toEqual([]);
  });

  it('تقسيمة دفع مش مساوية للمدفوع', () => {
    const skewed = buildOrder({
      id: 'skew', date: D(12), items: [{ product: PRODUCTS.tshirt, quantity: 5 }],
      total: 500, paid: 500, split: { cash: 300, visa: 100 }, // المجموع ٤٠٠ مش ٥٠٠
    });
    const issues = checkSplitConsistency({ ...empty, orders: [skewed] });
    expect(issues).toHaveLength(1);
    // تحذير مش خطأ: الفلوس موجودة، بس موزّعة غلط على الوسائل
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].rows[0].amount).toBe(-100); // 400 تقسيمة مقابل 500 مدفوع
  });

  it('initial_balance القديم لسه شغّال للكاش', () => {
    const legacy = { ...SETTINGS, initial_balance: 300 };
    const box = computeShopAvailable({ orders: [], expenses: [], purchases: [], salaries: [] }, legacy);
    expect(box.cash).toBe(300);
    expect(box.visa).toBe(0);
  });

  it('التقسيمة الصح مع مرتجع مابتتحسبش خطأ', () => {
    // التقسيمة مابتتعدّلش مع المرتجع، فالمتوقّع = المدفوع + المرتجع
    const withRet = buildOrder({
      id: 'ret-ok', date: D(12),
      items: [{ product: PRODUCTS.tshirt, quantity: 4, returned_quantity: 1, refunded_amount: 100 }],
      total: 400, paid: 300, split: { cash: 400 }, refundedSplit: { cash: 100 },
    });
    expect(checkSplitConsistency({ ...empty, orders: [withRet] })).toEqual([]);
  });

  it('فواتير قديمة من غير تقسيمة مسجّلة مقبولة', () => {
    const legacy = buildOrder({
      id: 'legacy', date: D(12), items: [{ product: PRODUCTS.tshirt, quantity: 2 }],
      total: 200, paid: 200, split: {},
    });
    expect(checkSplitConsistency({ ...empty, orders: [legacy] })).toEqual([]);
  });

  it('فاتورتين متطابقتين خلال دقيقة = تحذير تكرار', () => {
    const a = buildOrder({ id: 'dup-a', date: D(12, 0), items: [{ product: PRODUCTS.tshirt, quantity: 2 }] });
    const b = buildOrder({ id: 'dup-b', date: D(12, 1), items: [{ product: PRODUCTS.tshirt, quantity: 2 }] });
    const issues = checkDuplicateInvoices({ ...empty, orders: [a, b] });
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning'); // تحذير مش خطأ — ممكن يكون شراء حقيقي
  });

  it('الاتنين لهم بصمة client_ref = مش تكرار', () => {
    const a = buildOrder({ id: 'r-a', date: D(12, 0), items: [{ product: PRODUCTS.tshirt, quantity: 2 }], client_ref: 'ref-1' });
    const b = buildOrder({ id: 'r-b', date: D(12, 1), items: [{ product: PRODUCTS.tshirt, quantity: 2 }], client_ref: 'ref-2' });
    expect(checkDuplicateInvoices({ ...empty, orders: [a, b] })).toEqual([]);
  });

  it('فاتورتين بفارق أكتر من ٥ دقايق مش تكرار', () => {
    const a = buildOrder({ id: 'far-a', date: D(12, 0), items: [{ product: PRODUCTS.tshirt, quantity: 2 }] });
    const b = buildOrder({ id: 'far-b', date: D(12, 10), items: [{ product: PRODUCTS.tshirt, quantity: 2 }] });
    expect(checkDuplicateInvoices({ ...empty, orders: [a, b] })).toEqual([]);
  });

  it('نفس الإجمالي بس عملاء مختلفين مش تكرار', () => {
    const a = buildOrder({
      id: 'c-a', date: D(12, 0), items: [{ product: PRODUCTS.tshirt, quantity: 2 }],
      customer: CUSTOMERS.registered.customer,
    });
    const b = buildOrder({
      id: 'c-b', date: D(12, 1), items: [{ product: PRODUCTS.tshirt, quantity: 2 }],
      customer: CUSTOMERS.deferred.customer,
    });
    expect(checkDuplicateInvoices({ ...empty, orders: [a, b] })).toEqual([]);
  });

  it('الأخطاء بتيجي قبل التحذيرات في الترتيب', () => {
    const badRefund = buildOrder({
      id: 'mix-bad', date: D(9),
      items: [{ product: PRODUCTS.tshirt, quantity: 1, returned_quantity: 3, refunded_amount: 0 }],
      total: 100, paid: 100,
    });
    const dupA = buildOrder({ id: 'mix-a', date: D(12, 0), items: [{ product: PRODUCTS.tshirt, quantity: 2 }] });
    const dupB = buildOrder({ id: 'mix-b', date: D(12, 1), items: [{ product: PRODUCTS.tshirt, quantity: 2 }] });
    const issues = runIntegrityChecks({ ...empty, orders: [badRefund, dupA, dupB] });
    expect(issues.length).toBeGreaterThanOrEqual(2);
    expect(issues[0].severity).toBe('error');
    expect(issues[issues.length - 1].severity).toBe('warning');
  });

  it('كل مشكلة بتقول إزاي تتصلّح', () => {
    const bad = buildOrder({
      id: 'fix-me', date: D(12),
      items: [{ product: PRODUCTS.tshirt, quantity: 1, returned_quantity: 9, refunded_amount: 0 }],
      total: 100, paid: 100,
    });
    const issues = runIntegrityChecks({ ...empty, orders: [bad] });
    for (const i of issues) {
      expect(i.fix.length).toBeGreaterThan(10);
      expect(i.detail.length).toBeGreaterThan(10);
      expect(i.rows.length).toBeGreaterThan(0);
    }
  });
});
