import { PieChart, TrendingUp, Package, DollarSign, BarChart2 } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function CategoryAnalytics() {
  const { categories, products, orders } = useStore();

  // Aggregate category analytics dynamically from orders and products
  const categoryStats = categories.map((cat) => {
    const catProducts = products.filter((p) => p.category_id === cat.id);
    const productIds = new Set(catProducts.map((p) => p.id));

    // Valuation
    const stockPurchaseValue = catProducts.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.purchase_price || 0), 0);
    const stockRetailValue = catProducts.reduce((sum, p) => sum + (p.stock_quantity || 0) * (p.sale_price || 0), 0);
    const totalQty = catProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);

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
    // GMROI (Gross Margin Return on Investment) = Net Profit / Average Stock Purchase Cost
    const gmroi = stockPurchaseValue > 0 ? (netProfit / stockPurchaseValue) * 100 : 0;

    return {
      id: cat.id,
      name: cat.name,
      productCount: catProducts.length,
      totalQty,
      stockPurchaseValue,
      stockRetailValue,
      totalSalesRevenue,
      netProfit,
      profitMargin: Math.round(profitMargin * 10) / 10,
      gmroi: Math.round(gmroi * 10) / 10,
      totalItemsSold,
    };
  });

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
            تحليلات التصنيفات والأرباح
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            مراقبة ربحية كل تصنيف، نسبة هامش الربح، تقييم البضاعة بالمخزن، وعائد الاستثمار (GMROI)
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
            <DollarSign size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">إجمالي إيرادات المبيعات</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{grandTotalSales.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <TrendingUp size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">صافي أرباح التصنيفات</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{grandTotalProfit.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Package size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">تقييم المخزون (بسعر الشراء)</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{grandInventoryCost.toLocaleString()} ج.م</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <BarChart2 size={24} />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-400 block">تقييم المخزون (بسعر البيع)</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{grandInventoryRetail.toLocaleString()} ج.م</span>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-400">
          جدول الأداء المالي والربحي لكل تصنيف
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 text-xs font-bold border-b border-slate-100 dark:border-slate-700">
                <th className="p-4">اسم التصنيف</th>
                <th className="p-4">عدد الأصناف</th>
                <th className="p-4">إجمالي مبيعات التصنيف</th>
                <th className="p-4">صافي الربح</th>
                <th className="p-4">هامش الربح (%)</th>
                <th className="p-4">قيمة المخزون (شراء)</th>
                <th className="p-4">قيمة المخزون (بيع)</th>
                <th className="p-4">مؤشر GMROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
              {categoryStats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-slate-400">
                    لا توجد تصنيفات معرفة بعد
                  </td>
                </tr>
              ) : (
                categoryStats.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="p-4 font-black text-slate-800 dark:text-white">{c.name}</td>
                    <td className="p-4 font-mono text-xs">{c.productCount} صنف ({c.totalQty} قطعة)</td>
                    <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">
                      {c.totalSalesRevenue.toLocaleString()} ج.م
                    </td>
                    <td className="p-4 font-mono text-emerald-600 dark:text-emerald-400">
                      {c.netProfit.toLocaleString()} ج.م
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min(Math.max(c.profitMargin, 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{c.profitMargin}%</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {c.stockPurchaseValue.toLocaleString()} ج.م
                    </td>
                    <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                      {c.stockRetailValue.toLocaleString()} ج.م
                    </td>
                    <td className="p-4 font-mono text-xs text-purple-600 dark:text-purple-400">
                      {c.gmroi}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
