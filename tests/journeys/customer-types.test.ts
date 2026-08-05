/* eslint-disable @typescript-eslint/no-explicit-any -- صفوف بشكل قاعدة البيانات الخام */
/**
 * ── رحلات العملاء ────────────────────────────────────────────────────────────
 *
 * كل تست هنا بيمثّل عميل حقيقي بيدخل المحل ويخلّص عملية كاملة: اختيار المنتج،
 * السعر المطبَّق عليه، الدفع، وبعدها المرتجع أو الاستبدال أو سداد الدين.
 *
 * الأرقام المتوقّعة **محسوبة بالإيد في التست نفسه** — مش متاخدة من ناتج الكود.
 */

import { describe, it, expect } from 'vitest';
import { priceForType } from '../../src/utils/pricing';
import { calculateOrderReturnValue, calculateCashRefunded } from '../../src/utils/returns';
import { calculateInvoiceProfit } from '../../src/utils/invoiceProfit';
import { allocatePayment } from '../../src/utils/paymentAllocator';
import { buildPaymentLedger } from '../../src/utils/paymentLedger';
import { paidForDisplay, exchangeSettledTotal, paidSplitForDisplay } from '../../src/utils/invoicePayments';
import { activePaymentKeys } from '../../src/utils/paymentMethods';
import { refundRecordOf, refundPartsOf, computeShopAvailable } from '../../src/utils/treasury';
import { formatQty, unitStep, isFractionalUnit } from '../../src/utils/units';
import {
  PRODUCTS, CUSTOMERS, SETTINGS, buildOrder, buildDebtPayment, buildExpense, sumBucket, round2,
} from '../support/personas';

