import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  Banknote, ShoppingBag, ReceiptText, DollarSign, Wallet, 
  Clock, TrendingUp, Package, FileText, Landmark, 
  Percent, Edit, RefreshCw, BarChart3, TrendingDown 
} from 'lucide-react';
import { calculateCashRefunded } from '../../utils/returns';
import { totalOpeningBalance } from '../../utils/paymentMethods';
import { isMainTreasuryExpense, isMainTreasuryPurchase } from '../../utils/treasury';
import { useNavigate } from 'react-router-dom';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function Overview() {
  const { orders, products, expenses, storeSettings, purchaseInvoices, offlineQueue } = useStore();
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const navigate = useNavigate();

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
  let totalCOGS = 0;

  // Top Sellers Aggregation
  const productSales: Record<string, { name: string; qty: number }> = {};

  periodOrders.forEach(order => {
    if (order.type === 'payment') {
      totalNetRevenue += (order.paid_amount || 0);
    } else {
      validOrdersCount++;
      
      let orderNet = 0;
      if (typeof order.total === 'number' && order.total > 0) {
        orderNet = order.total;
      } else if (order.items && order.items.length > 0) {
        orderNet = order.items.reduce((s, i) => s + (i.sale_price * (i.quantity - (i.returned_quantity || 0))), 0);
      } else {
        orderNet = order.paid_amount || 0;
      }

      totalNetRevenue += orderNet;

      // COGS and Top Sellers
      order.items?.forEach(item => {
        const qty = item.quantity - (item.returned_quantity || 0);
        if (qty > 0) {
          // COGS
          const cost = (item.purchase_price || 0) * qty;
          totalCOGS += cost;
          
          // Top Sellers
          if (!productSales[item.id]) {
            productSales[item.id] = { name: item.name, qty: 0 };
          }
          productSales[item.id].qty += qty;
        }
      });
    }
  });

  const extraIncomes = periodExpenses.filter(e => e.amount < 0 && !isMainTreasuryExpense(e)).reduce((sum, e) => sum + Math.abs(e.amount), 0);
  totalNetRevenue += extraIncomes;

  // Expenses calculation
  const expensesOut = periodExpenses.filter(e => e.amount > 0 && !isMainTreasuryExpense(e)).reduce((sum, e) => sum + (e.amount || 0), 0);
  
  // Profit Calculations
  const grossProfit = totalNetRevenue - totalCOGS;
  const netProfit = grossProfit - expensesOut;
  const zakat = netProfit > 0 ? netProfit * 0.10 : 0;
  const netAfterZakat = netProfit - zakat;
  const profitMargin = totalNetRevenue > 0 ? (netProfit / totalNetRevenue) * 100 : 0;

  // Safe Balance (Capital) Calculation - All Time
  const initialBalance = totalOpeningBalance(storeSettings as any);
  const ordersIn = activeOrders.reduce((sum, o) => {
    if (o.type === 'payment') return sum + (o.paid_amount || 0);
    let initialPaid = o.paid_amount || 0;
    const sumSplits = (o.paid_cash || 0) + (o.paid_visa || 0) + (o.paid_wallet || 0) + (o.paid_instapay || 0) + (o.paid_method5 || 0) + (o.paid_method6 || 0);
    if (sumSplits > 0) initialPaid = sumSplits;
    else {
      const paymentsForThis = activeOrders.filter(p => p.type === 'payment' && p.notes?.includes(`سداد أجل للفاتورة رقم #${o.id}`));
      const paymentsSum = paymentsForThis.reduce((s, p) => s + (p.paid_amount || 0), 0);
      initialPaid -= paymentsSum;
    }
    const totalRefunded = o.items?.reduce((s, item) => s + (item.refunded_amount || 0), 0) || 0;
    if (sumSplits === 0) initialPaid += totalRefunded;
    return sum + initialPaid;
  }, 0);
  
  const returnsOut = activeOrders.reduce((sum, o) => sum + calculateCashRefunded(o), 0);
  const totalExpensesOut = expenses.filter(e => !isMainTreasuryExpense(e)).reduce((sum, e) => sum + (e.amount || 0), 0);
  const purchasesOut = purchaseInvoices.filter(inv => !isMainTreasuryPurchase(inv)).reduce((sum, inv) => sum + inv.paid_amount, 0);
  
  const totalCustomerDebts = activeOrders.reduce((sum, o) => {
    if (o.type === 'payment') return sum;
    const itemSum = o.items?.reduce((s, i) => s + (i.sale_price * (i.quantity - (i.returned_quantity || 0))), 0) || 0;
    const orderTotal = (typeof o.total === 'number' && o.total > 0) ? o.total : itemSum;
    const paid = o.paid_amount || 0;
    const unpaid = Math.max(0, orderTotal - paid);
    return sum + unpaid;
  }, 0);

  const totalSafeBalance = initialBalance + ordersIn - returnsOut - totalExpensesOut - purchasesOut;
  const netCapitalAfterDebts = totalSafeBalance - totalCustomerDebts;

  // Other Stats
  const totalProductsCount = products.length;
  
  const todayOrders = activeOrders.filter(o => new Date(o.date).getTime() >= startOfToday);
    const todaySalesRevenue = todayOrders.filter(o => o.type !== 'payment').reduce((sum, o) => sum + (o.paid_amount || 0), 0);
  const pendingInvoicesCount = activeOrders.filter(o => o.type !== 'payment' && (o.total || 0) > (o.paid_amount || 0)).length;
  const todayReturnsCount = todayOrders.filter(o => o.items?.some(i => (i.returned_quantity || 0) > 0)).length;
  
  const todayPurchases = purchaseInvoices.filter(inv => new Date(inv.created_at || '').getTime() >= startOfToday).reduce((sum, inv) => sum + (inv.total || 0), 0);

  const topSellers = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <div className="p-4 md:p-8 space-y-8" dir="rtl">
      {/* Header & Period Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 dark:bg-indigo-900/50 p-4 rounded-2xl">
            <BarChart3 className="text-indigo-600 dark:text-indigo-400" size={32} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">نظرة شاملة على أداء عملك</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/settings')} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition">
            <Edit size={16} /> إعدادات الداشبورد
          </button>
          <div className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-600">
            {(['today', 'week', 'month', 'all'] as PeriodFilter[]).map((p) => {
              const labels: Record<PeriodFilter, string> = { today: 'اليوم', week: 'الأسبوع', month: 'الشهر', all: 'الكل' };
              const active = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {offlineQueue.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-4 flex items-center justify-between gap-4 text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-2.5 rounded-2xl shrink-0 shadow-md">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="font-black text-sm">يوجد {offlineQueue.length} فواتير بيع معلقة من الأوفلاين</h4>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Main Stats (5 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 flex flex-col items-center text-center gap-3 relative overflow-hidden group hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Banknote size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">إجمالي المبيعات</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {totalNetRevenue.toFixed(2)}
            </h2>
            <span className="text-xs font-bold text-slate-400 block mt-1">جنيه</span>
          </div>
          {period !== 'all' && (
            <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-1 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
              <TrendingUp size={12} /> {period === 'today' ? 'هذا اليوم' : period === 'week' ? 'هذا الأسبوع' : 'هذا الشهر'}
            </div>
          )}
        </div>

        {/* Orders Count */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-pink-100 dark:border-pink-900/30 flex flex-col items-center text-center gap-3 relative overflow-hidden group hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-pink-50 dark:bg-pink-950/40 text-pink-500 flex items-center justify-center">
            <ReceiptText size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">عدد الطلبات</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {validOrdersCount}
            </h2>
          </div>
          <div className="text-[10px] font-bold text-slate-400 mt-1">إجمالي الفواتير</div>
        </div>

        {/* Products Count */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-blue-900/30 flex flex-col items-center text-center gap-3 relative overflow-hidden group hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
            <Package size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">عدد المنتجات</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {totalProductsCount}
            </h2>
          </div>
          <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> متاح في المخزون
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-rose-100 dark:border-rose-900/30 flex flex-col items-center text-center gap-3 relative overflow-hidden group hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <FileText size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">إجمالي المصروفات</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {expensesOut.toFixed(2)}
            </h2>
            <span className="text-xs font-bold text-slate-400 block mt-1">جنيه</span>
          </div>
          {expensesOut > 0 && (
            <div className="text-[10px] font-bold text-rose-500 flex items-center gap-1 mt-1 bg-rose-50 dark:bg-rose-900/30 px-2 py-1 rounded-full">
              <TrendingDown size={12} /> مصروفات مسجلة
            </div>
          )}
        </div>

        {/* Capital */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center text-center gap-3 relative overflow-hidden group hover:shadow-md transition">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
            <Landmark size={24} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">رأس المال</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {netCapitalAfterDebts.toFixed(2)}
            </h2>
            <span className="text-xs font-bold text-slate-400 block mt-1">جنيه</span>
          </div>
          <button onClick={() => navigate('/admin/finance')} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1">
            <TrendingUp size={12} /> اضغط للتفاصيل
          </button>
        </div>
      </div>

      {/* Row 2: Profit Metrics (4 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Profit */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-amber-900/30 flex flex-col items-center text-center gap-3 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">الربح الإجمالي</span>
          <div>
            <h2 className="text-2xl font-black text-amber-600 dark:text-amber-500">
              {grossProfit.toFixed(2)} <span className="text-sm font-bold text-slate-400">جنيه</span>
            </h2>
          </div>
          <div className="text-[10px] font-bold text-slate-400">قبل خصم المصروفات</div>
        </div>

        {/* Net Profit */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center text-center gap-3 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">صافي الربح</span>
          <div>
            <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-500">
              {netProfit.toFixed(2)} <span className="text-sm font-bold text-slate-400">جنيه</span>
            </h2>
          </div>
          {netProfit > 0 && (
            <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
              <TrendingUp size={12} /> ممتاز
            </div>
          )}
        </div>

        {/* Zakat */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-pink-100 dark:border-pink-900/30 flex flex-col items-center text-center gap-3 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 dark:bg-pink-950/40 text-pink-500 flex items-center justify-center">
            <Banknote size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">الزكاة 10%</span>
          <div>
            <h2 className="text-2xl font-black text-pink-600 dark:text-pink-500">
              {zakat.toFixed(2)} <span className="text-sm font-bold text-slate-400">جنيه</span>
            </h2>
          </div>
          <div className="text-[10px] font-bold text-slate-400">من صافي الربح</div>
        </div>

        {/* Net after Zakat */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-cyan-100 dark:border-cyan-900/30 flex flex-col items-center text-center gap-3 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 flex items-center justify-center">
            <Wallet size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">صافي بعد الزكاة</span>
          <div>
            <h2 className="text-2xl font-black text-cyan-600 dark:text-cyan-500">
              {netAfterZakat.toFixed(2)} <span className="text-sm font-bold text-slate-400">جنيه</span>
            </h2>
          </div>
          <div className="text-[10px] font-bold text-slate-400">صافي الربح - الزكاة</div>
        </div>
      </div>

      {/* Row 3: Margin & Capital Edit (2 Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Profit Margin */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-cyan-100 dark:border-cyan-900/30 flex flex-col items-center text-center gap-3 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-500 flex items-center justify-center">
            <Percent size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">نسبة الربح</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {profitMargin.toFixed(1)}%
            </h2>
          </div>
          {profitMargin > 0 && (
            <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
              <TrendingUp size={12} /> ممتاز
            </div>
          )}
        </div>

        {/* Capital Edit */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 flex flex-col items-center text-center gap-3 hover:shadow-md transition">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center">
            <Landmark size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 dark:text-slate-400">رأس المال</span>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
              {netCapitalAfterDebts.toFixed(2)} <span className="text-sm font-bold text-slate-400">جنيه</span>
            </h2>
          </div>
          <button onClick={() => navigate('/admin/settings')} className="text-[10px] font-bold text-slate-500 hover:text-purple-600 flex items-center gap-1 transition">
            <Edit size={12} /> انقر للتعديل
          </button>
        </div>
        
        <div className="col-span-1 lg:col-span-2"></div>
      </div>

      {/* Row 4: Quick Summary & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Summary */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center justify-center gap-2">
            <BarChart3 className="text-slate-500" size={20} />
            <span>ملخص سريع</span>
          </h3>
          
          <div className="space-y-4">
            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl flex items-center justify-between border border-indigo-100 dark:border-indigo-800/30">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">مشتريات اليوم</span>
                <span className="font-black text-indigo-700 dark:text-indigo-400">{todayPurchases.toFixed(2)} جنيه</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                <ShoppingBag size={18} />
              </div>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl flex items-center justify-between border border-emerald-100 dark:border-emerald-800/30">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">مبيعات اليوم</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">{todaySalesRevenue.toFixed(2)} جنيه</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
                <Banknote size={18} />
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl flex items-center justify-between border border-amber-100 dark:border-amber-800/30">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">فواتير معلقة</span>
                <span className="font-black text-amber-700 dark:text-amber-400">{pendingInvoicesCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                <Clock size={18} />
              </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-2xl flex items-center justify-between border border-rose-100 dark:border-rose-800/30">
              <div>
                <span className="text-xs font-bold text-slate-500 block mb-1">مرتجعات اليوم</span>
                <span className="font-black text-rose-700 dark:text-rose-400">{todayReturnsCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-400 text-white flex items-center justify-center">
                <RefreshCw size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Top Sellers */}
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col">
          <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6 flex items-center justify-center gap-2">
            <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Top Sellers</span>
            <span>أفضل المنتجات مبيعاً</span>
          </h3>
          
          <div className="flex-1 flex flex-col justify-center items-center">
            {topSellers.length === 0 ? (
              <div className="text-center text-slate-400">
                <ReceiptText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold">لا توجد مبيعات بعد</p>
              </div>
            ) : (
              <div className="w-full space-y-3">
                {topSellers.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-amber-100 text-amber-600' : index === 1 ? 'bg-slate-200 text-slate-600' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                        {index + 1}
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{product.name}</span>
                    </div>
                    <div className="font-black text-indigo-600 dark:text-indigo-400">
                      {product.qty} <span className="text-xs text-slate-400 font-bold">قطعة</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
