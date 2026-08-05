import { useState, useEffect } from 'react';
import { Building2, Plus, ArrowLeftRight, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Warehouse } from '../../store/useStore';

export default function Warehouses() {
  const { warehouses, products, stockTransfers, stockMovementLogs, loadEnterpriseData, addWarehouse, createStockTransfer, approveStockTransfer, cancelStockTransfer } = useStore();
  const [activeTab, setActiveTab] = useState<'transfers' | 'warehouses' | 'logs'>('transfers');
  const [search, setSearch] = useState('');

  // Modal Warehouse
  const [showWhModal, setShowWhModal] = useState(false);
  const [whForm, setWhForm] = useState<Partial<Warehouse>>({ name: '', code: '', location: '', manager_name: '', phone: '' });

  // Modal Transfer
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    source_warehouse_id: '',
    target_warehouse_id: '',
    notes: '',
  });
  const [transferItems, setTransferItems] = useState<{ product_id: string; quantity: number }[]>([]);

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  const handleSaveWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whForm.name || !whForm.code) return;
    const ok = await addWarehouse(whForm);
    if (ok) {
      setShowWhModal(false);
      setWhForm({ name: '', code: '', location: '', manager_name: '', phone: '' });
    }
  };

  const handleAddItemToTransfer = () => {
    if (products.length > 0) {
      setTransferItems([...transferItems, { product_id: products[0].id, quantity: 1 }]);
    }
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.source_warehouse_id || !transferForm.target_warehouse_id || transferItems.length === 0) {
      alert('رجاء اختيار المخزن المصدر والمستهدف وإضافة صنف واحد على الأقل');
      return;
    }
    const transferNo = `TR-${Date.now().toString().slice(-6)}`;
    const ok = await createStockTransfer(
      {
        transfer_number: transferNo,
        source_warehouse_id: transferForm.source_warehouse_id,
        target_warehouse_id: transferForm.target_warehouse_id,
        status: 'pending',
        notes: transferForm.notes,
      },
      transferItems
    );
    if (ok) {
      setShowTransferModal(false);
      setTransferForm({ source_warehouse_id: '', target_warehouse_id: '', notes: '' });
      setTransferItems([]);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Building2 className="text-indigo-600 dark:text-indigo-400" size={28} />
            الفروع والمخازن والتحويلات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            إدارة المخازن المتعددة، طلبات النقل والتحويل بين الفروع، وسجل حركة المنتجات الشامل
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWhModal(true)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl font-bold transition text-sm"
          >
            <Plus size={16} />
            مخزن جديد
          </button>

          <button
            onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
          >
            <ArrowLeftRight size={18} />
            طلب تحويل مخزني
          </button>
        </div>
      </div>

      {/* Tabs */}
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
            طلبات التحويل ({stockTransfers.length})
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'warehouses'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            المخازن والفروع ({warehouses.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'logs'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            سجل حركة المخزون
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tab: Transfers */}
      {activeTab === 'transfers' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">من مخزن</th>
                  <th className="p-4">إلى مخزن</th>
                  <th className="p-4">عدد المواد</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
                {stockTransfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400">
                      لا توجد طلبات تحويل مسجلة حالياً
                    </td>
                  </tr>
                ) : (
                  stockTransfers.map((t) => {
                    const src = warehouses.find((w) => w.id === t.source_warehouse_id);
                    const tgt = warehouses.find((w) => w.id === t.target_warehouse_id);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">{t.transfer_number}</td>
                        <td className="p-4">{src ? src.name : 'المخزن الرئيسي'}</td>
                        <td className="p-4">{tgt ? tgt.name : 'مخزن الفرع'}</td>
                        <td className="p-4">{t.items ? t.items.length : 0} صنف</td>
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
                            {t.status === 'completed' ? 'تم الاعتماد' : t.status === 'pending' ? 'قيد المراجعة' : 'ملغى'}
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
      )}

      {/* Tab: Warehouses */}
      {activeTab === 'warehouses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.length === 0 ? (
            <div className="col-span-full text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 text-slate-400">
              لا توجد مخازن مضافة بعد. اضغط "مخزن جديد" للبدء.
            </div>
          ) : (
            warehouses.map((w) => (
              <div
                key={w.id}
                className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">{w.name}</h3>
                  <span className="font-mono text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg">
                    #{w.code}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <div>الموقع: <span className="font-bold text-slate-700 dark:text-slate-200">{w.location || 'الفرع الرئيسي'}</span></div>
                  <div>أمين المخزن: <span className="font-bold text-slate-700 dark:text-slate-200">{w.manager_name || 'غير محدد'}</span></div>
                  <div>الهاتف: <span className="font-bold text-slate-700 dark:text-slate-200">{w.phone || '-'}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-400">
            أحدث حركات المخزون المسجلة آلياً بالسيستم
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4">المنتج</th>
                  <th className="p-4">نوع الحركة</th>
                  <th className="p-4">الكمية</th>
                  <th className="p-4">المرجع</th>
                  <th className="p-4">ملاحظات</th>
                  <th className="p-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
                {stockMovementLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">
                      لا توجد حركات مخزون سابقة
                    </td>
                  </tr>
                ) : (
                  stockMovementLogs.map((log) => {
                    const prod = products.find((p) => p.id === log.product_id);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-4">{prod ? prod.name : 'منتج محذوف'}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                              log.quantity > 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                            }`}
                          >
                            {log.type === 'in' ? 'وارد (إضافة)' : log.type === 'out' ? 'منصرف (بيع)' : 'تحويل مخزني'}
                          </span>
                        </td>
                        <td className="p-4 font-mono">{log.quantity > 0 ? `+${log.quantity}` : log.quantity}</td>
                        <td className="p-4 font-mono text-xs text-slate-400">{log.reference_id || '-'}</td>
                        <td className="p-4 text-xs">{log.notes || '-'}</td>
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

      {/* Modal Add Warehouse */}
      {showWhModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">إضافة مخزن / فرع جديد</h3>
            <form onSubmit={handleSaveWarehouse} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم المخزن *</label>
                <input
                  type="text"
                  required
                  value={whForm.name}
                  onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">كود المخزن *</label>
                <input
                  type="text"
                  required
                  placeholder="WH-01"
                  value={whForm.code}
                  onChange={(e) => setWhForm({ ...whForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">أمين المخزن</label>
                <input
                  type="text"
                  value={whForm.manager_name}
                  onChange={(e) => setWhForm({ ...whForm, manager_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl">
                  حفظ المخزن
                </button>
                <button
                  type="button"
                  onClick={() => setShowWhModal(false)}
                  className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">إنشاء طلب تحويل مخزني</h3>
            <form onSubmit={handleSaveTransfer} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">من مخزن (المصدر)</label>
                  <select
                    value={transferForm.source_warehouse_id}
                    onChange={(e) => setTransferForm({ ...transferForm, source_warehouse_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  >
                    <option value="">اختر المخزن</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">إلى مخزن (المستهدف)</label>
                  <select
                    value={transferForm.target_warehouse_id}
                    onChange={(e) => setTransferForm({ ...transferForm, target_warehouse_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  >
                    <option value="">اختر المخزن</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-500">الأصناف المراد تحويلها</label>
                  <button
                    type="button"
                    onClick={handleAddItemToTransfer}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    + إضافة صنف
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  {transferItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const next = [...transferItems];
                          next[idx].product_id = e.target.value;
                          setTransferItems(next);
                        }}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (المتوفر: {p.stock_quantity})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const next = [...transferItems];
                          next[idx].quantity = Number(e.target.value);
                          setTransferItems(next);
                        }}
                        className="w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl">
                  تأكيد وإرسال الطلب
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
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
