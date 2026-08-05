import { useState, useEffect } from 'react';
import { Truck, Plus, Search, ExternalLink, PackageCheck, CheckCircle2, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { ShippingCarrier, Shipment } from '../../store/useStore';

export default function Logistics() {
  const { carriers, shipments, loadEnterpriseData, addShippingCarrier, deleteShippingCarrier, addShipment, updateShipmentStatus } = useStore();
  const [activeTab, setActiveTab] = useState<'carriers' | 'shipments'>('shipments');
  const [search, setSearch] = useState('');
  
  // Carrier Form Modal State
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [carrierForm, setCarrierForm] = useState<Partial<ShippingCarrier>>({
    name: '', contact_person: '', phone: '', email: '', rate_per_kg: 0, base_fee: 0, tracking_url_template: '', notes: '', status: 'active'
  });
  
  // Shipment Form Modal State
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentForm, setShipmentForm] = useState<Partial<Shipment>>({
    carrier_id: '', invoice_id: '', tracking_number: '', status: 'pending', shipping_cost: 0, delivery_fee: 0, recipient_name: '', recipient_phone: '', recipient_address: '', notes: ''
  });

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  const handleSaveCarrier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!carrierForm.name) return;
    const ok = await addShippingCarrier(carrierForm);
    if (ok) {
      setShowCarrierModal(false);
      setCarrierForm({ name: '', contact_person: '', phone: '', email: '', rate_per_kg: 0, base_fee: 0, tracking_url_template: '', notes: '', status: 'active' });
    }
  };

  const handleSaveShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await addShipment(shipmentForm);
    if (ok) {
      setShowShipmentModal(false);
      setShipmentForm({ carrier_id: '', invoice_id: '', tracking_number: '', status: 'pending', shipping_cost: 0, delivery_fee: 0, recipient_name: '', recipient_phone: '', recipient_address: '', notes: '' });
    }
  };

  const filteredCarriers = carriers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search))
  );

  const filteredShipments = shipments.filter((s) =>
    (s.tracking_number && s.tracking_number.toLowerCase().includes(search.toLowerCase())) ||
    (s.recipient_name && s.recipient_name.toLowerCase().includes(search.toLowerCase())) ||
    (s.invoice_id && s.invoice_id.includes(search))
  );

  // Statistics
  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter((s) => s.status === 'in_transit').length;
  const deliveredCount = shipments.filter((s) => s.status === 'delivered').length;
  const totalShippingCosts = shipments.reduce((sum, s) => sum + (s.shipping_cost || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Truck className="text-indigo-600 dark:text-indigo-400" size={28} />
            إدارة الشحن واللوجستيات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            متابعة شركات الشحن، تفاصيل الطرود، تتبع الشحنات والتكاليف اللوجستية
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'shipments' ? (
            <button
              onClick={() => setShowShipmentModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <Plus size={18} />
              إضافة شحنة جديدة
            </button>
          ) : (
            <button
              onClick={() => setShowCarrierModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none"
            >
              <Plus size={18} />
              إضافة شركة شحن
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <Truck size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">إجمالي الشحنات</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{totalShipments}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">قيد التوصيل (In Transit)</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{inTransitCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">تم التسليم (Delivered)</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{deliveredCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <PackageCheck size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">تكاليف الشحن</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{totalShippingCosts.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('shipments')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'shipments'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            سجل الشحنات
          </button>
          <button
            onClick={() => setActiveTab('carriers')}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === 'carriers'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            شركات الشحن ({carriers.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث برقم التتبع أو الاسم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'shipments' ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                  <th className="p-4">رقم التتبع</th>
                  <th className="p-4">الفاتورة والمرسل إليه</th>
                  <th className="p-4">شركة الشحن</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">تكلفة الشحن</th>
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-8 text-slate-400 font-medium">
                      لا توجد شحنات مسجلة حالياً
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((s) => {
                    const carrier = carriers.find((c) => c.id === s.carrier_id);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">
                          {s.tracking_number || '#N/A'}
                        </td>
                        <td className="p-4">
                          <div>{s.recipient_name || 'عميل افتراضي'}</div>
                          <div className="text-xs text-slate-400 font-mono">فاتورة #{s.invoice_id || 'عامة'}</div>
                        </td>
                        <td className="p-4">{carrier ? carrier.name : 'غير محدد'}</td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-black ${
                              s.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : s.status === 'in_transit'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                                : s.status === 'failed'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {s.status === 'delivered'
                              ? 'تم التسليم'
                              : s.status === 'in_transit'
                              ? 'قيد التوصيل'
                              : s.status === 'failed'
                              ? 'تعذّر التسليم'
                              : 'معلقة'}
                          </span>
                        </td>
                        <td className="p-4">{s.shipping_cost} ج.م</td>
                        <td className="p-4 text-xs text-slate-400">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '-'}
                        </td>
                        <td className="p-4">
                          <select
                            value={s.status}
                            onChange={(e) => updateShipmentStatus(s.id, e.target.value as any)}
                            className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 font-bold"
                          >
                            <option value="pending">معلقة</option>
                            <option value="in_transit">قيد التوصيل</option>
                            <option value="delivered">تم التسليم</option>
                            <option value="failed">تعذّر التسليم</option>
                            <option value="returned">مرتجع</option>
                          </select>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCarriers.length === 0 ? (
            <div className="col-span-full text-center p-12 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 text-slate-400">
              لا توجد شركات شحن مضافة. اضغط "إضافة شركة شحن" للبدء.
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
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div>مسؤول التواصل: <span className="font-bold text-slate-700 dark:text-slate-200">{c.contact_person || 'غير محدد'}</span></div>
                    <div>الهاتف: <span className="font-bold text-slate-700 dark:text-slate-200">{c.phone || '-'}</span></div>
                    <div>السعر لكل كجم: <span className="font-bold text-indigo-600 dark:text-indigo-400">{c.rate_per_kg || 0} ج.م</span></div>
                    <div>الرسوم الأساسية: <span className="font-bold text-slate-700 dark:text-slate-200">{c.base_fee || 0} ج.م</span></div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => deleteShippingCarrier(c.id)}
                    className="text-rose-500 hover:text-rose-700 font-bold"
                  >
                    حذف الشركة
                  </button>
                  {c.tracking_url_template && (
                    <a
                      href={c.tracking_url_template}
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
      )}

      {/* Modal Add Carrier */}
      {showCarrierModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">إضافة شركة شحن جديدة</h3>
            <form onSubmit={handleSaveCarrier} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم شركة الشحن *</label>
                <input
                  type="text"
                  required
                  value={carrierForm.name}
                  onChange={(e) => setCarrierForm({ ...carrierForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">مسؤول التواصل</label>
                  <input
                    type="text"
                    value={carrierForm.contact_person}
                    onChange={(e) => setCarrierForm({ ...carrierForm, contact_person: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الهاتف</label>
                  <input
                    type="text"
                    value={carrierForm.phone}
                    onChange={(e) => setCarrierForm({ ...carrierForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">الرسوم الثابتة (ج.م)</label>
                  <input
                    type="number"
                    value={carrierForm.base_fee}
                    onChange={(e) => setCarrierForm({ ...carrierForm, base_fee: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">السعر لكل كجم</label>
                  <input
                    type="number"
                    value={carrierForm.rate_per_kg}
                    onChange={(e) => setCarrierForm({ ...carrierForm, rate_per_kg: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">قالب رابط التتبع</label>
                <input
                  type="text"
                  placeholder="https://carrier.com/track/{TN}"
                  value={carrierForm.tracking_url_template}
                  onChange={(e) => setCarrierForm({ ...carrierForm, tracking_url_template: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-xs"
                />
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl"
                >
                  حفظ الشركة
                </button>
                <button
                  type="button"
                  onClick={() => setShowCarrierModal(false)}
                  className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 rounded-xl"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Shipment */}
      {showShipmentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">تسجيل شحنة جديدة</h3>
            <form onSubmit={handleSaveShipment} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">شركة الشحن</label>
                <select
                  value={shipmentForm.carrier_id}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, carrier_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="">اختر شركة الشحن</option>
                  {carriers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">رقم التتبع</label>
                  <input
                    type="text"
                    value={shipmentForm.tracking_number}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, tracking_number: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">رقم الفاتورة المرتبطة</label>
                  <input
                    type="text"
                    value={shipmentForm.invoice_id}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, invoice_id: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اسم المستلم</label>
                  <input
                    type="text"
                    value={shipmentForm.recipient_name}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, recipient_name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">تكلفة الشحن (ج.م)</label>
                  <input
                    type="number"
                    value={shipmentForm.shipping_cost}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, shipping_cost: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl"
                >
                  حفظ الشحنة
                </button>
                <button
                  type="button"
                  onClick={() => setShowShipmentModal(false)}
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
