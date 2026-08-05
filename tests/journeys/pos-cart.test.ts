/**
 * ── رحلة الكاشير على الشاشة ─────────────────────────────────────────────────
 *
 * التستات دي بتشغّل **الستور الحقيقي** (useStore) زي ما الكاشير بيستخدمه:
 * بيدوس على المنتج، بيغيّر الكمية، بيبدّل نوع الفاتورة، بيمسح صنف.
 *
 * Supabase متبدَّل بنسخة وهمية عشان الستور بيستورده وقت التحميل — عمليات
 * السلة نفسها مابتلمسش الشبكة أصلاً.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- تركيب مخازن المتصفح على globalThis */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PRODUCTS } from '../support/personas';

// لازم قبل أي import للستور: الستور بيقرا sessionStorage وقت التهيئة.
function fakeStorage() {
  const m: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in m ? m[k] : null),
    setItem: (k: string, v: string) => { m[k] = v; },
    removeItem: (k: string) => { delete m[k]; },
    clear: () => { for (const k of Object.keys(m)) delete m[k]; },
  };
}
(globalThis as any).sessionStorage = fakeStorage();
(globalThis as any).localStorage = fakeStorage();

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: () => ({ select: () => ({ data: [], error: null }) }),
    rpc: async () => ({ data: null, error: null }),
    auth: { signInWithPassword: async () => ({ data: null, error: null }) },
  },
  fetchAllRows: async () => [],
}));

const { useStore } = await import('../../src/store/useStore');

const CATALOG = [
  PRODUCTS.tshirt, PRODUCTS.jacket, PRODUCTS.socks, PRODUCTS.rice, PRODUCTS.soldOut,
] as any[];

const cartTotal = () =>
  useStore.getState().cart.reduce((s, i: any) => s + i.quantity * i.sale_price, 0);

