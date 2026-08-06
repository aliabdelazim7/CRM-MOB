import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Layers, Package, FileText, ShoppingCart, RotateCcw, Truck, Wallet, BarChart3, CreditCard, ArrowLeftRight, Users, Landmark, PiggyBank, DollarSign, Printer, Database, Moon, Sun, Settings, LogOut, Menu, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useEffect, useState } from 'react';
import { useTheme } from '../../theme';
import { isOwner as isOwnerUser, canSeePage } from '../../utils/permissions';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { storeSettings, logout, maintenanceAppointments, carSubscriptions, updateMaintenanceReminded, adminPermissions } = useStore();
  const isOwner = isOwnerUser(adminPermissions);
  const canSee = (path: string) => canSeePage(adminPermissions, path);
  const [hasCheckedReminders, setHasCheckedReminders] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // الثيم بقى من ستور واحد مشترك — مفيش نسخة محلية هنا تتعارض مع POS.
  const { isDark, toggle: toggleDarkMode } = useTheme();

  useEffect(() => {
    if (hasCheckedReminders || maintenanceAppointments.length === 0 || carSubscriptions.length === 0) return;

    const checkReminders = async () => {
      const tomorrowStr = new Date(Date.now() + 86400000).toDateString();
      
      for (const appt of maintenanceAppointments) {
        if (appt.status === 'pending' && !appt.is_reminded) {
          const apptDateStr = new Date(appt.appointment_date).toDateString();
          if (apptDateStr === tomorrowStr) {
            const car = carSubscriptions.find(c => c.id === appt.subscription_id);
            if (car) {
              fetch('/api/telegram-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'general',
                  message: `تذكير: موعد صيانة غداً للسيارة رقم ${car.car_number} باسم ${car.customer_name}.`
                }),
              }).catch(console.warn);

              await updateMaintenanceReminded(appt.id);
            }
          }
        }
      }
      setHasCheckedReminders(true);
    };

    checkReminders();
  }, [maintenanceAppointments, carSubscriptions, hasCheckedReminders, updateMaintenanceReminded]);

  // Exact 21 sidebar items matching user request image
  const menuItems = [
    { name: 'Dashboard', path: '/admin/overview', icon: LayoutDashboard },
    { name: 'الكوليكشن', path: '/admin/category-analytics-page', icon: Layers },
    { name: 'المنتجات', path: '/admin/inventory', icon: Package },
    { name: 'الفواتير', path: '/admin/invoices', icon: FileText },
    { name: 'المشتريات', path: '/admin/purchase-invoices-page', icon: ShoppingCart },
    { name: 'المرتجعات', path: '/admin/invoices', icon: RotateCcw },
    { name: 'المنصات والشحن', path: '/admin/logistics-orders', icon: Truck },
    { name: 'المصروفات', path: '/admin/finance', icon: Wallet },
    { name: 'التقارير', path: '/admin/reports', icon: BarChart3 },
    { name: 'إدارة الديون', path: '/admin/supplier-ledger-page', icon: CreditCard },
    { name: 'إدارة المخزون', path: '/admin/warehouse-transfers', icon: ArrowLeftRight },
    { name: 'العملاء', path: '/admin/customers', icon: Users },
    { name: 'الموردين', path: '/admin/suppliers', icon: Users },
    { name: 'الحسابات البنكية', path: '/admin/payment-accounts', icon: Landmark },
    { name: 'فلوس المتجر', path: '/admin/savings', icon: PiggyBank },
    { name: 'تحصيل المنصات', path: '/admin/carriers', icon: DollarSign },
    { name: 'نقطة البيع', path: '/admin/pos', icon: Printer },
    { name: 'النسخ الاحتياطي', path: '/admin/offline-invoices', icon: Database },
    ...(isOwner ? [{ name: 'المستخدمين', path: '/admin/users', icon: Users }] : []),
    { name: 'الوضع الداكن', path: '#dark-mode', icon: Moon, isAction: true },
    { name: 'الإعدادات', path: '/admin/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 overflow-hidden" dir="rtl">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 right-0 w-72 max-w-[85vw] bg-white text-slate-600 border-l border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 flex flex-col shadow-2xl z-40 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:w-64`}>
        <div className="p-5 pb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex-1 min-w-0">
            {/* اللوجو بيفضل على خلفية بيضا في الوضعين — أغلب اللوجوهات شفافة/داكنة. */}
            <img src={storeSettings.logo} alt="Logo" className="h-10 w-auto max-w-[120px] rounded-xl bg-white object-contain" />
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-bold text-slate-900 dark:text-white text-sm truncate" title={storeSettings.name}>{storeSettings.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">لوحة الإدارة</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white rounded-xl shrink-0" aria-label="إغلاق القائمة">
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 px-4 pb-4 overflow-y-auto mt-4 space-y-1">
          {menuItems.map((item) => {
            if (!item.isAction && !canSee(item.path)) return null;

            if (item.isAction) {
              return (
                <button
                  key={item.name}
                  onClick={toggleDarkMode}
                  role="switch"
                  aria-checked={isDark}
                  aria-label={isDark ? 'إيقاف الوضع الداكن' : 'تفعيل الوضع الداكن'}
                  className="flex items-center gap-3 w-full px-4 py-3 lg:py-2.5 rounded-xl transition text-sm font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {isDark ? <Sun size={18} /> : <Moon size={18} />}
                  <span className="flex-1 text-right">{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
                  {/* مؤشر بصري بدل كلمة «(مفعل)» */}
                  <span
                    aria-hidden="true"
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 ${isDark ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? '-translate-x-4' : 'translate-x-0'}`}
                    />
                  </span>
                </button>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={({ isActive }) => isActive ? { background: storeSettings.themeColor } : {}}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 lg:py-2.5 rounded-xl transition text-sm ${
                    isActive
                      ? 'text-white font-bold shadow-lg'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                <item.icon size={18} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-black/20 dark:hover:text-red-300 rounded-xl transition"
          >
            <LogOut size={20} />
            خروج من الإدارة
          </button>
        </div>
      </div>

      {/* العمود الرئيسي */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* شريط علوي للموبايل */}
        <header className="lg:hidden flex items-center gap-3 bg-white text-slate-900 border-b border-slate-200 dark:bg-slate-900 dark:text-white dark:border-slate-800 px-3 py-2.5 shadow-md z-20 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl" aria-label="فتح القائمة">
            <Menu size={24} />
          </button>
          <img src={storeSettings.logo} alt="" className="h-8 w-auto max-w-[90px] rounded-lg bg-white object-contain" />
          <span className="font-bold text-sm truncate flex-1">{storeSettings.name}</span>
        </header>

        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 relative">
          <div
            style={{ backgroundColor: storeSettings.themeColor + '10' }}
            className="absolute top-0 left-0 w-full h-64 -z-10"
          ></div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
