import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * السيستم ده بيتنشر لأكتر من عميل من نفس الكود. الحاجات اللي بتتقري **قبل**
 * ما React يشتغل — عنوان التبويب، وسوم معاينة الرابط، ومانيفست الـPWA —
 * مايقدروش يتاخدوا من إعدادات المتجر (اللي جوه قاعدة البيانات)، فبنجيبهم من
 * متغيّرات البيئة وقت البناء. كل نشر بيحط قيمه في .env أو في إعدادات Vercel.
 *
 * الاسم واللوجو اللي بيتغيّروا من شاشة الإعدادات بيتطبّقوا وقت التشغيل عن طريق
 * FaviconSwitcher — دول للعنوان والأيقونة داخل التطبيق.
 */
function branding(env: Record<string, string>): Plugin {
  const name = env.VITE_APP_NAME || 'ADRIA';
  const description = env.VITE_APP_DESCRIPTION || 'نظام لإدارة المبيعات والمخزون والكاشير.';
  const siteUrl = (env.VITE_SITE_URL || 'https://cashier-branch3.vercel.app').replace(/\/+$/, '');

  return {
    name: 'app-branding',
    transformIndexHtml(html) {
      return html
        .replace(/%APP_NAME%/g, name)
        .replace(/%APP_DESCRIPTION%/g, description)
        .replace(/%SITE_URL%/g, siteUrl);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const appName = env.VITE_APP_NAME || 'ADRIA';
  const appDescription = env.VITE_APP_DESCRIPTION || 'نظام لإدارة المبيعات والمخزون والكاشير.';

  return {
    plugins: [
      react(),
      branding(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg', 'og-image.png'],
        manifest: {
          name: `${appName} كاشير`,
          short_name: appName,
          description: appDescription,
          lang: 'ar',
          dir: 'rtl',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          theme_color: '#0D0D0D',
          background_color: '#F8EEE2',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              src: 'apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png'
            }
          ]
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
          navigateFallback: '/index.html',
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true
        }
      })
    ]
  };
});
