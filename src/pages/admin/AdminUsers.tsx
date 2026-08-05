import { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Users, Plus, Trash2, Edit3, Shield, X, UserCheck, Lock, Phone, UserPlus } from 'lucide-react';

const PERM_GROUPS: { section: string; items: [string, string][] }[] = [
  { section: 'عام', items: [['/admin/overview', 'نظرة عامة'], ['/admin/analytics', 'التحليلات والتقارير'], ['/admin/reports', 'التقارير وكشوف الحساب']] },
  { section: 'المبيعات والفواتير', items: [['/admin/invoices', 'الفواتير والمرتجعات'], ['/admin/offline-invoices', 'الفواتير الأوفلاين'], ['/admin/held-invoices', 'المعلقة والطلبات'], ['/admin/coupons', 'كوبونات الخصم']] },
  { section: 'المخزون والتصنيع', items: [['/admin/inventory', 'المخزون والمنتجات'], ['/admin/stocktake', 'الجرد والتسوية'], ['/admin/devo', 'الديڤو والتوالف'], ['/admin/manufacturing', 'التصنيع'], ['/admin/stock-alerts', 'تنبيهات النواقص']] },
  { section: 'العملاء', items: [['/admin/customers', 'قاعدة العملاء'], ['/admin/deferred', 'حسابات الآجل'], ['/admin/whatsapp-campaigns', 'حملات واتساب']] },
  { section: 'الموردين', items: [['/admin/suppliers', 'الموردين والمشتريات']] },
  { section: 'المالية والخزائن', items: [['/admin/finance', 'الخزينة والمصاريف'], ['/admin/payment-accounts', 'كشوف حسابات الوسائل'], ['/admin/savings', 'الخزنة الرئيسية'], ['/admin/budget', 'الميزانية العامة'], ['/admin/financing', 'سلف وتمويل'], ['/admin/managers', 'المدراء والسحوبات'], ['/admin/partners', 'الشركاء']] },
  { section: 'الموظفين', items: [['/admin/cashiers', 'إدارة المحاسبين'], ['/admin/employees', 'الرواتب والموظفين']] },
  { section: 'الإعدادات', items: [['/admin/settings', 'إعدادات النظام']] },
];
const ALL_PATHS = PERM_GROUPS.flatMap((g) => g.items.map(([p]) => p));
const labelOf = (path: string) => PERM_GROUPS.flatMap((g) => g.items).find(([p]) => p === path)?.[1] || path;

