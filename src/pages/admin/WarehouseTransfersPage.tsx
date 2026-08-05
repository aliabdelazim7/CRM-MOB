import { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, Search, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function WarehouseTransfersPage() {
  const { warehouses, products, stockTransfers, stockMovementLogs, loadEnterpriseData, createStockTransfer, approveStockTransfer, cancelStockTransfer } = useStore();
  const [activeTab, setActiveTab] = useState<'transfers' | 'logs'>('transfers');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [sourceWh, setSourceWh] = useState('');
  const [targetWh, setTargetWh] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const availableStockAtSource = selectedProduct ? selectedProduct.stock_quantity || 0 : 0;

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setStockError(null);

    if (!sourceWh || !targetWh) {
      setStockError('رجاء تحديد المخزن المصدر والمخزن المستهدف');
      return;
    }

    if (sourceWh === targetWh) {
      setStockError('لا يمكن التحويل لنفس المخزن');
      return;
    }

    // Validation ensuring stock availability
    if (quantity > availableStockAtSource) {
      setStockError(`الكمية المطلوبة (${quantity}) تتجاوز الرصيد المتاح بالمخزن المصدر (${availableStockAtSource})`);
      return;
    }

    const refNo = `TRF-${Date.now().toString().slice(-6)}`;
    const ok = await createStockTransfer(
      {
        transfer_number: refNo,
        source_warehouse_id: sourceWh,
        target_warehouse_id: targetWh,
        status: 'pending',
        notes,
      },
      [{ product_id: selectedProductId, quantity }]
    );

    if (ok) {
      setShowModal(false);
      setQuantity(1);
      setNotes('');
      setStockError(null);
    }
  };

  const filteredTransfers = stockTransfers.filter(
    (t) =>
      t.transfer_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <ArrowLeftRight className="text-indigo-600 dark:text-indigo-400" size={28} />
            حركات وتحويلات المخازن (Warehouse Transfers)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            إنشاء طلبات نقل البضائع بين المخازن مع التحقق الآلي من توفر المخزون بالمصدر
          </p>
        </div>

        <button
          onClick={() => { setStockError(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
        >
          <Plus size={18} />
          إنشاء طلب تحويل جديد
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'transfers'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            سجل التحويلات ({stockTransfers.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            سجل الحركات الشامل (Stock Logs)
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث برقم التحويل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'transfers' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4">رقم المرجع (Ref)</th>
                  <th className="p-4">من مخزن</th>
                  <th className="p-4">إلى مخزن</th>
                  <th className="p-4">الأصناف والكمية</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
                {filteredTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400 font-medium">
                      لا توجد طلبات تحويل مسجلة
                    </td>
                  </tr>
                ) : (
                  filteredTransfers.map((t) => {
                    const src = warehouses.find((w) => w.id === t.source_warehouse_id);
                    const tgt = warehouses.find((w) => w.id === t.target_warehouse_id);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">{t.transfer_number}</td>
                        <td className="p-4">{src ? src.name : 'المخزن الرئيسي'}</td>
                        <td className="p-4">{tgt ? tgt.name : 'مخزن الفرع'}</td>
                        <td className="p-4 font-mono">{t.items ? `${t.items.length} صنف` : 'صنف واحد'}</td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black ${
                              t.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : t.status === 'pending'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {t.status === 'completed' ? 'مكتمل (Completed)' : t.status === 'pending' ? 'قيد المراجعة' : 'ملغى'}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-slate-400">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="p-4">
                          {t.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => approveStockTransfer(t.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg transition"
                              >
                                تأكيد الاستلام
                              </button>
                              <button
                                onClick={() => cancelStockTransfer(t.id)}
                                className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs px-3 py-1.5 rounded-lg transition"
                              >
                                إلغاء
                              </button>
                            </div>
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
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-400">
            جدول `stock_movement_logs` المحدث آلياً (IN / OUT / TRANSFER / ADJUSTMENT)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4">المنتج</th>
                  <th className="p-4">نوع الحركة</th>
                  <th className="p-4">الكمية</th>
                  <th className="p-4">رقم المرجع</th>
                  <th className="p-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
                {stockMovementLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-slate-400 font-medium">
                      لا توجد حركات مخزون مسجلة
                    </td>
                  </tr>
                ) : (
                  stockMovementLogs.map((log) => {
                    const prod = products.find((p) => p.id === log.product_id);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-4">{prod ? prod.name : 'منتج'}</td>
                        <td className="p-4 font-mono text-xs">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-black ${
                              log.quantity > 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                            }`}
                          >
                            {log.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 font-mono">{log.quantity > 0 ? `+${log.quantity}` : log.quantity}</td>
                        <td className="p-4 font-mono text-xs text-slate-400">{log.reference_id || '-'}</td>
                        <td className="p-4 text-xs text-slate-400">
                          {log.created_at ? new Date(log.created_at).toLocaleString('ar-EG') : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">إنشاء تحويل بين المخازن</h3>

            {stockError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {stockError}
              </div>
            )}

            <form onSubmit={handleCreateTransfer} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">المخزن المصدر *</label>
                  <select
                    value={sourceWh}
                    onChange={(e) => setSourceWh(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  >
                    <option value="">اختر المصدر</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">المخزن المستهدف *</label>
                  <select
                    value={targetWh}
                    onChange={(e) => setTargetWh(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  >
                    <option value="">اختر المستهدف</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المنتج المراد تحويله</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (المتوفر بالسيستم: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الكمية المطلوبة</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl">
                  تأكيد وتحويل
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
