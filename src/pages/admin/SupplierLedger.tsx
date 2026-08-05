import { useState, useEffect } from 'react';
import { FileSpreadsheet, CreditCard, DollarSign, ArrowUpRight, ArrowDownLeft, Search } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ALL_PAYMENT_KEYS, payLabelOf } from '../../utils/paymentMethods';

export default function SupplierLedger() {
  const { suppliers, supplierLedgers, storeSettings, loadEnterpriseData, recordSupplierPayment } = useStore();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [search, setSearch] = useState('');

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [payNote, setPayNote] = useState<string>('');

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  useEffect(() => {
    if (suppliers.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  const filteredEntries = supplierLedgers.filter((e) =>
    e.supplier_id === selectedSupplierId &&
    (search === '' || (e.reference_number && e.reference_number.includes(search)) || (e.note && e.note.includes(search)))
  );

  // Statistics
  const totalDebit = filteredEntries.reduce((sum, e) => sum + (e.debit || 0), 0);
  const totalCredit = filteredEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
  const currentBalance = selectedSupplier ? selectedSupplier.balance || 0 : 0;

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || payAmount <= 0) return;
    const ok = await recordSupplierPayment(selectedSupplierId, payAmount, payAccountId, payNote);
    if (ok) {
      setShowPaymentModal(false);
      setPayAmount(0);
      setPayNote('');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400" size={28} />
            كشوف حسابات الموردين والدفاتر
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            دفتر أستاذ تفصيلي لكل مورد، تسوية المستحقات، وسداد الدفعات المالية مباشرة
          </p>
        </div>

        {selectedSupplier && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
          >
            <CreditCard size={18} />
            تسجيل دفعة للمورد
          </button>
        )}
      </div>

      {/* Supplier Picker Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-sm font-bold text-slate-500 shrink-0">اختر المورد:</label>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-800 dark:text-white w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} (الرصيد: {s.balance || 0} ج.م)
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute right-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث في الحركات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      {selectedSupplier && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownLeft size={24} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block">إجمالي المسدد (مدين)</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalDebit.toLocaleString()} ج.م</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block">إجمالي الفواتير (دائن)</span>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{totalCredit.toLocaleString()} ج.م</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <DollarSign size={24} />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 block">الرصيد الحالي المستحق</span>
              <span className={`text-2xl font-black ${currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {currentBalance.toLocaleString()} ج.م
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-400">
          دفتر أستاذ الحساب — {selectedSupplier ? selectedSupplier.name : 'اختر مورد'}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                <th className="p-4">نوع المعاملة</th>
                <th className="p-4">المرجع</th>
                <th className="p-4">مدين (مسدد له)</th>
                <th className="p-4">دائن (فاتورة/مستحق)</th>
                <th className="p-4">الرصيد المتبقي</th>
                <th className="p-4">بيان / ملاحظات</th>
                <th className="p-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-slate-400">
                    لا توجد معطيات مسجلة لهذا المورد
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          entry.transaction_type === 'payment'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400'
                        }`}
                      >
                        {entry.transaction_type === 'payment' ? 'دفعة سداد' : 'فاتورة مشتريات'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">{entry.reference_number || '-'}</td>
                    <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400">
                      {entry.debit > 0 ? `${entry.debit.toLocaleString()} ج.م` : '-'}
                    </td>
                    <td className="p-4 font-mono text-rose-600 dark:text-rose-400">
                      {entry.credit > 0 ? `${entry.credit.toLocaleString()} ج.م` : '-'}
                    </td>
                    <td className="p-4 font-mono text-slate-800 dark:text-white">
                      {entry.balance.toLocaleString()} ج.م
                    </td>
                    <td className="p-4 text-xs font-medium">{entry.note || '-'}</td>
                    <td className="p-4 text-xs text-slate-400">
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString('ar-EG') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Payment */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">تسجيل سداد دفعة للمورد</h3>
            <p className="text-xs text-slate-400">المورد: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedSupplier.name}</span></p>

            <form onSubmit={handleSavePayment} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المسدد (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-lg text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">حساب الخزينة / الوسيلة</label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  <option value="">خزينة الكاشير / كاش</option>
                  {ALL_PAYMENT_KEYS.map((key) => (
                    <option key={key} value={key}>{payLabelOf(storeSettings, key)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات أو رقم الإيصال</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl">
                  تأكيد السداد
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
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