export default function AdminUsers() {
  const { adminUsers, loadAdminUsers, addAdminUser, updateAdminUser, deleteAdminUser,
    cashiers, loadCashiers, addCashier, updateCashier, deleteCashier } = useStore();

  const [activeTab, setActiveTab] = useState<'admins' | 'cashiers'>('admins');

  // Admin form state
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Cashier form state
  const [showCashierForm, setShowCashierForm] = useState(false);
  const [editingCashier, setEditingCashier] = useState<any>(null);
  const [cashierName, setCashierName] = useState('');
  const [cashierPassword, setCashierPassword] = useState('');
  const [cashierPhone, setCashierPhone] = useState('');
  const [cashierFullAccess, setCashierFullAccess] = useState(false);
  const [savingCashier, setSavingCashier] = useState(false);

  useEffect(() => {
    loadAdminUsers();
    loadCashiers();
  }, [loadAdminUsers, loadCashiers]);

  // Admin handlers
  const openAddAdmin = () => { setEditingAdmin(null); setAdminName(''); setAdminPassword(''); setPerms([]); setShowAdminForm(true); };
  const openEditAdmin = (u: any) => { setEditingAdmin(u); setAdminName(u.name); setAdminPassword(''); setPerms(Array.isArray(u.permissions) ? u.permissions : []); setShowAdminForm(true); };
  const togglePerm = (p: string) => setPerms((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);
  const toggleGroup = (items: [string, string][]) => {
    const paths = items.map(([p]) => p);
    const allOn = paths.every((p) => perms.includes(p));
    setPerms((cur) => allOn ? cur.filter((x) => !paths.includes(x)) : [...new Set([...cur, ...paths])]);
  };

  const submitAdmin = async () => {
    if (!adminName.trim()) { alert('اسم المستخدم مطلوب'); return; }
    if (!editingAdmin && adminPassword.length < 4) { alert('كلمة السر مطلوبة (4 خانات على الأقل)'); return; }
    setSavingAdmin(true);
    if (editingAdmin) await updateAdminUser(editingAdmin.id, { name: adminName.trim(), permissions: perms, ...(adminPassword ? { password: adminPassword } : {}) });
    else await addAdminUser({ name: adminName.trim(), password: adminPassword, permissions: perms });
    setSavingAdmin(false);
    setShowAdminForm(false);
  };

  // Cashier handlers
  const openAddCashier = () => {
    setEditingCashier(null);
    setCashierName('');
    setCashierPassword('');
    setCashierPhone('');
    setCashierFullAccess(false);
    setShowCashierForm(true);
  };

  const openEditCashier = (c: any) => {
    setEditingCashier(c);
    setCashierName(c.name);
    setCashierPassword(c.password || '');
    setCashierPhone(c.phone || '');
    setCashierFullAccess(!!c.full_access);
    setShowCashierForm(true);
  };

  const submitCashier = async () => {
    if (!cashierName.trim()) { alert('اسم موظف الكاشير مطلوب'); return; }
    if (!editingCashier && !cashierPassword) { alert('كلمة مرور الكاشير مطلوبة'); return; }

    setSavingCashier(true);
    if (editingCashier) {
      await updateCashier(editingCashier.id, { name: cashierName.trim(), password: cashierPassword, phone: cashierPhone, photo_url: editingCashier.photo_url || '', full_access: cashierFullAccess });
    } else {
      await addCashier({ name: cashierName.trim(), password: cashierPassword, phone: cashierPhone, photo_url: '', full_access: cashierFullAccess });
    }
    setSavingCashier(false);
    setShowCashierForm(false);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Shield className="text-indigo-600" size={28} />
            إدارة المستخدمين والموظفين (Users & Staff)
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            إضافة وتعديل مستخدمي لوحة التحكم وموظفي الكاشير (المحاسبين)
          </p>
        </div>

        {activeTab === 'admins' ? (
          <button onClick={openAddAdmin} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm shadow-md">
            <Plus size={18} /> إضافة مستخدم جديد
          </button>
        ) : (
          <button onClick={openAddCashier} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm shadow-md">
            <UserPlus size={18} /> إضافة موظف كاشير
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 max-w-md">
        <button
          onClick={() => setActiveTab('admins')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
            activeTab === 'admins'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Shield size={18} />
          مستخدمو لوحة التحكم ({adminUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('cashiers')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
            activeTab === 'cashiers'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <UserCheck size={18} />
          موظفو الكاشير ({cashiers.length})
        </button>
      </div>

      {/* Tab 1: Admin Users */}
      {activeTab === 'admins' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminUsers.length === 0 ? (
            <p className="text-slate-400 col-span-full text-center py-8">لا يوجد مستخدمون للوحة التحكم بعد</p>
          ) : (
            adminUsers.map((u) => (
              <div key={u.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-black">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">{u.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium">{(u.permissions || []).length} صلاحية</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditAdmin(u)} className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-xl transition">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => { if (confirm(`حذف المستخدم ${u.name}؟`)) deleteAdminUser(u.id); }} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-xl transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-50 dark:border-slate-700">
                  {(u.permissions || []).slice(0, 5).map((p: string) => (
                    <span key={p} className="text-[10px] bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                      {labelOf(p)}
                    </span>
                  ))}
                  {(u.permissions || []).length > 5 && (
                    <span className="text-[10px] text-slate-400 font-bold">+{(u.permissions || []).length - 5}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Cashier Employees */}
      {activeTab === 'cashiers' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cashiers.length === 0 ? (
            <p className="text-slate-400 col-span-full text-center py-8">لا يوجد موظفو كاشير مضافون بعد</p>
          ) : (
            cashiers.map((c) => (
              <div key={c.id} className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-black">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">{c.name}</p>
                      <p className="text-[11px] text-slate-400 font-bold">محاسب كاشير</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditCashier(c)} className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-xl transition">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => { if (confirm(`حذف موظف الكاشير ${c.name}؟`)) deleteCashier(c.id); }} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 p-2 rounded-xl transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs font-bold text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-slate-400" />
                    <span>كلمة السر: <span className="font-mono text-slate-800 dark:text-slate-200">{c.password || '****'}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span>الهاتف: <span className="font-mono text-slate-800 dark:text-slate-200">{c.phone || 'غير مسجل'}</span></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Admin User Modal Form */}
      {showAdminForm && (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-3" onClick={() => setShowAdminForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black flex items-center gap-2"><Users size={20} /> {editingAdmin ? 'تعديل مستخدم لوحة التحكم' : 'إضافة مستخدم جديد'}</h2>
              <button onClick={() => setShowAdminForm(false)} className="hover:bg-white/20 p-1.5 rounded-lg"><X size={22} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">اسم المستخدم *</label>
                  <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">{editingAdmin ? 'كلمة سر جديدة (اختياري)' : 'كلمة السر *'}</label>
                  <input type="text" dir="ltr" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder={editingAdmin ? '••••' : ''} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-bold" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-black text-slate-700 dark:text-slate-200">الصلاحيات (الصفحات المسموح بها)</span>
                <button type="button" onClick={() => setPerms(perms.length === ALL_PATHS.length ? [] : [...ALL_PATHS])} className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
                  {perms.length === ALL_PATHS.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
              </div>

              {PERM_GROUPS.map((g) => (
                <div key={g.section} className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-3 border border-slate-100 dark:border-slate-700">
                  <button type="button" onClick={() => toggleGroup(g.items)} className="text-xs font-black text-slate-600 dark:text-slate-300 mb-2">{g.section}</button>
                  <div className="grid grid-cols-2 gap-1.5">
                    {g.items.map(([p, label]) => (
                      <label key={p} className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input type="checkbox" checked={perms.includes(p)} onChange={() => togglePerm(p)} className="w-4 h-4 accent-indigo-600" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex gap-2">
              <button onClick={() => setShowAdminForm(false)} className="flex-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold py-3 rounded-xl">إلغاء</button>
              <button onClick={submitAdmin} disabled={savingAdmin} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 rounded-xl">{savingAdmin ? 'جاري الحفظ...' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cashier Employee Modal Form */}
      {showCashierForm && (
        <div className="fixed inset-0 bg-black/50 z-[150] flex items-center justify-center p-3" onClick={() => setShowCashierForm(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-slate-100 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-black flex items-center gap-2"><UserPlus size={20} /> {editingCashier ? 'تعديل موظف كاشير' : 'إضافة موظف كاشير جديد'}</h2>
              <button onClick={() => setShowCashierForm(false)} className="hover:bg-white/20 p-1.5 rounded-lg"><X size={22} /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">اسم موظف الكاشير *</label>
                <input
                  type="text"
                  required
                  value={cashierName}
                  onChange={(e) => setCashierName(e.target.value)}
                  placeholder="أدخل اسم المحاسب..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">كلمة المرور (Password) *</label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={cashierPassword}
                  onChange={(e) => setCashierPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-bold font-mono text-center"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  dir="ltr"
                  value={cashierPhone}
                  onChange={(e) => setCashierPhone(e.target.value)}
                  placeholder="010..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 font-bold"
                />
              </div>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cashierFullAccess}
                  onChange={(e) => setCashierFullAccess(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">صلاحيات كاملة (تجاوز OTP العمليات الحساسة)</span>
              </label>

              <div className="flex gap-2 pt-2">
                <button onClick={submitCashier} disabled={savingCashier} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3 rounded-xl">
                  {savingCashier ? 'جاري الحفظ...' : 'حفظ الكاشير'}
                </button>
                <button onClick={() => setShowCashierForm(false)} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-4 py-3 rounded-xl">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
