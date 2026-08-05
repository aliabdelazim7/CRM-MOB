/* eslint-disable @typescript-eslint/no-explicit-any -- صفوف بشكل قاعدة البيانات الخام */
/**
 * ── طاقم الاختبار: العملاء والمستخدمين والمنتجات ────────────────────────────
 *
 * الملف ده بيوصف «مين بيستخدم السيستم» — كل نوع عميل وكل نوع مستخدم — عشان
 * ملفات الرحلات تشغّل نفس السيناريوهات الحقيقية بدل أرقام عشوائية.
 *
 * ملحوظة مهمة: الأرقام هنا **متحسبة بالإيد** في التستات نفسها، مش متاخدة من
 * ناتج الكود. تست بيقارن الكود بنفسه مابيثبتش حاجة.
 */

import { ALL_PAYMENT_KEYS } from '../../src/utils/paymentMethods';

// ── إعدادات المحل ────────────────────────────────────────────────────────────

export const SETTINGS = {
  name: 'محل التجربة',
  currency: 'ج.م',
  themeColor: '#4f46e5',
  dayStartHour: 3,
  // كل الوسائل الأساسية مفتوحة، والإضافية مقفولة
  enable_method5: false,
  enable_method6: false,
  cashierPermissions: {} as Record<string, boolean>,
};

/** إعدادات بصلاحيات كاشير مقيّدة. */
export function settingsWithCashierPerms(perms: Record<string, boolean>) {
  return { ...SETTINGS, cashierPermissions: perms };
}

// ── كتالوج المنتجات ──────────────────────────────────────────────────────────
// منتجات بوحدات وأسعار مختلفة عشان نغطّي القطعة والوزن والخصم والجملة.

export const PRODUCTS = {
  /** قطعة عادية، بدون خصم ولا جملة. */
  tshirt: {
    id: 'p-tshirt',
    name: 'تي شيرت قطن',
    barcode: '1000001',
    unit: 'قطعة',
    purchase_price: 60,
    average_purchase_price: 60,
    sale_price: 100,
    stock_quantity: 50,
    category_id: 'c-clothes',
  },
  /** عليه سعر خصم قطاعي. */
  jacket: {
    id: 'p-jacket',
    name: 'جاكيت شتوي',
    barcode: '1000002',
    unit: 'قطعة',
    purchase_price: 300,
    average_purchase_price: 300,
    sale_price: 500,
    discount_price: 420,
    stock_quantity: 20,
    category_id: 'c-clothes',
  },
  /** له سعر جملة ونص جملة. */
  socks: {
    id: 'p-socks',
    name: 'شراب رياضي',
    barcode: '1000003',
    unit: 'قطعة',
    purchase_price: 10,
    average_purchase_price: 10,
    sale_price: 25,
    half_wholesale_price: 20,
    wholesale_price: 15,
    stock_quantity: 500,
    category_id: 'c-clothes',
  },
  /** وحدة كسرية — بيتباع بالوزن. */
  rice: {
    id: 'p-rice',
    name: 'أرز',
    barcode: '1000004',
    unit: 'كيلو',
    purchase_price: 18,
    average_purchase_price: 18,
    sale_price: 30,
    stock_quantity: 100,
    category_id: 'c-food',
  },
  /** مخزون خلص — مايتضافش للسلة. */
  soldOut: {
    id: 'p-soldout',
    name: 'صنف خلصان',
    barcode: '1000005',
    unit: 'قطعة',
    purchase_price: 50,
    average_purchase_price: 50,
    sale_price: 90,
    stock_quantity: 0,
    category_id: 'c-clothes',
  },
};

// ── أنواع العملاء ────────────────────────────────────────────────────────────

export interface Persona {
  key: string;
  /** الوصف بالعربي زي ما المستخدم بيفكر فيه. */
  label: string;
  customer: { id: string; name: string; phone: string; card_number?: string } | null;
  /** نوع الفاتورة اللي بيتعامل بيها. */
  invoiceType: 'retail' | 'wholesale' | 'half';
  /** بيدفع كامل ولا بيسيب آجل؟ */
  paysInFull: boolean;
}

