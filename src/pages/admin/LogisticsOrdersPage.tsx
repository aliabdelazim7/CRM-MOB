import { useState, useEffect } from 'react';
import { PackageCheck, Plus, Search, ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { LogisticsOrder } from '../../store/useStore';

export default function LogisticsOrdersPage() {
  const { carriers, logisticsOrders, loadEnterpriseData, addLogisticsOrder, updateLogisticsOrderStatus } = useStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [trackingModal, setTrackingModal] = useState<{ url: string; tn: string } | null>(null);

  const [form, setForm] = useState<Partial<LogisticsOrder>>({
    order_id: '',
    carrier_id: '',
    tracking_number: '',
    shipping_cost: 0,
    status: 'pending',
  });

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addLogisticsOrder(form);
    if (ok) {
      setShowModal(false);
      setForm({ order_id: '', carrier_id: '', tracking_number: '', shipping_cost: 0, status: 'pending' });
    }
  };

  const openTrackingModal = (ord: LogisticsOrder) => {
    const carrier = carriers.find((c) => c.id === ord.carrier_id);
    if (!carrier || !carrier.tracking_url_template || !ord.tracking_number) {
      alert('لا توجد تفاصيل تتبع متاحة لهذه الشحنة');
      return;
    }
    const finalUrl = carrier.tracking_url_template.replace('{TN}', ord.tracking_number);
    setTrackingModal({ url: finalUrl, tn: ord.tracking_number });
  };

  const filteredOrders = logisticsOrders.filter(
    (lo) =>
      (lo.order_id && lo.order_id.toLowerCase().includes(search.toLowerCase())) ||
      (lo.tracking_number && lo.tracking_number.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <PackageCheck className="text-indigo-600 dark:text-indigo-400" size={28} />
            طلبات الشحن واللوجستيات (Logistics Orders)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            متابعة شحنات فواتير المبيعات، أرقام التتبع، وتغيير حالة الشحنة آلياً
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
        >
          <Plus size={18} />
          ربط طلب بشحنة جديدة
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث برقم الطلب أو رقم التتبع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                <th className="p-4">رقم الطلب / الفاتورة</th>
                <th className="p-4">شركة الشحن</th>
                <th className="p-4">رقم التتبع</th>
                <th className="p-4">تكلفة الشحن</th>
                <th className="p-4">الحالة</th>
                <th className="p-4">تاريخ الشحن</th>
                <th className="p-4">إجراءات والتتبع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400 font-medium">
                    لا توجد طلبات شحن مسجلة حالياً
                  </td>
                </tr>
              ) : (
                filteredOrders.map((lo) => {
                  const carrier = carriers.find((c) => c.id === lo.carrier_id);
                  return (
                    <tr key={lo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">
                        #{lo.order_id || 'عام'}
                      </td>
                      <td className="p-4">{carrier ? carrier.name : 'غير محدد'}</td>
                      <td className="p-4 font-mono">{lo.tracking_number || '-'}</td>
                      <td className="p-4 font-mono">{lo.shipping_cost || 0} ج.م</td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            lo.status === 'delivered'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                              : lo.status === 'shipped'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                              : lo.status === 'returned'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {lo.status === 'delivered'
                            ? 'تم التسليم'
                            : lo.status === 'shipped'
                            ? 'تم الشحن'
                            : lo.status === 'returned'
                            ? 'مرتجع'
                            : 'قيد التجهيز (Pending)'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {lo.shipped_at ? new Date(lo.shipped_at).toLocaleDateString('ar-EG') : '-'}
                      </td>
                      <td className="p-4 flex items-center gap-2">
                        <select
                          value={lo.status}
                          onChange={(e) => updateLogisticsOrderStatus(lo.id, e.target.value as any)}
                          className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 font-bold"
                        >
                          <option value="pending">قيد التجهيز</option>
                          <option value="shipped">تم الشحن</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="returned">مرتجع</option>
                        </select>

                        {lo.tracking_number && (
                          <button
                            onClick={() => openTrackingModal(lo)}
                            className="flex items-center gap-1 text-indigo-600 hover:underline text-xs"
                          >
                            تتبع <ExternalLink size={12} />
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

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">ربط طلب بشحنة جديدة</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رقم الفاتورة / الطلب</label>
                <input
                  type="text"
                  required
                  placeholder="INV-1001"
                  value={form.order_id}
                  onChange={(e) => setForm({ ...form, order_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">شركة الشحن</label>
                <select
                  value={form.carrier_id}
                  onChange={(e) => setForm({ ...form, carrier_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="">اختر الشركة</option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رقم التتبع (Tracking Number)</label>
                <input
                  type="text"
                  value={form.tracking_number}
                  onChange={(e) => setForm({ ...form, tracking_number: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">تكلفة الشحن (ج.م)</label>
                <input
                  type="number"
                  value={form.shipping_cost}
                  onChange={(e) => setForm({ ...form, shipping_cost: Number(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl">
                  حفظ الشحنة
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

      {/* Tracking Modal */}
      {trackingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700 text-center">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">تفاصيل تتبع الشحنة</h3>
            <p className="text-sm text-slate-500 font-mono">رقم التتبع: {trackingModal.tn}</p>

            <a
              href={trackingModal.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition"
            >
              الانتقال لرابط التتبع المباشر <ExternalLink size={16} />
            </a>

            <div>
              <button
                onClick={() => setTrackingModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold mt-2"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
