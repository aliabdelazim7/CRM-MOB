import { useState } from 'react';
import { Layers, Plus, Edit, Trash2, Image as ImageIcon, Package, TrendingUp, DollarSign } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Category } from '../../store/useStore';

export default function CategoryAnalyticsPage() {
  const { categories, products, orders, addCategory, updateCategory, deleteCategory } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Calculate statistics per category
  const categoryStats = categories.map((cat) => {
    const catProducts = products.filter((p) => p.category_id === cat.id);
    const productIds = new Set(catProducts.map((p) => p.id));

    let totalSales = 0;
    let totalCost = 0;

    orders.forEach((ord) => {
      if (ord.items) {
        ord.items.forEach((item) => {
          if (productIds.has(item.id)) {
            const qty = item.quantity || 1;
            const price = item.sale_price || item.discount_price || 0;
            const cost = item.purchase_price || 0;
            totalSales += qty * price;
            totalCost += qty * cost;
          }
        });
      }
    });

    const netProfit = totalSales - totalCost;

    return {
      ...cat,
      productCount: catProducts.length,
      totalSales,
      netProfit,
    };
  });

  const totalCollections = categories.length;
  const totalProducts = products.length;
  const grandTotalSales = categoryStats.reduce((sum, c) => sum + c.totalSales, 0);

  const openAdd = () => {
    setEditingCat(null);
    setName('');
    setImageUrl('');
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setName(cat.name);
    setImageUrl(cat.image_url || '');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCat) {
      await updateCategory(editingCat.id, name, imageUrl);
    } else {
      await addCategory(name, imageUrl);
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت تأكد من رغبتك في حذف هذا الكوليكشن؟')) {
      await deleteCategory(id);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header Bar matching UI screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-sm text-sm"
        >
          <Plus size={18} />
          إضافة كوليكشن
        </button>

        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
          إدارة الكوليكشن
          <Layers className="text-emerald-700 dark:text-emerald-400" size={26} />
        </h1>
      </div>

      {/* Top 3 Summary Cards matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Collections */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-purple-500 shadow-sm text-center relative overflow-hidden">
          <span className="text-slate-500 dark:text-slate-400 text-base font-bold flex items-center justify-center gap-2 mb-3">
            <Layers className="text-purple-600" size={22} />
            إجمالي الكوليكشن
          </span>
          <span className="text-4xl font-black text-slate-800 dark:text-white">{totalCollections}</span>
        </div>

        {/* Card 2: Total Products */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-teal-500 shadow-sm text-center relative overflow-hidden">
          <span className="text-slate-500 dark:text-slate-400 text-base font-bold flex items-center justify-center gap-2 mb-3">
            <Package className="text-teal-600" size={22} />
            إجمالي المنتجات
          </span>
          <span className="text-4xl font-black text-slate-800 dark:text-white">{totalProducts}</span>
        </div>

        {/* Card 3: Total Sales */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-emerald-500 shadow-sm text-center relative overflow-hidden">
          <span className="text-slate-500 dark:text-slate-400 text-base font-bold flex items-center justify-center gap-2 mb-3">
            <TrendingUp className="text-emerald-600" size={22} />
            إجمالي المبيعات
          </span>
          <span className="text-4xl font-black text-slate-800 dark:text-white">
            {grandTotalSales.toFixed(2)} جنيه
          </span>
        </div>
      </div>

      {/* Main Table matching exact UI screenshot */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-700 text-white text-xs font-bold border-b border-slate-600">
                <th className="p-4 text-center">الصورة</th>
                <th className="p-4">اسم الكوليكشن</th>
                <th className="p-4 text-center">عدد المنتجات</th>
                <th className="p-4 text-center">إجمالي المبيعات</th>
                <th className="p-4 text-center">صافي الربح</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm font-bold text-slate-700 dark:text-slate-200">
              {categoryStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center p-8 text-slate-400">
                    لا توجد كوليكشن مضافة حالياً
                  </td>
                </tr>
              ) : (
                categoryStats.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    {/* Image Thumbnail */}
                    <td className="p-4 text-center">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 mx-auto flex items-center justify-center overflow-hidden">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-slate-400" size={20} />
                        )}
                      </div>
                    </td>

                    {/* Collection Name */}
                    <td className="p-4 text-base font-black text-slate-800 dark:text-white">
                      {c.name}
                    </td>

                    {/* Product Count Badge */}
                    <td className="p-4 text-center">
                      <span className="inline-block bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 px-3 py-1 rounded-full text-xs font-bold">
                        {c.productCount} منتج
                      </span>
                    </td>

                    {/* Total Sales */}
                    <td className="p-4 text-center text-cyan-600 dark:text-cyan-400 font-mono">
                      {c.totalSales.toFixed(2)} جنيه
                    </td>

                    {/* Net Profit */}
                    <td className="p-4 text-center text-indigo-600 dark:text-indigo-400 font-mono">
                      {c.netProfit.toFixed(2)} جنيه
                    </td>

                    {/* Action Buttons matching screenshot */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(c)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          تعديل <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          حذف <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">
              {editingCat ? 'تعديل بيانات الكوليكشن' : 'إضافة كوليكشن جديد'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الكوليكشن (مثل: ساعات، سلاسل، أساور، شنط) *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">رابط صورة الكوليكشن (اختياري)</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-bold text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-xl">
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
