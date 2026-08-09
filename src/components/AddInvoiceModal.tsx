import { useState, useMemo, useEffect } from 'react';
import { useStore, type Product, type Customer, type Order } from '../store/useStore';
import { printShippingLabel, type ShippingLabelHeld } from '../utils/printShippingLabel';
import { X, Search, Plus, Trash2, Printer, CheckCircle2, Truck, User, Hash, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AddInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddInvoiceModal({ isOpen, onClose, onSuccess }: AddInvoiceModalProps) {
  const { products, customers, carriers, storeSettings, activeCashier, orders, loadHeldInvoices } = useStore();

  // State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('Bosta - بوسطة');
  const [customCarrierName, setCustomCarrierName] = useState<string>('');
  const [customInvoiceId, setCustomInvoiceId] = useState<string>('');
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<number>(50);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [salespersonName, setSalespersonName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Cart & Product Search
  const [productSearch, setProductSearch] = useState<string>('');
  const [cart, setCart] = useState<{ product: Product; quantity: number; sale_price: number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-generate next invoice ID
  const nextInvoiceId = useMemo(() => {
    const existingIds = orders.map(o => parseInt(String(o.id).replace(/\D/g, ''))).filter(n => !isNaN(n));
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 1000;
    return String(maxId + 1);
  }, [orders]);

  useEffect(() => {
    if (isOpen) {
      const generated = nextInvoiceId;
      setCustomInvoiceId(generated);
      setTrackingNumber(generated); // "الفاتورة تتربط تلقائي بمنصات الشحن و برقم الفاتورة"
    }
  }, [isOpen, nextInvoiceId]);

  const handleInvoiceIdChange = (val: string) => {
    setCustomInvoiceId(val);
    setTrackingNumber(val);
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase().trim();
    return products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      (p.barcode && p.barcode.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [products, productSearch]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
  }, [cart]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount + (Number(shippingCost) || 0));
  }, [subtotal, discount, shippingCost]);

  useEffect(() => {
    setPaidAmount(total);
  }, [total]);

  if (!isOpen) return null;

  const handleAddProduct = (prod: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === prod.id);
      if (existing) {
        return prev.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product: prod, quantity: 1, sale_price: prod.sale_price }];
    });
    setProductSearch('');
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleRemoveProduct = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = async (shouldPrint: boolean = false) => {
    if (cart.length === 0) {
      alert('الرجاء إضافة منتج واحد على الأقل الفاتورة');
      return;
    }

    setIsSaving(true);
    try {
      const finalInvoiceId = customInvoiceId.trim() || nextInvoiceId;
      const carrierName = selectedCarrier === 'custom' ? (customCarrierName.trim() || 'شحن خاص') : selectedCarrier;
      const finalTrackingNumber = trackingNumber.trim() || finalInvoiceId;

      // 1. Create or Find Customer
      let customerObj: Customer | undefined = undefined;
      if (customerName.trim()) {
        const existingCust = customers.find(c => c.phone && customerPhone && c.phone.trim() === customerPhone.trim());
        if (existingCust) {
          customerObj = existingCust;
        } else {
          const { data: newCustData } = await supabase.from('customers').insert({
            name: customerName.trim(),
            phone: customerPhone.trim() || null
          }).select().single();
          if (newCustData) {
            customerObj = newCustData as Customer;
          }
        }
      }

      // 2. Prepare Order Items
      const orderItems = cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        sale_price: item.sale_price,
        purchase_price: item.product.purchase_price || 0,
        unit: item.product.unit || 'قطعة'
      }));

      // 3. Insert Order into Supabase
      const orderRow = {
        id: finalInvoiceId,
        total: total,
        paid_amount: Number(paidAmount) || 0,
        paid_cash: paymentMethod === 'cash' ? paidAmount : 0,
        paid_visa: paymentMethod === 'visa' ? paidAmount : 0,
        paid_wallet: paymentMethod === 'wallet' ? paidAmount : 0,
        paid_instapay: paymentMethod === 'instapay' ? paidAmount : 0,
        type: 'sale',
        customer_id: customerObj?.id || null,
        payment_method: paymentMethod,
        cashier_name: activeCashier?.name || 'مدير النظام',
        salesperson_name: salespersonName || null,
        discount_amount: Number(discount) || 0,
        shipping_cost: Number(shippingCost) || 0,
        shipping_carrier: carrierName,
        notes: notes ? `${notes} | شركة الشحن: ${carrierName} (بوليصة #${finalTrackingNumber})` : `شركة الشحن: ${carrierName} (بوليصة #${finalTrackingNumber})`,
        created_at: new Date().toISOString()
      };

      const { error: orderErr } = await supabase.from('orders').insert(orderRow);
      if (orderErr && (orderErr as any).code !== '23505') {
        console.error('Failed to insert order:', orderErr);
      }

      // 4. Insert Order Items & Update Stock
      for (const item of cart) {
        await supabase.from('order_items').insert({
          order_id: finalInvoiceId,
          product_id: item.product.id,
          quantity: item.quantity,
          sale_price: item.sale_price,
          unit: item.product.unit || 'قطعة'
        });

        const newStock = Math.max(0, item.product.stock_quantity - item.quantity);
        await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product.id);
      }

      // 5. Auto-Link to Logistics / Platform Shipping ("الفاتورة تتربط تلقائي بمنصات الشحن و برقم الفاتورة")
      try {
        await supabase.from('logistics_orders').insert({
          order_id: finalInvoiceId,
          carrier_id: null,
          tracking_number: finalTrackingNumber,
          shipping_cost: Number(shippingCost) || 0,
          status: 'shipped',
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('logistics_orders insert notice:', e);
      }

      // Also create Held/Online Invoice record for logistics tab
      try {
        await supabase.from('held_invoices').insert({
          id: `ONLINE-${finalInvoiceId}`,
          customer_name: customerName.trim() || 'عميل شحن',
          customer_phone: customerPhone.trim() || null,
          customer_address: customerAddress.trim() || null,
          items: orderItems,
          total: total,
          invoice_type: 'retail',
          cashier_name: activeCashier?.name || 'مدير النظام',
          status: 'shipped',
          kind: 'online',
          shipping_note: carrierName,
          deposit: Number(paidAmount) || 0,
          shipping_cost: Number(shippingCost) || 0
        });
      } catch (e) {
        console.warn('held_invoices notice:', e);
      }

      // Update local store state
      const createdOrderObj: Order = {
        id: finalInvoiceId,
        total: total,
        paid_amount: Number(paidAmount) || 0,
        type: 'sale',
        customer: customerObj,
        cashier_name: activeCashier?.name || 'مدير النظام',
        date: new Date().toISOString(),
        items: orderItems,
        shipping_cost: Number(shippingCost) || 0,
        shipping_carrier: carrierName,
        notes: orderRow.notes
      } as any;

      useStore.setState(state => ({
        orders: [createdOrderObj, ...state.orders]
      }));

      await loadHeldInvoices();

      // Print if requested
      if (shouldPrint) {
        const heldData: ShippingLabelHeld = {
          id: finalInvoiceId,
          customer_name: customerName || 'عميل',
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          items: orderItems,
          total: total,
          deposit: paidAmount,
          shipping_cost: Number(shippingCost) || 0,
          created_at: new Date().toISOString(),
          cashier_name: activeCashier?.name || 'مدير النظام'
        };
        void printShippingLabel(heldData, storeSettings);
      }

      alert(`تم إضافة الفاتورة #${finalInvoiceId} وربطها تلقائياً بـ (${carrierName}) برقم الفاتورة بنجاح!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الفاتورة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black">إضافة فاتورة مستقلة جديدة</h2>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">إنشاء فاتورة مستقلة وربطها تلقائياً بمنصات الشحن برقم الفاتورة</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Section 1: Invoice & Shipping Platform Linking */}
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-4">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-black text-sm">
              <Truck size={18} />
              <span>ربط الفاتورة بمنصات الشحن ورقم البوليصة تلقائياً</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Hash size={14} /> رقم الفاتورة
                </label>
                <input
                  type="text"
                  value={customInvoiceId}
                  onChange={(e) => handleInvoiceIdChange(e.target.value)}
                  placeholder="مثال: 1042"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-black text-sm text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <Truck size={14} /> منصة / شركة الشحن
                </label>
                <select
                  value={selectedCarrier}
                  onChange={(e) => setSelectedCarrier(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Bosta - بوسطة">Bosta - بوسطة</option>
                  <option value="Aramex - أرامكس">Aramex - أرامكس</option>
                  <option value="SMSA - سمسا">SMSA - سمسا Express</option>
                  <option value="FedEx - فيديكس">FedEx - فيديكس</option>
                  <option value="Jumia Express - جوميا">Jumia Express - جوميا</option>
                  <option value="Noon Logistics - نون">Noon Logistics - نون</option>
                  <option value="Amazon Shipping - أمازون">Amazon Shipping - أمازون</option>
                  <option value="Mylerz - مايلرز">Mylerz - مايلرز</option>
                  <option value="Speedaf - سبيداف">Speedaf - سبيداف</option>
                  {carriers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="custom">شركة شحن أخرى / شحن خاص</option>
                </select>
                {selectedCarrier === 'custom' && (
                  <input
                    type="text"
                    value={customCarrierName}
                    onChange={(e) => setCustomCarrierName(e.target.value)}
                    placeholder="اكتب اسم شركة الشحن"
                    className="w-full mt-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 size={14} className="text-emerald-500" /> رقم البوليصة التلقائي
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="رقم البوليصة"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-sm"
                />
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">✓ يتم الربط التلقائي بنفس رقم الفاتورة</span>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-black flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <User size={16} /> بيانات العميل والشحن
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم العميل</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="اسم العميل"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">العنوان والمحافظة</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="مثال: القاهرة - مدينة نصر"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Add Products */}
          <div className="space-y-3">
            <h3 className="text-sm font-black flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <Package size={16} /> اختيار منتجات الفاتورة
            </h3>

            <div className="relative">
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="ابحث عن منتج باسمه أو بالباركود لإضافته للفاتورة..."
                  className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold"
                />
              </div>

              {filteredProducts.length > 0 && (
                <div className="absolute z-20 top-full right-0 left-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden max-h-60 overflow-y-auto">
                  {filteredProducts.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod)}
                      className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition border-b border-slate-100 dark:border-slate-800 last:border-0 text-right"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{prod.name}</div>
                        <div className="text-xs text-slate-400">الكمية المتاحة: {prod.stock_quantity}</div>
                      </div>
                      <div className="text-sm font-black text-indigo-600 dark:text-indigo-400">{prod.sale_price} EGP</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-100 dark:bg-slate-900/60 font-black text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">المنتج</th>
                    <th className="p-3 text-center">السعر</th>
                    <th className="p-3 text-center">الكمية</th>
                    <th className="p-3 text-center">الإجمالي</th>
                    <th className="p-3 text-center">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400 font-bold">
                        لم يتم إضافة أي منتجات بعد. استخدم مربع البحث بالأعلى لإضافة منتجات.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-bold">{item.product.name}</td>
                        <td className="p-3 text-center font-bold">{item.sale_price} EGP</td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-xl">
                            <button onClick={() => handleUpdateQty(index, -1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg"><Trash2 size={12} /></button>
                            <span className="font-black px-2">{item.quantity}</span>
                            <button onClick={() => handleUpdateQty(index, 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg"><Plus size={12} /></button>
                          </div>
                        </td>
                        <td className="p-3 text-center font-black text-indigo-600 dark:text-indigo-400">
                          {(item.sale_price * item.quantity).toFixed(2)} EGP
                        </td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleRemoveProduct(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Totals & Payments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">مصاريف الشحن</label>
                <input
                  type="number"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الخصم على الفاتورة</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">طريقة الدفع</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                >
                  <option value="cash">نقداً (كاش)</option>
                  <option value="visa">فيزا (بطاقة)</option>
                  <option value="wallet">محفظة إلكترونية</option>
                  <option value="instapay">انستاباي InstaPay</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">مسؤول المبيعات</label>
                <input
                  type="text"
                  value={salespersonName}
                  onChange={(e) => setSalespersonName(e.target.value)}
                  placeholder="اسم مسؤول المبيعات (اختياري)"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات الفاتورة</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="ملاحظات إضافية"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-2 border-r border-slate-200 dark:border-slate-700 pr-4 flex flex-col justify-between">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-bold text-slate-500">
                  <span>المجموع الفرعي:</span>
                  <span>{subtotal.toFixed(2)} EGP</span>
                </div>
                <div className="flex justify-between font-bold text-slate-500">
                  <span>مصاريف الشحن:</span>
                  <span>+{shippingCost.toFixed(2)} EGP</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between font-bold text-red-500">
                    <span>الخصم:</span>
                    <span>-{discount.toFixed(2)} EGP</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-lg text-slate-800 dark:text-slate-100 border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span>الإجمالي النهائي:</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{total.toFixed(2)} EGP</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المحصل فعلياً</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl text-sm font-black text-emerald-700 dark:text-emerald-300"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm"
          >
            إلغاء
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSaving || cart.length === 0}
              onClick={() => handleSaveInvoice(true)}
              className="flex items-center gap-2 bg-slate-800 dark:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-slate-900 transition text-sm disabled:opacity-50"
            >
              <Printer size={16} />
              <span>حفظ وطباعة البوليصة</span>
            </button>

            <button
              type="button"
              disabled={isSaving || cart.length === 0}
              onClick={() => handleSaveInvoice(false)}
              style={{ backgroundColor: storeSettings.themeColor }}
              className="flex items-center gap-2 text-white px-6 py-2.5 rounded-xl font-black transition shadow-lg hover:opacity-90 text-sm disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              <span>{isSaving ? 'جارٍ الحفظ والربط...' : 'حفظ الفاتورة والربط بالشحن'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
