import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Banknote, ShoppingBag, ReceiptText, DollarSign, CreditCard, Wallet, Smartphone, Zap, Clock, TrendingUp } from 'lucide-react';
import { calculateCashRefunded } from '../../utils/returns';
import { totalOpeningBalance } from '../../utils/paymentMethods';
import { isMainTreasuryExpense, isMainTreasuryPurchase } from '../../utils/treasury';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function Overview() {
  const { orders, products, expenses, storeSettings, purchaseInvoices, offlineQueue } = useStore();
  const [period, setPeriod] = useState<PeriodFilter>('today');

  const activeOrders = orders.filter((order) => !order.is_deleted);

  // Date Filtering Helper
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const isWithinPeriod = (dateStr: string) => {
    if (period === 'all') return true;
    const itemTime = new Date(dateStr).getTime();
    if (isNaN(itemTime)) return true;
    if (period === 'today') return itemTime >= startOfToday;
    if (period === 'week') return itemTime >= startOfWeek;
    if (period === 'month') return itemTime >= startOfMonth;
    return true;
  };

  const periodOrders = activeOrders.filter(o => isWithinPeriod(o.date));
  const periodExpenses = expenses.filter(e => isWithinPeriod((e as any).created_at || e.date || ''));

  // Revenue & Order Aggregations
  let totalNetRevenue = 0;
  let validOrdersCount = 0;
  let totalDiscountsGiven = 0;

  // Payment Breakdown counters
  const paymentBreakdown = {
    cash: 0,
    visa: 0,
    wallet: 0,
    instapay: 0
  };

  periodOrders.forEach(order => {
    if (order.type === 'payment') {
      totalNetRevenue += (order.paid_amount || 0);
      paymentBreakdown.cash += (order.paid_cash || order.paid_amount || 0);
      paymentBreakdown.visa += (order.paid_visa || 0);
      paymentBreakdown.wallet += (order.paid_wallet || 0);
      paymentBreakdown.instapay += (order.paid_instapay || 0);
    } else {
      validOrdersCount++;
      
      // Calculate net sale amount for order
      let orderNet = 0;
      if (typeof order.total === 'number' && order.total > 0) {
        orderNet = order.total;
      } else if (order.items && order.items.length > 0) {
        orderNet = order.items.reduce((s, i) => s + (i.sale_price * (i.quantity - (i.returned_quantity || 0))), 0);
      } else {
        orderNet = order.paid_amount || 0;
      }

      // Deduct line/order discounts if total didn't already reflect it
      const orderDiscount = (order.discount_amount || 0);
      totalDiscountsGiven += orderDiscount;

      totalNetRevenue += orderNet;

      // Track Payment Method Splits
      paymentBreakdown.cash += (order.paid_cash || 0);
      paymentBreakdown.visa += (order.paid_visa || 0);
      paymentBreakdown.wallet += (order.paid_wallet || 0);
      paymentBreakdown.instapay += (order.paid_instapay || 0);
    }
  });

  const extraIncomes = periodExpenses.filter(e => e.amount < 0 && !isMainTreasuryExpense(e)).reduce((sum, e) => sum + Math.abs(e.amount), 0);
  totalNetRevenue += extraIncomes;

  // Calculate Net Safe Balance (All-Time Cash In Hand)
  const initialBalance = totalOpeningBalance(storeSettings as any);
  const ordersIn = activeOrders.reduce((sum, o) => {
    if (o.type === 'payment') return sum + (o.paid_amount || 0);
    
    let initialPaid = o.paid_amount || 0;
    const sumSplits = (o.paid_cash || 0) + (o.paid_visa || 0) + (o.paid_wallet || 0) + (o.paid_instapay || 0) + (o.paid_method5 || 0) + (o.paid_method6 || 0);
    if (sumSplits > 0) {
      initialPaid = sumSplits;
    } else {
      const paymentsForThis = activeOrders.filter(p => p.type === 'payment' && p.notes?.includes(`سداد أجل للفاتورة رقم #${o.id}`));
      const paymentsSum = paymentsForThis.reduce((s, p) => s + (p.paid_amount || 0), 0);
      initialPaid -= paymentsSum;
    }
    const totalRefunded = o.items?.reduce((s, item) => s + (item.refunded_amount || 0), 0) || 0;
    if (sumSplits === 0) initialPaid += totalRefunded;

    return sum + initialPaid;
  }, 0);

  const returnsOut = activeOrders.reduce((sum, o) => sum + calculateCashRefunded(o), 0);
  const expensesOut = expenses.filter(e => !isMainTreasuryExpense(e)).reduce((sum, e) => sum + (e.amount || 0), 0);
  const purchasesOut = purchaseInvoices.filter(inv => !isMainTreasuryPurchase(inv)).reduce((sum, inv) => sum + inv.paid_amount, 0);
  
  const totalSafeBalance = initialBalance + ordersIn - returnsOut - expensesOut - purchasesOut;
  
  // ── ديون العملاء الآجل غير المحصلة (تُخصم من رأس المال الصافي المتاح) ──
  const totalCustomerDebts = activeOrders.reduce((sum, o) => {
    if (o.type === 'payment') return sum;
    const itemSum = o.items?.reduce((s, i) => s + (i.sale_price * (i.quantity - (i.returned_quantity || 0))), 0) || 0;
    const orderTotal = (typeof o.total === 'number' && o.total > 0) ? o.total : itemSum;
    const paid = o.paid_amount || 0;
    const unpaid = Math.max(0, orderTotal - paid);
    return sum + unpaid;
  }, 0);

  const netCapitalAfterDebts = totalSafeBalance - totalCustomerDebts;

  const lowStockProducts = products.filter((p) => p.stock_quantity < 5).length;
  const averageOrderValue = validOrdersCount > 0 ? (totalNetRevenue / validOrdersCount) : 0;

  return (
    <div className="p-4 md:p-8 space-y-8" dir="rtl">
      {/* Header & Period Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <span>نظرة عامة</span>
            <span className="text-xs px-3 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-full border border-indigo-200 dark:border-indigo-800/50">
              ⚡ تحديث مباشر
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">إحصائيات المبيعات والأداء المالي والمخزون</p>
        </div>

        {/* Period Selector Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 dark:border-slate-700 shadow-sm self-start sm:self-auto overflow-x-auto max-w-full">
          {(['today', 'week', 'month', 'all'] as PeriodFilter[]).map((p) => {
            const labels: Record<PeriodFilter, string> = { today: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل' };
            const active = period === p;
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Unsynced Offline Queue Banner */}
      {offlineQueue.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-4 flex items-center justify-between gap-4 text-amber-800 dark:text-amber-300 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-2xl shrink-0 shadow-md">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="font-black text-sm">يوجد {offlineQueue.length} فواتير بيع معلقة من الأوفلاين</h4>
              <p className="text-xs font-medium opacity-90 mt-0.5">تم تضمينها تلقائياً في الإحصائيات ومحفوظة على الجهاز بانتظار الرفع للسيرفر.</p>
            </div>
          </div>
          <span className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-xl font-black shrink-0">
            أوفلاين
          </span>
        </div>
      )}

      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Revenue */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase">
              {period === 'today' ? 'مبيعات اليوم' : period === 'week' ? 'مبيعات الأسبوع' : period === 'month' ? 'مبيعات الشهر' : 'إجمالي المبيعات'}
            </span>
            <div style={{ backgroundColor: storeSettings.themeColor + '15', color: storeSettings.themeColor }} className="w-12 h-12 rounded-2xl flex items-center justify-center">
              <Banknote size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {totalNetRevenue.toFixed(2)} <span className="text-xs font-bold text-slate-400">{storeSettings.currency}</span>
            </h2>
            {totalDiscountsGiven > 0 && (
              <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                🏷️ الخصومات الممنوحة: {totalDiscountsGiven.toFixed(2)} {storeSettings.currency}
              </p>
            )}
          </div>
        </div>

        {/* Card 2: Safe Balance & Debts Deduction */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase">رصيد الخزنة ورأس المال الصافي</span>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
              {totalSafeBalance.toFixed(2)} <span className="text-xs font-bold text-slate-400">{storeSettings.currency}</span>
            </h2>
            {totalCustomerDebts > 0 ? (
              <div className="mt-2 space-y-0.5 border-t border-slate-100 dark:border-slate-700/60 pt-1.5">
                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center justify-between">
                  <span>📉 ديون عملاء غير محصلة:</span>
                  <span>-{totalCustomerDebts.toFixed(2)} {storeSettings.currency}</span>
                </p>
                <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                  <span>💎 الصافي الفعلي بعد الديون:</span>
                  <span>{netCapitalAfterDebts.toFixed(2)} {storeSettings.currency}</span>
                </p>
              </div>
            ) : (
              <p className="text-[11px] font-bold text-slate-400 mt-1">الرصيد النقدي المتوفر بالدرج</p>
            )}
          </div>
        </div>

        {/* Card 3: Orders Count & AOV */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase">عدد الفواتير الصادرة</span>
            <div style={{ backgroundColor: storeSettings.themeColor + '15', color: storeSettings.themeColor }} className="w-12 h-12 rounded-2xl flex items-center justify-center">
              <ReceiptText size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {validOrdersCount} <span className="text-xs font-bold text-slate-400">فاتورة</span>
            </h2>
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> متوسط قيمة الفاتورة (AOV): {averageOrderValue.toFixed(2)} {storeSettings.currency}
            </p>
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase">منتجات تُشرف على النفاد</span>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 flex items-center justify-center">
              <ShoppingBag size={24} />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
              {lowStockProducts} <span className="text-xs font-bold text-slate-400">منتج</span>
            </h2>
            <p className={`text-[11px] font-bold mt-1 ${lowStockProducts > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {lowStockProducts > 0 ? '⚠️ يحتاج إلى إعادة شراء' : '✅ المخزون ممتاز'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown Grid */}
      <div>
        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <Wallet className="text-indigo-500" size={20} />
          <span>تفنيط الإيرادات حسب طرق الدفع ({period === 'today' ? 'اليوم' : period === 'week' ? 'هذا الأسبوع' : period === 'month' ? 'هذا الشهر' : 'الكل'})</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 p-3 rounded-xl">
              <Banknote size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">نقدي (كاش)</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{paymentBreakdown.cash.toFixed(2)} <span className="text-[10px] text-slate-400">{storeSettings.currency}</span></span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 p-3 rounded-xl">
              <CreditCard size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">فيزا / كارت</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{paymentBreakdown.visa.toFixed(2)} <span className="text-[10px] text-slate-400">{storeSettings.currency}</span></span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 p-3 rounded-xl">
              <Smartphone size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">محفظة إلكترونية</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{paymentBreakdown.wallet.toFixed(2)} <span className="text-[10px] text-slate-400">{storeSettings.currency}</span></span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
            <div className="bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 p-3 rounded-xl">
              <Zap size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 block">إنستاباي (InstaPay)</span>
              <span className="text-lg font-black text-slate-800 dark:text-white">{paymentBreakdown.instapay.toFixed(2)} <span className="text-[10px] text-slate-400">{storeSettings.currency}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-slate-800 dark:text-white">أحدث الفواتير ({periodOrders.length})</h3>
          <span className="text-xs text-slate-400 font-bold">عرض أحدث 10 فواتير</span>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase font-bold">
                <tr>
                  <th className="p-4">رقم الفاتورة</th>
                  <th className="p-4">التاريخ والوقت</th>
                  <th className="p-4">بيانات العميل</th>
                  <th className="p-4">المنتجات المباعة</th>
                  <th className="p-4">الكاشير / البائع</th>
                  <th className="p-4">الإجمالي النهائي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {periodOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                      لا توجد فواتير بيع في هذه الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  periodOrders.slice(0, 10).map((order) => {
                    const orderTotalVal = (typeof order.total === 'number' && order.total > 0)
                      ? order.total
                      : (order.items?.reduce((sum, item) => sum + (item.sale_price * (item.quantity - (item.returned_quantity || 0))), 0) || order.paid_amount || 0);

                    const orderDate = new Date(order.date);
                    const formattedDate = isNaN(orderDate.getTime()) 
                      ? order.date 
                      : orderDate.toLocaleString('ar-EG', { calendar: 'gregory', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                    const itemsSummary = order.items && order.items.length > 0 
                      ? order.items.map(i => `${i.name} (${i.quantity})`).join(' ، ')
                      : (order.notes || 'سداد/معاملة مالية');

                    return (
                      <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                        <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-2">
                          <span>#{order.id}</span>
                          {(order as any).isOffline && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                              أوفلاين
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400">{formattedDate}</td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-medium">
                          {order.customer?.name || 'عميل نقدي'}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 truncate max-w-xs text-xs font-medium" title={itemsSummary}>
                          {itemsSummary}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400 text-xs font-bold">
                          {order.cashier_name || 'الكاشير'}
                          {order.salesperson_name ? ` (بائع: ${order.salesperson_name})` : ''}
                        </td>
                        <td className="p-4 font-black text-slate-800 dark:text-white">
                          {orderTotalVal.toFixed(2)} <span className="text-xs font-bold text-slate-400">{storeSettings.currency}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
