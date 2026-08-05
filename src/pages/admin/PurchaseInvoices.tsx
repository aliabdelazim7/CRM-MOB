import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AdvPurchaseInvoiceItem } from '../../store/useStore';

export default function PurchaseInvoices() {
  const { suppliers, warehouses, products, advPurchaseInvoices, loadEnterpriseData, addAdvPurchaseInvoice, approveAdvPurchaseInvoice } = useStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [invSupplierId, setInvSupplierId] = useState('');
  const [invWarehouseId, setInvWarehouseId] = useState('');
  const [freightCost, setFreightCost] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes] = useState('');

  const [items, setItems] = useState<{ product_id: string; quantity: number; unit_cost: number }[]>([]);

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  const handleAddItem = () => {
    if (products.length > 0) {
      setItems([...items, { product_id: products[0].id, quantity: 1, unit_cost: products[0].purchase_price || 0 }]);
    }
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
  const totalAmount = subtotal - discount + taxAmount + freightCost;

  // Landed Cost allocation per unit
  const landedItems: AdvPurchaseInvoiceItem[] = items.map((item) => {
    const itemTotal = item.quantity * item.unit_cost;
    const shareOfFreight = subtotal > 0 ? (itemTotal / subtotal) * freightCost : 0;
    const landedUnitCost = item.quantity > 0 ? (itemTotal + shareOfFreight) / item.quantity : item.unit_cost;
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      landed_unit_cost: Math.round(landedUnitCost * 100) / 100,
      total_cost: itemTotal,
    };
  });

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('رجاء إضافة أصناف للفاتورة');
      return;
    }
    const invNo = `PINV-${Date.now().toString().slice(-6)}`;
    const ok = await addAdvPurchaseInvoice(
      {
        invoice_number: invNo,
        supplier_id: invSupplierId || undefined,
        warehouse_id: invWarehouseId || undefined,
        invoice_date: new Date().toISOString().split('T')[0],
        status: 'draft',
        subtotal,
        discount,
        tax_amount: taxAmount,
        freight_cost: freightCost,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        notes,
      },
      landedItems
    );
    if (ok) {
      setShowModal(false);
      setItems([]);
      setFreightCost(0);
      setTaxAmount(0);
      setDiscount(0);
      setPaidAmount(0);
    }
  };

  const filteredInvoices = advPurchaseInvoices.filter(
    (i) =>
      i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (i.notes && i.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <ShoppingCart className="text-indigo-600 dark:text-indigo-400" size={28} />
            فواتير المشتريات التكليفية (Landed Cost)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            تسجيل فواتير الشراء، التكلفة الفعلية للمنتج (الشحن + الضرائب)، وتحديث متوسط سعر الشراء تلقائياً
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
        >
          <Plus size={18} />
          فاتورة شراء جديدة
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث برقم الفاتورة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                <th className="p-4">رقم الفاتورة</th>
                <th className="p-4">المورد</th>
                <th className="p-4">المجموع التكليفي</th>
                <th className="p-4">مصاريف الشحن</th>
                <th className="p-4">الإجمالي الكلي</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">التاريخ</th>
                <th className="p-4">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-slate-400 font-medium">
                    لا توجد فواتير مشتريات مسجلة
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const supplier = suppliers.find((s) => s.id === inv.supplier_id);
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">{inv.invoice_number}</td>
                      <td className="p-4">{supplier ? supplier.name : 'مورد غير محدد'}</td>
                      <td className="p-4 font-mono">{inv.subtotal.toLocaleString()} ج.م</td>
                      <td className="p-4 font-mono text-amber-600 dark:text-amber-400">+{inv.freight_cost || 0} ج.م</td>
                      <td className="p-4 font-mono text-slate-900 dark:text-white font-black">
                        {inv.total_amount.toLocaleString()} ج.م
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            inv.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                          }`}
                        >
                          {inv.status === 'approved' ? 'معتمدة ومضافة للمخزون' : 'مسودة'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">{inv.invoice_date || '-'}</td>
                      <td className="p-4">
                        {inv.status === 'draft' && (
                          <button
                            onClick={() => approveAdvPurchaseInvoice(inv.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                          >
                            اعتماد وتحديث المخزون
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Invoice */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">فاتورة شراء تكليفية جديدة</h3>
            <form onSubmit={handleSaveInvoice} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المورد</label>
                  <select
                    value={invSupplierId}
                    onChange={(e) => setInvSupplierId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  >
                    <option value="">اختر المورد</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المخزن المستقبل</label>
                  <select
                    value={invWarehouseId}
                    onChange={(e) => setInvWarehouseId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  >
                    <option value="">اختر المخزن</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400">بنود الفاتورة والتكلفة الأسرية</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + إضافة صنف
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  {items.map((item, idx) => {
                    const landed = landedItems[idx];
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={item.product_id}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx].product_id = e.target.value;
                            const pr = products.find((p) => p.id === e.target.value);
                            if (pr) next[idx].unit_cost = pr.purchase_price || 0;
                            setItems(next);
                          }}
                          className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          placeholder="الكمية"
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx].quantity = Number(e.target.value);
                            setItems(next);
                          }}
                          className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-center"
                        />
                        <input
                          type="number"
                          min="0"
                          placeholder="السعر الخام"
                          value={item.unit_cost}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx].unit_cost = Number(e.target.value);
                            setItems(next);
                          }}
                          className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-center"
                        />
                        <div className="w-28 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {landed ? `${landed.landed_unit_cost} ج.م` : '-'}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Extra Costs breakdown */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">مصاريف الشحن واللوجستيات</label>
                  <input
                    type="number"
                    value={freightCost}
                    onChange={(e) => setFreightCost(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">الضرائب</label>
                  <input
                    type="number"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">الخصم المكتسب</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                  />
                </div>
              </div>

              {/* Total Card */}
              <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">الإجمالي النهائي للفاتورة:</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{totalAmount.toLocaleString()} ج.م</span>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl">
                  حفظ الفاتورة
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
