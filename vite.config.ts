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
  const name = env.VITE_APP_NAME || 'HANCES System';
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
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_']);
  const appName = env.VITE_APP_NAME || 'HANCES System';
  const appDescription = env.VITE_APP_DESCRIPTION || 'نظام لإدارة المبيعات والمخزون والكاشير.';

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'SUPABASE_'],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL ||
        env.NEXT_PUBLIC_SUPABASE_URL ||
        env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        ''
      ),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY ||
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        env.SUPABASE_ANON_KEY ||
        env.SUPABASE_PUBLISHABLE_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.SUPABASE_ANON_KEY ||
        process.env.SUPABASE_PUBLISHABLE_KEY ||
        ''
      ),
    },
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