export const CUSTOMERS: Record<string, Persona> = {
  walkIn: {
    key: 'walkIn',
    label: 'عميل عابر — بدون بيانات، كاش كامل',
    customer: null,
    invoiceType: 'retail',
    paysInFull: true,
  },
  registered: {
    key: 'registered',
    label: 'عميل مسجّل — باسم وتليفون',
    customer: { id: 'cust-reg', name: 'أحمد محمود', phone: '01000000001' },
    invoiceType: 'retail',
    paysInFull: true,
  },
  cardHolder: {
    key: 'cardHolder',
    label: 'عميل بكارت عضوية',
    customer: { id: 'cust-card', name: 'سارة علي', phone: '01000000002', card_number: 'CARD-7788' },
    invoiceType: 'retail',
    paysInFull: true,
  },
  deferred: {
    key: 'deferred',
    label: 'عميل بالأجل — بيدفع جزء والباقي دين',
    customer: { id: 'cust-debt', name: 'محمد الآجل', phone: '01000000003' },
    invoiceType: 'retail',
    paysInFull: false,
  },
  wholesale: {
    key: 'wholesale',
    label: 'عميل جملة',
    customer: { id: 'cust-whole', name: 'تاجر الجملة', phone: '01000000004' },
    invoiceType: 'wholesale',
    paysInFull: true,
  },
  halfWholesale: {
    key: 'halfWholesale',
    label: 'عميل نص جملة',
    customer: { id: 'cust-half', name: 'تاجر نص جملة', phone: '01000000005' },
    invoiceType: 'half',
    paysInFull: true,
  },
  online: {
    key: 'online',
    label: 'عميل منصة أونلاين (شحن)',
    customer: { id: 'cust-online', name: 'طلب أونلاين', phone: '01000000006' },
    invoiceType: 'retail',
    paysInFull: true,
  },
};

export const ALL_CUSTOMER_KEYS = Object.keys(CUSTOMERS);

// ── أنواع المستخدمين ─────────────────────────────────────────────────────────

export interface UserPersona {
  key: string;
  label: string;
  /** null = المدير العام (كل الصلاحيات). */
  adminPermissions: string[] | null;
  /** بيانات الكاشير لو بيشتغل على نقطة البيع. */
  cashier: { id: string; name: string; full_access?: boolean } | null;
  /** صلاحيات الكاشير من إعدادات المحل. */
  cashierPermissions: Record<string, boolean>;
}

export const USERS: Record<string, UserPersona> = {
  owner: {
    key: 'owner',
    label: 'المدير العام — كل الصلاحيات',
    adminPermissions: null,
    cashier: { id: 'master', name: 'مدير النظام' },
    cashierPermissions: {},
  },
  masterOnPos: {
    key: 'masterOnPos',
    label: 'المدير واقف على الكاشير — بيتخطّى كل القيود',
    adminPermissions: null,
    cashier: { id: 'master', name: 'مدير النظام' },
    // حتى لو الإعدادات قافلة كل حاجة، الماستر بيعدّي
    cashierPermissions: {
      editDelete: false, returns: false, debt: false, dayClosing: false,
      wholesale: false, savings: false, barcodePrint: false, employeeDeduction: false,
    },
  },
  fullAccessCashier: {
    key: 'fullAccessCashier',
    label: 'كاشير بصلاحية كاملة — بيعدّي الـ OTP',
    adminPermissions: ['/admin/pos'],
    cashier: { id: 'cash-1', name: 'كاشير أول', full_access: true },
    cashierPermissions: {},
  },
  normalCashier: {
    key: 'normalCashier',
    label: 'كاشير عادي — الافتراضي مسموح',
    adminPermissions: ['/admin/pos'],
    cashier: { id: 'cash-2', name: 'كاشير عادي' },
    cashierPermissions: {},
  },
  limitedCashier: {
    key: 'limitedCashier',
    label: 'كاشير مقيّد — ممنوع مرتجعات وحذف وتقفيل',
    adminPermissions: ['/admin/pos'],
    cashier: { id: 'cash-3', name: 'كاشير مقيّد' },
    cashierPermissions: { returns: false, editDelete: false, dayClosing: false, wholesale: false },
  },
  restrictedAdmin: {
    key: 'restrictedAdmin',
    label: 'مستخدم إدارة بصلاحيات محدودة — مخزون وفواتير بس',
    adminPermissions: ['/admin/inventory', '/admin/invoices'],
    cashier: null,
    cashierPermissions: {},
  },
};

export const ALL_USER_KEYS = Object.keys(USERS);

// ── بنّاؤون للصفوف المالية ───────────────────────────────────────────────────

const zeroSplit = () => Object.fromEntries(ALL_PAYMENT_KEYS.map((k) => [`paid_${k}`, 0]));

export interface OrderItemInput {
  product: { id: string; name: string; sale_price: number; average_purchase_price?: number; purchase_price?: number; unit?: string };
  quantity: number;
  /** السعر المطبَّق فعلياً (جملة/خصم/قطاعي). */
  price?: number;
  returned_quantity?: number;
  refunded_amount?: number;
}

/**
 * بناء فاتورة بيع بنفس شكل الصفوف اللي بتيجي من قاعدة البيانات.
 * `split` بيوصف اتدفع بإيه فعلاً؛ `paid` إجمالي المدفوع (أقل من الإجمالي = آجل).
 */
