import { useState, useEffect } from 'react';
import { Truck, Plus, Search, ExternalLink, Trash2, Edit } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ShippingCarrier } from '../../store/useStore';

export default function CarriersPage() {
  const { carriers, loadEnterpriseData, addShippingCarrier, updateShippingCarrier, deleteShippingCarrier } = useStore();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<ShippingCarrier>>({
    name: '',
    phone: '',
    email: '',
    address: '',
    tracking_url_template: '',
    status: 'active',
  });

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', phone: '', email: '', address: '', tracking_url_template: '', status: 'active' });
    setShowModal(true);
  };

  const openEdit = (carrier: ShippingCarrier) => {
    setEditingId(carrier.id);
    setForm(carrier);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editingId) {
      await updateShippingCarrier(editingId, form);
    } else {
      await addShippingCarrier(form);
    }
    setShowModal(false);
  };

  const filteredCarriers = carriers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Truck className="text-indigo-600 dark:text-indigo-400" size={28} />
            شركات الشحن واللوجستيات (Shipping Carriers)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            إدارة المزودين الافتراضيين والمحليين للشحن (SMSA, FedEx, Aramex, DHL) وقوالب تتبع الشحنات
          </p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
        >
          <Plus size={18} />
          إضافة شركة شحن جديدة
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث باسم الشركة أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Carriers Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredCarriers.length === 0 ? (
          <div className="col-span-full text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 text-slate-400">
            لا توجد شركات شحن مضافة
          </div>
        ) : (
          filteredCarriers.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">{c.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      c.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {c.status === 'active' ? 'نشطة' : 'متوقفة'}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <div>الهاتف: <span className="font-bold text-slate-700 dark:text-slate-200">{c.phone || '-'}</span></div>
                  <div>البريد: <span className="font-bold text-slate-700 dark:text-slate-200">{c.email || '-'}</span></div>
                  <div>العنوان: <span className="font-bold text-slate-700 dark:text-slate-200">{c.address || 'المقر الرئيسي'}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(c)} className="text-indigo-600 hover:text-indigo-800 p-1">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => deleteShippingCarrier(c.id)} className="text-rose-500 hover:text-rose-700 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>

                {c.tracking_url_template && (
                  <a
                    href={c.tracking_url_template.replace('{TN}', 'SAMPLE')}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:underline font-bold"
                  >
                    رابط التتبع <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              {editingId ? 'تعديل بيانات الشركة' : 'إضافة شركة شحن جديد'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">اسم شركة الشحن *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">الهاتف</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">قالب رابط التتبع (مثل: https://track.com/{'{TN}'})</label>
                <input
                  type="text"
                  value={form.tracking_url_template}
                  onChange={(e) => setForm({ ...form, tracking_url_template: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="active">نشطة</option>
                  <option value="inactive">متوقفة</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl">
                  حفظ البيانات
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
