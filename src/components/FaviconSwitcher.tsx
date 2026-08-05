import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore, DEFAULT_LOGO } from '../store/useStore';

/**
 * عنوان التبويب وأيقونة المتصفح.
 *
 * قبل كده الاتنين كانوا مكتوبين «ADRIA» ثابت في الكود، فأي عميل تاني يرفع
 * لوجوه واسمه من الإعدادات كان بيلاقي السايدبار اتغيّر والتبويب لسه ADRIA.
 * دلوقتي الاتنين بيتاخدوا من إعدادات المتجر.
 *
 * الأيقونة: لو المتجر رافع لوجو بتاعه بنستخدمه. لو لسه على الافتراضي بنستخدم
 * المونوجرام بنسخته الفاتحة أو الداكنة حسب اللوحة المفتوحة.
 */
export default function FaviconSwitcher() {
  const location = useLocation();
  const { storeSettings } = useStore();

  const name = storeSettings.name?.trim() || 'ADRIA';
  const logo = storeSettings.logo?.trim() || '';

  useEffect(() => {
    const isAdmin = location.pathname.startsWith('/admin');

    const hasCustomLogo = logo !== '' && logo !== DEFAULT_LOGO;
    const href = hasCustomLogo
      ? logo
      : (isAdmin ? '/favicon-admin.svg' : '/favicon-cashier.svg');

    let link = document.getElementById('app-favicon') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = 'app-favicon';
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    // النوع بيتحدد من المصدر: اللوجو المرفوع بيبقى data:image/png، ولو سبنا
    // image/svg+xml مكتوب عليه بعض المتصفحات مش بترسمه.
    const type = href.startsWith('data:')
      ? (href.slice(5).split(';')[0] || '')
      : href.endsWith('.svg') ? 'image/svg+xml' : '';
    if (type) link.setAttribute('type', type);
    else link.removeAttribute('type');

    if (link.getAttribute('href') !== href) link.setAttribute('href', href);

    document.title = `${name} — ${isAdmin ? 'لوحة التحكم' : 'الكاشير'}`;

    // اسم التطبيق على الشاشة الرئيسية بيتقرا من الوسمين دول.
    document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', name);
    document.querySelector('meta[name="application-name"]')?.setAttribute('content', name);
  }, [location.pathname, name, logo]);

  return null;
}
