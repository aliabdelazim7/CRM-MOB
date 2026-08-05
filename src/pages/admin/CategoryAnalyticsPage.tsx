import { PieChart, TrendingUp, Package, DollarSign, BarChart2, Award, AlertTriangle, Gem } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function CategoryAnalyticsPage() {
  const { categories, products, orders } = useStore();

  // Aggregate category analytics dynamically from orders and products
  const categoryStats = categories.map((cat) => {
    const catProducts = products.filter((p) => p.category_id === cat.id);
    const productIds = new Set(catProducts.map((p) => p.id));

    // Valuation
    const stockPurchaseValue = catProducts.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.purchase_price || 0), 0);
    const stockRetailValue = catProducts.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.sale_price || 0), 0);
    const totalQty = catProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
    const lowStockCount = catProducts.filter((p) => (p.stock_quantity || 0) <= 5).length;

    // Sales calculation from completed orders
    let totalSalesRevenue = 0;
    let totalCostOfGoodsSold = 0;
    let totalItemsSold = 0;

    orders.forEach((ord) => {
      if (ord.items) {
        ord.items.forEach((item) => {
          if (productIds.has(item.id)) {
            const qty = item.quantity || 1;
            const price = item.sale_price || item.discount_price || 0;
            const cost = item.purchase_price || 0;
            totalSalesRevenue += qty * price;
            totalCostOfGoodsSold += qty * cost;
            totalItemsSold += qty;
          }
        });
      }
    });

    const netProfit = totalSalesRevenue - totalCostOfGoodsSold;
    const profitMargin = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

    return {
      id: cat.id,
      name: cat.name,
      productCount: catProducts.length,
      totalQty,
      lowStockCount,
      stockPurchaseValue,
      stockRetailValue,
      totalSalesRevenue,
      netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      totalItemsSold,
    };
  });

  // Calculate highest revenue & highest margin for badges
  const maxRevenue = Math.max(...categoryStats.map((c) => c.totalSalesRevenue), 1);
  const maxMargin = Math.max(...categoryStats.map((c) => c.profitMargin), 1);

  const grandTotalSales = categoryStats.reduce((sum, c) => sum + c.totalSalesRevenue, 0);
  const grandTotalProfit = categoryStats.reduce((sum, c) => sum + c.netProfit, 0);
  const grandInventoryCost = categoryStats.reduce((sum, c) => sum + c.stockPurchaseValue, 0);
  const grandInventoryRetail = categoryStats.reduce((sum, c) => sum + c.stockRetailValue, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <PieChart className="text-indigo-600 dark:text-indigo-400" size={28} />
            تحليلات أداء ومبيعات التصنيفات (Category Earnings Analytics)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            بطاقات أداء التصنيفات والشارات التنافسية (الأعلى مبيعاً 🏆، الأعلى ربحية 💎، ونواقص المخزون ⚠️)
          </p>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">إجمالي إيرادات التصنيفات</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{grandTotalSales.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">صافي الأرباح الربحية</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{grandTotalProfit.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">قيمة البضاعة بالمخزن (شراء)</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{grandInventoryCost.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <BarChart2 size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">قيمة البضاعة بالمخزن (بيع)</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{grandInventoryRetail.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Category Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryStats.map((c) => {
          const isTopSelling = c.totalSalesRevenue > 0 && c.totalSalesRevenue === maxRevenue;
          const isHighMargin = c.profitMargin > 0 && c.profitMargin === maxMargin;
          const hasLowStock = c.lowStockCount > 0;

          return (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">{c.name}</h3>
                  <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full">
                    {c.productCount} أصناف
                  </span>
                </div>

                {/* Performance Badges */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {isTopSelling && (
                    <span className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-black px-2.5 py-1 rounded-xl">
                      <Award size={14} /> الأعلى مبيعاً (Top Selling)
                    </span>
                  )}
                  {isHighMargin && (
                    <span className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-black px-2.5 py-1 rounded-xl">
                      <Gem size={14} /> الأعلى ربحية (High Margin)
                    </span>
                  )}
                  {hasLowStock && (
                    <span className="flex items-center gap-1 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 text-xs font-black px-2.5 py-1 rounded-xl">
                      <AlertTriangle size={14} /> {c.lowStockCount} أصناف منخفضة
                    </span>
                  )}
                </div>

                {/* Metrics Breakdown */}
                <div className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <span>إجمالي الإيرادات:</span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm">{c.totalSalesRevenue.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <span>صافي الربح:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{c.netProfit.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <span>هامش الربح %:</span>
                    <span className="font-mono text-sm">{c.profitMargin}%</span>
                  </div>
                  <div className="flex justify-between p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <span>تقييم مخزون التصنيف (شراء):</span>
                    <span className="font-mono text-sm">{c.stockPurchaseValue.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
