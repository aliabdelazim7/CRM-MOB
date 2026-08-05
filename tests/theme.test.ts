/* eslint-disable @typescript-eslint/no-explicit-any -- تركيب DOM مزيّف على globalThis */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * theme.ts بيقرأ localStorage وقت الاستيراد، فلازم نجهّز DOM مزيّف
 * قبل أي import — عشان كده بنستخدم import ديناميكي جوه كل تست.
 */

type Fake = {
  root: {
    classList: { _s: Set<string>; toggle: (c: string, on: boolean) => void; contains: (c: string) => boolean };
    dataset: Record<string, string>;
    style: Record<string, string>;
  };
  meta: { content: string };
  listeners: Record<string, ((e: any) => void)[]>;
  mqListeners: ((e: any) => void)[];
};

function installFakeDom(stored: string | null, systemPrefersDark = false): Fake {
  const store: Record<string, string> = {};
  if (stored !== null) store.theme = stored;

  const classes = new Set<string>();
  const root = {
    classList: {
      _s: classes,
      toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)),
      contains: (c: string) => classes.has(c),
    },
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
  };

  const meta = { content: '' };
  const listeners: Record<string, ((e: any) => void)[]> = {};
  const mqListeners: ((e: any) => void)[] = [];

  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  };

  (globalThis as any).document = {
    documentElement: root,
    querySelector: (sel: string) => (sel.includes('theme-color') ? { setAttribute: (_: string, v: string) => (meta.content = v) } : null),
  };

  (globalThis as any).window = {
    matchMedia: () => ({
      matches: systemPrefersDark,
      addEventListener: (_: string, cb: (e: any) => void) => mqListeners.push(cb),
      removeEventListener: () => {},
    }),
    addEventListener: (type: string, cb: (e: any) => void) => {
      (listeners[type] ||= []).push(cb);
    },
    removeEventListener: () => {},
  };

  return { root, meta, listeners, mqListeners };
}

async function loadTheme() {
  vi.resetModules();
  return import('../src/theme');
}

describe('theme store', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('يفتح داكن افتراضياً لو مفيش قيمة محفوظة', async () => {
    const dom = installFakeDom(null);
    const t = await loadTheme();
    t.initTheme();
    expect(t.getThemeSnapshot().isDark).toBe(true);
    expect(dom.root.classList.contains('dark')).toBe(true);
  });

  it('يحترم القيمة المحفوظة light', async () => {
    const dom = installFakeDom('light');
    const t = await loadTheme();
    t.initTheme();
    expect(t.getThemeSnapshot().isDark).toBe(false);
    expect(dom.root.classList.contains('dark')).toBe(false);
    expect(dom.root.style.colorScheme).toBe('light');
  });

  it('التبديل بيغيّر الكلاس و colorScheme و meta theme-color مع بعض', async () => {
    const dom = installFakeDom('dark');
    const t = await loadTheme();
    t.initTheme();

    t.toggleTheme();
    expect(dom.root.classList.contains('dark')).toBe(false);
    expect(dom.root.dataset.theme).toBe('light');
    expect(dom.root.style.colorScheme).toBe('light');
    expect(dom.meta.content).toBe('#f8fafc');

    t.toggleTheme();
    expect(dom.root.classList.contains('dark')).toBe(true);
    expect(dom.root.dataset.theme).toBe('dark');
    expect(dom.root.style.colorScheme).toBe('dark');
    expect(dom.meta.content).toBe('#020617');
  });

  it('كل المشتركين بياخدوا نفس القيمة — ده اللي كان مكسور بين POS و AdminLayout', async () => {
    installFakeDom('dark');
    const t = await loadTheme();
    t.initTheme();

    // كومبوننتين بيقروا من نفس الستور (زي POS و AdminLayout)
    const seenA: boolean[] = [];
    const seenB: boolean[] = [];
    const readAll = () => {
      seenA.push(t.getThemeSnapshot().isDark);
      seenB.push(t.getThemeSnapshot().isDark);
    };

    readAll();
    t.toggleTheme();
    readAll();
    t.toggleTheme();
    readAll();

    expect(seenA).toEqual(seenB);
    expect(seenA).toEqual([true, false, true]);
  });

  it('snapshot ثابت مابين التحديثات (مايعملش لوب في useSyncExternalStore)', async () => {
    installFakeDom('dark');
    const t = await loadTheme();
    t.initTheme();
    expect(t.getThemeSnapshot()).toBe(t.getThemeSnapshot());
  });

  it('وضع system بيتبع إعداد الجهاز', async () => {
    const dom = installFakeDom('system', true);
    const t = await loadTheme();
    t.initTheme();
    expect(t.getThemeSnapshot().isDark).toBe(true);
    expect(dom.root.classList.contains('dark')).toBe(true);
  });

  it('يتزامن بين التابات عن طريق حدث storage', async () => {
    const dom = installFakeDom('dark');
    const t = await loadTheme();
    t.initTheme();
    expect(dom.root.classList.contains('dark')).toBe(true);

    // تاب تاني غيّر الثيم
    (globalThis as any).localStorage.setItem('theme', 'light');
    dom.listeners.storage.forEach((cb) => cb({ key: 'theme' }));

    expect(t.getThemeSnapshot().isDark).toBe(false);
    expect(dom.root.classList.contains('dark')).toBe(false);
  });

  it('قيمة محفوظة تالفة بترجع للافتراضي بدل ما تكسر', async () => {
    installFakeDom('banana');
    const t = await loadTheme();
    t.initTheme();
    expect(t.getThemeSnapshot().mode).toBe('dark');
  });
});
