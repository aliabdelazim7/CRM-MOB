import { useState, useEffect } from 'react';
import { FileSpreadsheet, CreditCard, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ALL_PAYMENT_KEYS, payLabelOf } from '../../utils/paymentMethods';

export default function SupplierLedgerPage() {
  const { suppliers, customers, supplierTransactions, storeSettings, loadEnterpriseData, addSupplierTransaction } = useStore();
  const [mode, setMode] = useState<'suppliers' | 'clients'>('suppliers');
  const [selectedId, setSelectedId] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');

  useEffect(() => {
    loadEnterpriseData();
  }, [loadEnterpriseData]);

  useEffect(() => {
    if (mode === 'suppliers' && suppliers.length > 0 && !selectedId) {
      setSelectedId(suppliers[0].id);
    } else if (mode === 'clients' && customers.length > 0 && !selectedId) {
      setSelectedId(customers[0].id);
    }
  }, [suppliers, customers, mode, selectedId]);

  const selectedSupplier = suppliers.find((s) => s.id === selectedId);

  const filteredTx = supplierTransactions.filter(
    (tx) => tx.supplier_id === selectedId
  );

  const totalPayable = supplierTransactions
    .filter((tx) => tx.supplier_id === selectedId && tx.type === 'PURCHASE')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalPaid = supplierTransactions
    .filter((tx) => tx.supplier_id === selectedId && tx.type === 'PAYMENT')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const outstandingBalance = selectedSupplier ? selectedSupplier.balance || 0 : 0;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || payAmount <= 0) return;

    const refNo = `PAY-${Date.now().toString().slice(-6)}`;
    const newBal = (selectedSupplier?.balance || 0) - payAmount;

    const ok = await addSupplierTransaction({
      supplier_id: selectedId,
      type: 'PAYMENT',
      amount: payAmount,
      balance_after: newBal,
      payment_method: payMethod,
      reference_no: refNo,
    });

    if (ok) {
      setShowPaymentModal(false);
      setPayAmount(0);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <FileSpreadsheet className="text-indigo-600 dark:text-indigo-400" size={28} />
            دفاتر الحسابات المالية (Suppliers & Clients Ledger)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            دفتر أستاذ للحسابات الدائنة (الموردين) والمدنية (العملاء)، تتبع حركة السداد والفواتير
          </p>
        </div>

        {mode === 'suppliers' && selectedSupplier && (
          <button
            onClick={() => setShowPaymentModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold transition shadow-lg shadow-indigo-200 dark:shadow-none text-sm"
          >
            <CreditCard size={18} />
            تسجيل دفعة سداد
          </button>
        )}
      </div>

      {/* Mode Switcher Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => { setMode('suppliers'); setSelectedId(suppliers[0]?.id || ''); }}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              mode === 'suppliers'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            حسابات الموردين (Accounts Payable)
          </button>
          <button
            onClick={() => { setMode('clients'); setSelectedId(customers[0]?.id || ''); }}
            className={`px-5 py-2 rounded-lg font-bold text-sm transition ${
              mode === 'clients'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            حسابات العملاء (Accounts Receivable)
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-sm w-full sm:w-64"
          >
            {mode === 'suppliers'
              ? suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (الرصيد: {s.balance || 0} ج.م)</option>
                ))
              : customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">إجمالي المستحق (Total Payable)</span>
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{totalPayable.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">إجمالي المسدد (Total Paid)</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalPaid.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">الرصيد القائم (Outstanding)</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{outstandingBalance.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-400">
          جدول المعاملات المالية الحركية (`supplier_transactions`)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                <th className="p-4">نوع الحركة</th>
                <th className="p-4">رقم المرجع (Ref)</th>
                <th className="p-4">المبلغ</th>
                <th className="p-4">الرصيد بعد الحركة</th>
                <th className="p-4">طريقة الدفع</th>
                <th className="p-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
              {filteredTx.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400 font-medium">
                    لا توجد معاملات مالية مسجلة
                  </td>
                </tr>
              ) : (
                filteredTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black ${
                          tx.type === 'PAYMENT'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'PAYMENT' ? 'سداد (PAYMENT)' : 'فاتورة مشتريات (PURCHASE)'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-400">{tx.reference_no || '-'}</td>
                    <td className="p-4 font-mono text-slate-900 dark:text-white font-black">{tx.amount.toLocaleString()} ج.م</td>
                    <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">{tx.balance_after.toLocaleString()} ج.م</td>
                    <td className="p-4 text-xs">{payLabelOf(storeSettings, tx.payment_method || 'cash')}</td>
                    <td className="p-4 text-xs text-slate-400">
                      {tx.created_at ? new Date(tx.created_at).toLocaleDateString('ar-EG') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">تسجيل دفعة للمورد</h3>
            <p className="text-xs text-slate-400">المورد: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedSupplier.name}</span></p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">المبلغ (ج.م) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold text-lg text-emerald-600 dark:text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">طريقة الدفع</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-bold"
                >
                  {ALL_PAYMENT_KEYS.map((k) => (
                    <option key={k} value={k}>{payLabelOf(storeSettings, k)}</option>
                  ))}
                </select>
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