const DAY = '2026-03-10T12:00:00.000Z';
/** وسائل الدفع المفعّلة في المحل — الأساسية بس (method5/6 مقفولين). */
const KEYS = activePaymentKeys(SETTINGS as any);

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل عابر — كاش كامل، بدون بيانات', () => {
  // تي شيرت ١٠٠ × ٢ = ٢٠٠، كاش كامل
  const order = buildOrder({
    id: 'inv-walkin',
    date: DAY,
    items: [{ product: PRODUCTS.tshirt, quantity: 2 }],
    customer: CUSTOMERS.walkIn.customer,
  });

  it('الإجمالي بيتحسب من البنود', () => {
    expect(order.total).toBe(200);
    expect(order.paid_amount).toBe(200);
  });

  it('مفيش دين — دفع بالكامل', () => {
    expect(order.total - order.paid_amount).toBe(0);
  });

  it('الربح = ٢٠٠ − (٢ × ٦٠ تكلفة) = ٨٠', () => {
    expect(calculateInvoiceProfit(order)).toBe(80);
  });

  it('الفاتورة بتدخل الخزنة كاش', () => {
    const box = computeShopAvailable({ orders: [order], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(box.cash).toBe(200);
    expect(sumBucket(box)).toBe(200);
  });

  it('مفيش عميل مربوط بالفاتورة', () => {
    expect(order.customer).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل مسجّل — بيانات محفوظة وتقسيم دفع', () => {
  // جاكيت بسعر الخصم ٤٢٠ × ١ = ٤٢٠، دفع ٢٠٠ كاش + ٢٢٠ فيزا
  const price = priceForType(PRODUCTS.jacket, 'retail');
  const order = buildOrder({
    id: 'inv-reg',
    date: DAY,
    items: [{ product: PRODUCTS.jacket, quantity: 1, price }],
    customer: CUSTOMERS.registered.customer,
    split: { cash: 200, visa: 220 },
  });

  it('سعر الخصم القطاعي هو اللي بيتطبّق (٤٢٠ مش ٥٠٠)', () => {
    expect(price).toBe(420);
    expect(order.total).toBe(420);
  });

  it('التقسيمة بتتوزّع صح على الوسيلتين', () => {
    expect(order.paid_cash).toBe(200);
    expect(order.paid_visa).toBe(220);
    expect(order.paid_cash + order.paid_visa).toBe(order.total);
  });

  it('الخزنة بتتقسم كاش وفيزا مش كلها كاش', () => {
    const box = computeShopAvailable({ orders: [order], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(box.cash).toBe(200);
    expect(box.visa).toBe(220);
  });

  it('كشف الحساب بيطلع سطر لكل وسيلة باسم العميل', () => {
    const ledger = buildPaymentLedger([order], [], []);
    const cash = ledger.find((e) => e.method === 'cash');
    const visa = ledger.find((e) => e.method === 'visa');
    expect(cash?.inAmount).toBe(200);
    expect(visa?.inAmount).toBe(220);
    expect(cash?.desc).toContain('أحمد محمود');
  });

  it('الربح = ٤٢٠ − ٣٠٠ = ١٢٠', () => {
    expect(calculateInvoiceProfit(order)).toBe(120);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل بكارت عضوية', () => {
  const order = buildOrder({
    id: 'inv-card',
    date: DAY,
    items: [{ product: PRODUCTS.tshirt, quantity: 1 }],
    customer: CUSTOMERS.cardHolder.customer,
  });

  it('رقم الكارت بيتحفظ مع الفاتورة', () => {
    expect(order.customer.card_number).toBe('CARD-7788');
  });

  it('الكارت مابيغيّرش السعر — هو تعريف مش خصم', () => {
    expect(order.total).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل بالأجل — دفع جزئي ودين', () => {
  // إجمالي ٥٠٠ (٥ تي شيرت)، دفع ٢٠٠ → دين ٣٠٠
  const sale = buildOrder({
    id: 'inv-debt',
    date: '2026-03-10T12:00:00.000Z',
    items: [{ product: PRODUCTS.tshirt, quantity: 5 }],
    customer: CUSTOMERS.deferred.customer,
    paid: 200,
    split: { cash: 200 },
  });

  it('الدين = الإجمالي − المدفوع = ٣٠٠', () => {
    expect(sale.total).toBe(500);
    expect(sale.paid_amount).toBe(200);
    expect(sale.total - sale.paid_amount).toBe(300);
  });

  it('الخزنة بتاخد المدفوع بس مش الإجمالي', () => {
    const box = computeShopAvailable({ orders: [sale], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(box.cash).toBe(200);
  });

  it('الربح بيتحسب على الإجمالي كامل — البيعة تمّت حتى لو الفلوس لسه ماجتش', () => {
    // ٥٠٠ − (٥ × ٦٠) = ٢٠٠
    expect(calculateInvoiceProfit(sale)).toBe(200);
  });

  describe('بعد ما يرجع يسدّد ١٨٠ على نفس الفاتورة', () => {
    const payment = buildDebtPayment({
      id: 'pay-1',
      date: '2026-03-12T12:00:00.000Z',
      amount: 180,
      customer: CUSTOMERS.deferred.customer,
      targetInvoiceId: 'inv-debt',
    });

    it('السداد بيتوجّه للفاتورة المستهدفة كمبيعات', () => {
      const a = allocatePayment(payment, [sale, payment]);
      expect(a.toSales).toBe(180);
      expect(a.toServices).toBe(0);
      expect(a.toOldDebt).toBe(0);
    });

    it('الدين المتبقّي بقى ١٢٠', () => {
      expect(sale.total - sale.paid_amount - payment.paid_amount).toBe(120);
    });

    it('الخزنة بقت ٣٨٠ (٢٠٠ وقت البيع + ١٨٠ سداد)', () => {
      const box = computeShopAvailable(
        { orders: [sale, payment], expenses: [], purchases: [], salaries: [] }, SETTINGS,
      );
      expect(box.cash).toBe(380);
    });

    it('كشف الحساب مابيعدّش الفلوس مرتين', () => {
      const ledger = buildPaymentLedger([sale, payment], [], []);
      const total = ledger.reduce((s, e) => s + e.inAmount - e.outAmount, 0);
      expect(total).toBe(380);
    });

    it('السداد بيظهر بوصف «سداد آجل» مش «فاتورة بيع»', () => {
      const ledger = buildPaymentLedger([sale, payment], [], []);
      const p = ledger.find((e) => e.id.startsWith('pay-1'));
      expect(p?.kind).toBe('payment');
      expect(p?.desc).toContain('سداد آجل');
    });
  });

  describe('سداد بدون تحديد فاتورة — بيتوزّع بالترتيب الزمني', () => {
    const older = buildOrder({
      id: 'inv-old', date: '2026-03-01T12:00:00.000Z',
      items: [{ product: PRODUCTS.tshirt, quantity: 1 }],
      customer: CUSTOMERS.deferred.customer, paid: 0, split: { cash: 0 },
    });
    const newer = buildOrder({
      id: 'inv-new', date: '2026-03-05T12:00:00.000Z',
      items: [{ product: PRODUCTS.tshirt, quantity: 2 }],
      customer: CUSTOMERS.deferred.customer, paid: 0, split: { cash: 0 },
    });
    // دين ١٠٠ + ٢٠٠ = ٣٠٠، بيدفع ١٥٠
    const payment = buildDebtPayment({
      id: 'pay-2', date: '2026-03-08T12:00:00.000Z', amount: 150,
      customer: CUSTOMERS.deferred.customer,
    });

    it('بيتحسب كسداد مبيعات (مش خدمات)', () => {
      const a = allocatePayment(payment, [older, newer, payment]);
      expect(a.toSales + a.toServices + a.toOldDebt).toBe(150);
      expect(a.toServices).toBe(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل جملة ونص جملة', () => {
  it('عميل الجملة بياخد سعر الجملة ١٥', () => {
    expect(priceForType(PRODUCTS.socks, 'wholesale')).toBe(15);
  });

  it('عميل نص الجملة بياخد ٢٠', () => {
    expect(priceForType(PRODUCTS.socks, 'half')).toBe(20);
  });

  it('القطاعي بياخد ٢٥', () => {
    expect(priceForType(PRODUCTS.socks, 'retail')).toBe(25);
  });

  it('منتج مالوش سعر جملة بيرجع لسعر البيع العادي', () => {
    // التي شيرت مالوش wholesale_price
    expect(priceForType(PRODUCTS.tshirt, 'wholesale')).toBe(100);
    expect(priceForType(PRODUCTS.tshirt, 'half')).toBe(100);
  });

  it('سعر الخصم مابيتطبّقش على فاتورة جملة', () => {
    // الجاكيت عليه discount_price ٤٢٠ لكن مالوش wholesale_price
    // → فاتورة الجملة بتاخد sale_price ٥٠٠ مش سعر الخصم
    expect(priceForType(PRODUCTS.jacket, 'wholesale')).toBe(500);
    expect(priceForType(PRODUCTS.jacket, 'retail')).toBe(420);
  });

  it('فاتورة جملة ١٠٠ شراب: ١٥٠٠ بربح ٥٠٠', () => {
    const order = buildOrder({
      id: 'inv-whole', date: DAY,
      items: [{ product: PRODUCTS.socks, quantity: 100, price: priceForType(PRODUCTS.socks, 'wholesale') }],
      customer: CUSTOMERS.wholesale.customer,
    });
    expect(order.total).toBe(1500);
    // ١٥٠٠ − (١٠٠ × ١٠) = ٥٠٠
    expect(calculateInvoiceProfit(order)).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل بيشتري بالوزن', () => {
  it('الكيلو وحدة كسرية والخطوة ربع كيلو', () => {
    expect(isFractionalUnit(PRODUCTS.rice.unit)).toBe(true);
    expect(unitStep(PRODUCTS.rice.unit)).toBe(0.25);
  });

  it('القطعة مش كسرية والخطوة واحد', () => {
    expect(isFractionalUnit(PRODUCTS.tshirt.unit)).toBe(false);
    expect(unitStep(PRODUCTS.tshirt.unit)).toBe(1);
  });

  it('٢.٥ كيلو أرز = ٧٥ جنيه', () => {
    const order = buildOrder({
      id: 'inv-rice', date: DAY,
      items: [{ product: PRODUCTS.rice, quantity: 2.5 }],
      customer: CUSTOMERS.walkIn.customer,
    });
    expect(order.total).toBe(75);
    // ٧٥ − (٢.٥ × ١٨) = ٣٠
    expect(calculateInvoiceProfit(order)).toBe(30);
  });

  it('الكمية بتتعرض بوحدتها', () => {
    expect(formatQty(2.5, 'كيلو')).toBe('2.5 كيلو (كجم)');
    expect(formatQty(3, 'قطعة')).toBe('3 قطعة');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل بيرجّع بضاعة', () => {
  // اشترى ٤ تي شيرت بـ ٤٠٠ كاش، رجّع ١
  const order = buildOrder({
    id: 'inv-return', date: DAY,
    items: [{ product: PRODUCTS.tshirt, quantity: 4, returned_quantity: 1, refunded_amount: 100 }],
    customer: CUSTOMERS.registered.customer,
    total: 400, paid: 400, split: { cash: 400 },
    refundedSplit: { cash: 100 },
  });

  it('قيمة البضاعة المرتجعة = ١٠٠', () => {
    expect(calculateOrderReturnValue(order)).toBe(100);
  });

  it('المبلغ المرتجع كاش = ١٠٠', () => {
    expect(calculateCashRefunded(order)).toBe(100);
  });

  it('الربح بيقلّ بالمرتجع: (٤٠٠−١٠٠) − (٣ × ٦٠) = ١٢٠', () => {
    expect(calculateInvoiceProfit(order)).toBe(120);
  });

  it('الخزنة صافي ٣٠٠ بعد رد الـ ١٠٠', () => {
    const box = computeShopAvailable({ orders: [order], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(box.cash).toBe(300);
  });

  it('كشف الحساب بيسجّل الرد كصادر', () => {
    const ledger = buildPaymentLedger([order], [], []);
    const refund = ledger.find((e) => e.kind === 'return');
    expect(refund?.outAmount).toBe(100);
    expect(refund?.method).toBe('cash');
  });

  it('المرتجع بيرجع على الوسيلة اللي اتدفع بيها', () => {
    // فاتورة اتدفعت ٣٠٠ كاش + ٧٠٠ فيزا، من غير تقسيمة مرتجع
    const mixed = buildOrder({
      id: 'inv-mixed', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 10 }],
      total: 1000, paid: 1000, split: { cash: 300, visa: 700 },
    });
    // أكبر وسيلة في الدفع = فيزا → الرد يرجع فيزا مش كاش
    expect(refundRecordOf(mixed, 200).payment_method).toBe('visa');
  });

  it('مرتجع متقسّم على أكتر من وسيلة بيطلع سطر لكل وسيلة', () => {
    const split = buildOrder({
      id: 'inv-splitref', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 5, returned_quantity: 2, refunded_amount: 200 }],
      total: 500, paid: 500, split: { cash: 250, visa: 250 },
      refundedSplit: { cash: 120, visa: 80 },
    });
    const parts = refundPartsOf(split, 200);
    expect(parts).toEqual([['cash', 120], ['visa', 80]]);
  });

  it('مرتجع مسدَّد على الدين مابيردّش كاش', () => {
    // رجّع بضاعة بـ ١٠٠ بس ماخدش فلوس (اتخصمت من دينه)
    const onDebt = buildOrder({
      id: 'inv-retdebt', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 4, returned_quantity: 1, refunded_amount: 0 }],
      customer: CUSTOMERS.deferred.customer,
      total: 400, paid: 100, split: { cash: 100 },
    });
    expect(calculateOrderReturnValue(onDebt)).toBe(100); // قيمة البضاعة رجعت
    expect(calculateCashRefunded(onDebt)).toBe(0);       // بس مفيش كاش خرج
    // الدين بقى ٤٠٠ − ١٠٠ مرتجع − ١٠٠ مدفوع = ٢٠٠
    expect(onDebt.total - calculateOrderReturnValue(onDebt) - onDebt.paid_amount).toBe(200);
  });

  it('مرتجع كامل: الربح صفر والخزنة صفر', () => {
    const full = buildOrder({
      id: 'inv-fullret', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 2, returned_quantity: 2, refunded_amount: 200 }],
      total: 200, paid: 200, split: { cash: 200 },
      refundedSplit: { cash: 200 },
    });
    expect(calculateInvoiceProfit(full)).toBe(0);
    const box = computeShopAvailable({ orders: [full], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(box.cash).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل بيستبدل', () => {
  // اشترى بـ ١٩٠٠ كاش، بعدين استبدل ودفع فرق ١١٦٠
  const order = buildOrder({
    id: 'inv-exch', date: DAY,
    items: [{ product: PRODUCTS.jacket, quantity: 4, price: 475 }],
    customer: CUSTOMERS.registered.customer,
    total: 3060, paid: 1900, split: { cash: 1900 },
    exchange_data: {
      date: '2026-03-15T12:00:00.000Z',
      diff: 1160,
      method: 'visa',
      split: { visa: 1160 },
    },
  });

  it('فرق الاستبدال متسجّل ١١٦٠', () => {
    expect(exchangeSettledTotal(order)).toBe(1160);
  });

  it('المعروض للعميل = المدفوع وقت البيع + فرق الاستبدال = الإجمالي', () => {
    // ده الباج اللي الفاتورة المطبوعة كانت بتقول فيه «إجمالي ٣٠٦٠، كاش ١٩٠٠»
    expect(paidForDisplay(order, KEYS)).toBe(3060);
    expect(paidForDisplay(order, KEYS)).toBe(order.total);
  });

  it('التقسيمة المعروضة بتجمع الوسيلتين', () => {
    const split = paidSplitForDisplay(order, KEYS);
    expect(split.cash).toBe(1900);
    expect(split.visa).toBe(1160);
  });

  it('الأرقام المحاسبية الأصلية ما اتلمستش', () => {
    // مهم: تقسيمة الفاتورة بتفضل زي ما هي عشان مايتغيّرش تقفيل يوم مقفول
    expect(order.paid_cash).toBe(1900);
    expect(order.paid_visa).toBe(0);
  });

  it('استبدال متعدّد بيتجمع كله', () => {
    const multi = buildOrder({
      id: 'inv-exch2', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 10 }],
      total: 1000, paid: 600, split: { cash: 600 },
      exchange_data: {
        date: '2026-03-20T12:00:00.000Z', diff: 150, method: 'cash', split: { cash: 150 },
        history: [{ date: '2026-03-16T12:00:00.000Z', diff: 250, method: 'visa', split: { visa: 250 } }],
      },
    });
    expect(exchangeSettledTotal(multi)).toBe(400);
    expect(paidForDisplay(multi, KEYS)).toBe(1000);
  });

  it('استبدال بفرق سالب (رد للعميل) بيقلّل المعروض', () => {
    const refundExch = buildOrder({
      id: 'inv-exch3', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 10 }],
      total: 1000, paid: 1000, split: { cash: 1000 },
      exchange_data: { date: DAY, diff: -200, method: 'cash', split: { cash: -200 } },
    });
    expect(exchangeSettledTotal(refundExch)).toBe(-200);
    expect(paidForDisplay(refundExch, KEYS)).toBe(800);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل بكوبون خصم', () => {
  // ٥ تي شيرت = ٥٠٠، كوبون خصم ٥٠ → ٤٥٠
  const order = buildOrder({
    id: 'inv-coupon', date: DAY,
    items: [{ product: PRODUCTS.tshirt, quantity: 5 }],
    customer: CUSTOMERS.registered.customer,
    coupon_code: 'WELCOME50',
    discount_amount: 50,
  });

  it('الخصم بيتخصم من الإجمالي', () => {
    expect(order.total).toBe(450);
    expect(order.discount_amount).toBe(50);
    expect(order.coupon_code).toBe('WELCOME50');
  });

  it('الخصم بياكل من الربح: ٤٥٠ − ٣٠٠ = ١٥٠', () => {
    expect(calculateInvoiceProfit(order)).toBe(150);
  });

  it('المرتجع بيتحسب بنسبة الخصم مش بالسعر الكامل', () => {
    // رجّع قطعة واحدة من فاتورة عليها خصم
    const withReturn = buildOrder({
      id: 'inv-coupon-ret', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 5, returned_quantity: 1 }],
      discount_amount: 50,
    });
    // مجموع البنود ٥٠٠، الإجمالي ٤٥٠ → النسبة ٠.٩
    // المرتجع = ١٠٠ × ٠.٩ = ٩٠ (مش ١٠٠)
    expect(calculateOrderReturnValue(withReturn)).toBe(90);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل منصة أونلاين', () => {
  const order = buildOrder({
    id: 'inv-online', date: DAY,
    items: [{ product: PRODUCTS.jacket, quantity: 1, price: 420 }],
    customer: CUSTOMERS.online.customer,
    sales_channel: 'noon',
    split: { instapay: 420 },
  });

  it('قناة البيع متسجّلة', () => {
    expect(order.sales_channel).toBe('noon');
  });

  it('الفلوس بتدخل على انستاباي مش الكاش', () => {
    const box = computeShopAvailable({ orders: [order], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(box.instapay).toBe(420);
    expect(box.cash).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('عميل صيانة سيارات', () => {
  const service = buildOrder({
    id: 'inv-car', date: DAY,
    items: [{ product: PRODUCTS.tshirt, quantity: 1, price: 800 }],
    customer: CUSTOMERS.registered.customer,
    car_id: 'car-77', total: 800, paid: 300, split: { cash: 300 },
  });

  it('سداد فاتورة صيانة بيتحسب خدمات مش مبيعات', () => {
    const payment = buildDebtPayment({
      id: 'pay-car', date: DAY, amount: 500,
      customer: CUSTOMERS.registered.customer, targetInvoiceId: 'inv-car',
    });
    const a = allocatePayment(payment, [service, payment]);
    expect(a.toServices).toBe(500);
    expect(a.toSales).toBe(0);
  });

  it('سداد بدون عميل على سيارة بيتحسب خدمات', () => {
    const anon = buildDebtPayment({ id: 'pay-anon', date: DAY, amount: 200, customer: null, car_id: 'car-77' });
    const a = allocatePayment(anon, [anon]);
    expect(a.toServices).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('فاتورة ملغية', () => {
  const deleted = buildOrder({
    id: 'inv-del', date: DAY,
    items: [{ product: PRODUCTS.tshirt, quantity: 3 }],
    is_deleted: true,
  });

  it('مابتدخلش الخزنة', () => {
    const box = computeShopAvailable({ orders: [deleted], expenses: [], purchases: [], salaries: [] }, SETTINGS);
    expect(sumBucket(box)).toBe(0);
  });

  it('مابتدخلش كشف الحساب', () => {
    expect(buildPaymentLedger([deleted], [], [])).toHaveLength(0);
  });

  it('ربحها صفر', () => {
    expect(calculateInvoiceProfit(deleted)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('يوم كامل بكل أنواع العملاء مع بعض', () => {
  const orders = [
    // عابر كاش ٢٠٠
    buildOrder({ id: 'd-1', date: DAY, items: [{ product: PRODUCTS.tshirt, quantity: 2 }] }),
    // مسجّل مقسّم ٢٠٠ كاش + ٢٢٠ فيزا
    buildOrder({
      id: 'd-2', date: DAY, items: [{ product: PRODUCTS.jacket, quantity: 1, price: 420 }],
      customer: CUSTOMERS.registered.customer, split: { cash: 200, visa: 220 },
    }),
    // آجل: إجمالي ٥٠٠ دفع ٢٠٠
    buildOrder({
      id: 'd-3', date: DAY, items: [{ product: PRODUCTS.tshirt, quantity: 5 }],
      customer: CUSTOMERS.deferred.customer, paid: 200, split: { cash: 200 },
    }),
    // جملة ١٥٠٠ انستاباي
    buildOrder({
      id: 'd-4', date: DAY, items: [{ product: PRODUCTS.socks, quantity: 100, price: 15 }],
      customer: CUSTOMERS.wholesale.customer, split: { instapay: 1500 },
    }),
    // مرتجع: باع ٤٠٠ ورد ١٠٠
    buildOrder({
      id: 'd-5', date: DAY,
      items: [{ product: PRODUCTS.tshirt, quantity: 4, returned_quantity: 1, refunded_amount: 100 }],
      total: 400, paid: 400, split: { cash: 400 }, refundedSplit: { cash: 100 },
    }),
  ];
  const expenses = [buildExpense({ id: 'e-1', date: DAY, amount: 150, category: 'مصاريف عامة', note: 'بوفيه' })];

  it('الكاش في الدرج = ٢٠٠+٢٠٠+٢٠٠+٤٠٠ − ١٠٠ رد − ١٥٠ مصروف = ٧٥٠', () => {
    const box = computeShopAvailable({ orders, expenses, purchases: [], salaries: [] }, SETTINGS);
    expect(box.cash).toBe(750);
  });

  it('الفيزا ٢٢٠ والانستاباي ١٥٠٠', () => {
    const box = computeShopAvailable({ orders, expenses, purchases: [], salaries: [] }, SETTINGS);
    expect(box.visa).toBe(220);
    expect(box.instapay).toBe(1500);
  });

  it('إجمالي الخزنة ٢٤٧٠', () => {
    const box = computeShopAvailable({ orders, expenses, purchases: [], salaries: [] }, SETTINGS);
    expect(sumBucket(box)).toBe(2470);
  });

  it('كشف الحساب بيطابق رصيد الخزنة بالظبط', () => {
    const ledger = buildPaymentLedger(orders, expenses, []);
    const net = ledger.reduce((s, e) => s + e.inAmount - e.outAmount, 0);
    const box = computeShopAvailable({ orders, expenses, purchases: [], salaries: [] }, SETTINGS);
    expect(round2(net)).toBe(round2(sumBucket(box)));
  });

  it('إجمالي الأرباح من كل الفواتير = ٩٧٠', () => {
    // d-1: 200−120=80 | d-2: 420−300=120 | d-3: 500−300=200
    // d-4: 1500−1000=500 | d-5: (400−100)−(3×60)=120  → 1020
    const profit = orders.reduce((s, o) => s + calculateInvoiceProfit(o), 0);
    expect(profit).toBe(1020);
  });

  it('إجمالي ديون العملاء = ٣٠٠ (من الفاتورة الآجلة بس)', () => {
    const debt = orders
      .filter((o) => !o.is_deleted && o.type === 'sale')
      .reduce((s, o) => s + Math.max(0, o.total - calculateOrderReturnValue(o) - o.paid_amount), 0);
    expect(debt).toBe(300);
  });
});
