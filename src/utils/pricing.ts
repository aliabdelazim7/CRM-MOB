/**
 * السعر المطبَّق على منتج حسب نوع الفاتورة.
 *
 * القواعد:
 *   - جملة / نص جملة: السعر الخاص لو متسجّل وأكبر من صفر، وإلا سعر البيع العادي.
 *   - قطاعي: سعر الخصم لو متسجّل وأكبر من صفر، وإلا سعر البيع.
 *
 * ملحوظة: سعر الخصم القطاعي **مابيتطبّقش** على فواتير الجملة — تاجر الجملة
 * بياخد سعر الجملة أو السعر الأساسي، مش عرض القطاعي.
 */
export interface PriceableProduct {
  sale_price: number;
  discount_price?: number | null;
  wholesale_price?: number | null;
  half_wholesale_price?: number | null;
}

export function priceForType(product: PriceableProduct, type: string): number {
  if (type === 'wholesale') {
    return (product.wholesale_price && product.wholesale_price > 0) ? product.wholesale_price : product.sale_price;
  }
  if (type === 'half') {
    return (product.half_wholesale_price && product.half_wholesale_price > 0) ? product.half_wholesale_price : product.sale_price;
  }
  return (product.discount_price && product.discount_price > 0) ? product.discount_price : product.sale_price;
}
