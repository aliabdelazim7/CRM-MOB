import { useSyncExternalStore } from 'react';

/**
 * مصدر واحد للحقيقة بخصوص الثيم.
 *
 * قبل كده كان كل من AdminLayout و POS ماسك `useState` خاص بيه وبيكتب على
 * `documentElement.classList` و localStorage لوحده. وبما إن POS بيتعرض جوه
 * AdminLayout (مسار /admin/pos) كان الاتنين شغّالين مع بعض وكل واحد بيلغي
 * التاني — فالزرار كان بيبان غلط والثيم مابيتزامنش.
 *
 * دلوقتي فيه ستور خارجي واحد، وكل الكومبوننتس بتقرأ منه بـ useSyncExternalStore.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
/** الافتراضي داكن — ده سلوك السيستم الأصلي ومحافظين عليه. */
const DEFAULT_MODE: ThemeMode = 'dark';

/** لون شريط المتصفح/الستاتوس بار على الموبايل. */
const META_COLORS: Record<ResolvedTheme, string> = {
  light: '#f8fafc', // slate-50
  dark: '#020617', // slate-950
};

const listeners = new Set<() => void>();

function readStoredMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return DEFAULT_MODE;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* الوضع الخاص/الكوكيز المقفولة */
  }
  return DEFAULT_MODE;
}

function prefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light';
  return mode;
}

let currentMode: ThemeMode = readStoredMode();
let currentResolved: ResolvedTheme = resolveMode(currentMode);
/** snapshot ثابت عشان useSyncExternalStore ما يدخلش في لوب لا نهائي. */
let snapshot: { mode: ThemeMode; resolved: ResolvedTheme; isDark: boolean } = {
  mode: currentMode,
  resolved: currentResolved,
  isDark: currentResolved === 'dark',
};

function applyToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  root.classList.toggle('dark', resolved === 'dark');
  // مفيد للـ CSS اللي مش Tailwind (سكرول بار، عناصر الفورم الأصلية).
  root.dataset.theme = resolved;
  // بيخلّي المتصفح يرسم الـ inputs والسكرول بار والـ date pickers بالوضع الصح.
  root.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', META_COLORS[resolved]);
}

function publish() {
  const resolved = resolveMode(currentMode);
  currentResolved = resolved;
  applyToDocument(resolved);
  snapshot = { mode: currentMode, resolved, isDark: resolved === 'dark' };
  listeners.forEach((l) => l());
}

export function setThemeMode(mode: ThemeMode) {
  currentMode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* تجاهل */
  }
  publish();
}

export function toggleTheme() {
  // من الـ system بنقلب للعكس المرئي عشان الضغطة يبان ليها أثر فوراً.
  setThemeMode(resolveMode(currentMode) === 'dark' ? 'light' : 'dark');
}

export function getThemeSnapshot() {
  return snapshot;
}

/** بيتنادى مرة واحدة من main.tsx — بيربط التزامن بين التابات ومع نظام التشغيل. */
export function initTheme() {
  if (typeof window === 'undefined') return () => {};
  applyToDocument(currentResolved);

  // تزامن بين تابات/نوافذ السيستم المفتوحة على نفس الجهاز.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    const next = readStoredMode();
    if (next === currentMode) return;
    currentMode = next;
    publish();
  };
  window.addEventListener('storage', onStorage);

  // تغيير إعداد الجهاز نفسه — يهم بس لما الوضع = system.
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  const onSystemChange = () => {
    if (currentMode === 'system') publish();
  };
  mq?.addEventListener?.('change', onSystemChange);

  return () => {
    window.removeEventListener('storage', onStorage);
    mq?.removeEventListener?.('change', onSystemChange);
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * الهوك الوحيد اللي المفروض أي كومبوننت يستخدمه للثيم.
 * ممنوع أي كومبوننت يلمس documentElement.classList مباشرة.
 */
export function useTheme() {
  const state = useSyncExternalStore(subscribe, getThemeSnapshot, getThemeSnapshot);
  return {
    ...state,
    setMode: setThemeMode,
    toggle: toggleTheme,
  };
}