export function buildOrder(opts: {
  id: string;
  date: string;
  items: OrderItemInput[];
  /** لو مش متبعت، بيتحسب من البنود. */
  total?: number;
  paid?: number;
  split?: Partial<Record<string, number>>;
  customer?: Persona['customer'];
  type?: 'sale' | 'payment' | 'previous_debt';
  cashier_name?: string;
  salesperson_id?: string;
  salesperson_name?: string;
  sales_channel?: string;
  coupon_code?: string;
  discount_amount?: number;
  notes?: string;
  car_id?: string;
  is_deleted?: boolean;
  refund_method?: string;
  refundedSplit?: Partial<Record<string, number>>;
  exchange_data?: any;
  client_ref?: string;
}) {
  const items = opts.items.map((it) => ({
    id: `${opts.id}-${it.product.id}`,
    product_id: it.product.id,
    name: it.product.name,
    quantity: it.quantity,
    sale_price: it.price ?? it.product.sale_price,
    average_purchase_price: it.product.average_purchase_price ?? it.product.purchase_price ?? 0,
    purchase_price: it.product.purchase_price ?? 0,
    unit: it.product.unit ?? 'قطعة',
    returned_quantity: it.returned_quantity ?? 0,
    refunded_amount: it.refunded_amount ?? 0,
  }));

  const itemsSum = items.reduce((s, i) => s + i.quantity * i.sale_price, 0);
  const total = opts.total ?? itemsSum - (opts.discount_amount ?? 0);
  const paid = opts.paid ?? total;

  const row: any = {
    ...zeroSplit(),
    id: opts.id,
    date: opts.date,
    items,
    total,
    paid_amount: paid,
    type: opts.type ?? 'sale',
    payment_method: 'cash',
    customer: opts.customer ?? undefined,
    cashier_name: opts.cashier_name,
    salesperson_id: opts.salesperson_id,
    salesperson_name: opts.salesperson_name,
    sales_channel: opts.sales_channel,
    coupon_code: opts.coupon_code ?? null,
    discount_amount: opts.discount_amount ?? 0,
    notes: opts.notes ?? null,
    car_id: opts.car_id,
    is_deleted: opts.is_deleted ?? false,
    client_ref: opts.client_ref ?? null,
  };

  if (opts.exchange_data) row.exchange_data = opts.exchange_data;
  if (opts.refund_method) row.refund_method = opts.refund_method;

  // تقسيمة الدفع: لو مش متبعتة، الكل كاش.
  const split = opts.split ?? { cash: paid };
  for (const [k, v] of Object.entries(split)) row[`paid_${k}`] = v;
  if (!opts.split) row.payment_method = 'cash';
  else {
    const biggest = Object.entries(split).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))[0];
    if (biggest) row.payment_method = biggest[0];
  }

  for (const [k, v] of Object.entries(opts.refundedSplit ?? {})) row[`refunded_${k}`] = v;

  return row;
}

/** سداد آجل مستقل (type = payment). */
export function buildDebtPayment(opts: {
  id: string;
  date: string;
  amount: number;
  customer: Persona['customer'];
  /** لو متبعت، السداد بيتوجّه لفاتورة بعينها. */
  targetInvoiceId?: string;
  split?: Partial<Record<string, number>>;
  car_id?: string;
}) {
  const row: any = {
    ...zeroSplit(),
    id: opts.id,
    date: opts.date,
    items: [],
    total: 0,
    paid_amount: opts.amount,
    type: 'payment',
    payment_method: 'cash',
    customer: opts.customer ?? undefined,
    notes: opts.targetInvoiceId ? `سداد أجل للفاتورة رقم #${opts.targetInvoiceId}` : 'سداد أجل',
    car_id: opts.car_id,
    is_deleted: false,
  };
  const split = opts.split ?? { cash: opts.amount };
  for (const [k, v] of Object.entries(split)) row[`paid_${k}`] = v;
  return row;
}

/** مصروف (أو إيراد لو المبلغ سالب). */
export function buildExpense(opts: {
  id: string;
  date: string;
  amount: number;
  category?: string;
  note?: string;
  split?: Partial<Record<string, number>>;
}) {
  const row: any = {
    ...zeroSplit(),
    id: opts.id,
    date: opts.date,
    amount: opts.amount,
    category: opts.category ?? 'مصاريف عامة',
    note: opts.note ?? '',
    payment_method: 'cash',
  };
  const split = opts.split ?? { cash: opts.amount };
  for (const [k, v] of Object.entries(split)) row[`paid_${k}`] = v;
  return row;
}

/** إجمالي كل وسائل الدفع في bucket. */
export const sumBucket = (b: Record<string, number>) =>
  ALL_PAYMENT_KEYS.reduce((s, k) => s + (b[k] || 0), 0);

/** الدين المتبقّي على فاتورة = الإجمالي − المرتجع − المدفوع − السدادات. */
export const round2 = (n: number) => Math.round(n * 100) / 100;