beforeEach(() => {
  useStore.setState({ products: CATALOG, cart: [], invoiceType: 'retail', salesperson: null } as any);
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الكاشير بيضيف منتجات للسلة', () => {
  it('دوسة على منتج بتضيفه بكمية ١', () => {
    useStore.getState().addToCart(PRODUCTS.tshirt as any);
    const cart = useStore.getState().cart;
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].sale_price).toBe(100);
  });

  it('دوسة تانية على نفس المنتج بتزوّد الكمية مش بتضيف سطر جديد', () => {
    useStore.getState().addToCart(PRODUCTS.tshirt as any);
    useStore.getState().addToCart(PRODUCTS.tshirt as any);
    expect(useStore.getState().cart).toHaveLength(1);
    expect(useStore.getState().cart[0].quantity).toBe(2);
    expect(cartTotal()).toBe(200);
  });

  it('المنتج اللي عليه خصم بيدخل بسعر الخصم', () => {
    useStore.getState().addToCart(PRODUCTS.jacket as any);
    expect(useStore.getState().cart[0].sale_price).toBe(420);
  });

  it('صنف مخزونه صفر مايدخلش السلة', () => {
    useStore.getState().addToCart(PRODUCTS.soldOut as any);
    expect(useStore.getState().cart).toHaveLength(0);
  });

  it('مايزوّدش أكتر من المخزون المتاح', () => {
    const limited = { ...PRODUCTS.tshirt, id: 'p-limited', stock_quantity: 2 } as any;
    useStore.setState({ products: [...CATALOG, limited] } as any);
    useStore.getState().addToCart(limited);
    useStore.getState().addToCart(limited);
    useStore.getState().addToCart(limited); // الزيادة دي المفروض تتمنع
    expect(useStore.getState().cart[0].quantity).toBe(2);
  });

  it('منتج بالوزن بيدخل بخطوة ربع كيلو', () => {
    useStore.getState().addToCart(PRODUCTS.rice as any);
    expect(useStore.getState().cart[0].quantity).toBe(0.25);
    expect(cartTotal()).toBe(7.5); // 0.25 × 30
  });

  it('إدخال وزن محدد (١.٥ كيلو) بيحسب ٤٥ جنيه', () => {
    useStore.getState().addToCartQty(PRODUCTS.rice as any, 1.5);
    expect(useStore.getState().cart[0].quantity).toBe(1.5);
    expect(cartTotal()).toBe(45);
  });

  it('سلة فيها كذا صنف بتجمع صح', () => {
    useStore.getState().addToCart(PRODUCTS.tshirt as any);   // 100
    useStore.getState().addToCart(PRODUCTS.jacket as any);   // 420
    useStore.getState().addToCartQty(PRODUCTS.rice as any, 2); // 60
    expect(useStore.getState().cart).toHaveLength(3);
    expect(cartTotal()).toBe(580);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('الكاشير بيعدّل السلة', () => {
  beforeEach(() => {
    useStore.getState().addToCart(PRODUCTS.tshirt as any);
  });

  it('تغيير الكمية بيتحدّث الإجمالي', () => {
    useStore.getState().updateQuantity(PRODUCTS.tshirt.id, 4);
    expect(cartTotal()).toBe(400);
  });

  it('كمية أكبر من المخزون بتتقصّ على المخزون', () => {
    useStore.getState().updateQuantity(PRODUCTS.tshirt.id, 9999);
    expect(useStore.getState().cart[0].quantity).toBe(PRODUCTS.tshirt.stock_quantity);
  });

  it('كمية صفر أو سالبة بتتحوّل لأقل كمية مسموحة (١ للقطعة)', () => {
    useStore.getState().updateQuantity(PRODUCTS.tshirt.id, 0);
    expect(useStore.getState().cart[0].quantity).toBe(1);
    useStore.getState().updateQuantity(PRODUCTS.tshirt.id, -5);
    expect(useStore.getState().cart[0].quantity).toBe(1);
  });

  it('الوحدة الكسرية أقل كمية فيها أصغر بكتير', () => {
    useStore.getState().addToCart(PRODUCTS.rice as any);
    useStore.getState().updateQuantity(PRODUCTS.rice.id, 0);
    expect(useStore.getState().cart.find((i: any) => i.id === PRODUCTS.rice.id)!.quantity).toBe(0.001);
  });

  it('تعديل السعر بالإيد بيثبت', () => {
    useStore.getState().updatePrice(PRODUCTS.tshirt.id, 85);
    expect(cartTotal()).toBe(85);
  });

  it('مسح صنف بيشيله من السلة', () => {
    useStore.getState().addToCart(PRODUCTS.jacket as any);
    useStore.getState().removeFromCart(PRODUCTS.tshirt.id);
    expect(useStore.getState().cart).toHaveLength(1);
    expect(useStore.getState().cart[0].id).toBe(PRODUCTS.jacket.id);
  });

  it('تفريغ السلة بيمسح كل حاجة', () => {
    useStore.getState().addToCart(PRODUCTS.jacket as any);
    useStore.getState().clearCart();
    expect(useStore.getState().cart).toHaveLength(0);
    expect(cartTotal()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('التبديل بين قطاعي وجملة ونص جملة', () => {
  beforeEach(() => {
    useStore.getState().addToCartQty(PRODUCTS.socks as any, 10);
  });

  it('القطاعي: ١٠ × ٢٥ = ٢٥٠', () => {
    expect(cartTotal()).toBe(250);
  });

  it('التحويل لجملة بيعيد تسعير السلة فوراً: ١٠ × ١٥ = ١٥٠', () => {
    useStore.getState().setInvoiceType('wholesale');
    expect(useStore.getState().cart[0].sale_price).toBe(15);
    expect(cartTotal()).toBe(150);
  });

  it('التحويل لنص جملة: ١٠ × ٢٠ = ٢٠٠', () => {
    useStore.getState().setInvoiceType('half');
    expect(cartTotal()).toBe(200);
  });

  it('الرجوع للقطاعي بيرجّع السعر الأصلي', () => {
    useStore.getState().setInvoiceType('wholesale');
    useStore.getState().setInvoiceType('retail');
    expect(cartTotal()).toBe(250);
  });

  it('صنف مالوش سعر جملة بيفضل بسعره الأساسي', () => {
    useStore.getState().clearCart();
    useStore.getState().addToCart(PRODUCTS.tshirt as any);
    useStore.getState().setInvoiceType('wholesale');
    expect(useStore.getState().cart[0].sale_price).toBe(100);
  });

  it('صنف عليه خصم قطاعي بياخد سعره الأساسي في الجملة مش سعر الخصم', () => {
    useStore.getState().clearCart();
    useStore.getState().addToCart(PRODUCTS.jacket as any);
    expect(useStore.getState().cart[0].sale_price).toBe(420); // قطاعي
    useStore.getState().setInvoiceType('wholesale');
    expect(useStore.getState().cart[0].sale_price).toBe(500); // الأساسي
  });

  it('الإضافة وقت الجملة بتدخل بسعر الجملة من الأول', () => {
    useStore.getState().clearCart();
    useStore.getState().setInvoiceType('wholesale');
    useStore.getState().addToCart(PRODUCTS.socks as any);
    expect(useStore.getState().cart[0].sale_price).toBe(15);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('استرجاع سلة موقوفة', () => {
  it('السلة بترجع زي ما هي بأسعارها المعدّلة بالإيد', () => {
    // الكاشير عدّل السعر بإيده قبل ما يوقف السلة
    useStore.getState().addToCart(PRODUCTS.socks as any);
    useStore.getState().updatePrice(PRODUCTS.socks.id, 22);
    const parked = useStore.getState().cart;

    useStore.getState().clearCart();
    useStore.getState().restoreCart(parked as any, 'wholesale', null);

    // مهم: الاسترجاع مايعيدش التسعير — السعر اليدوي ٢٢ لازم يفضل
    expect(useStore.getState().cart[0].sale_price).toBe(22);
    expect(useStore.getState().invoiceType).toBe('wholesale');
  });
});
