/**
 * 主题模式控制（跟随 dark-mode-toggle 最佳实践）
 * 状态模型：'system'（无存储值，meta=light dark） | 'light' | 'dark'
 */

const STORAGE_KEY = 'color-scheme';
const THEME_EVENT = 'sz-theme-change';

export function getSystemPreference() {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme() {
    if (typeof window === 'undefined') return 'system';
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {}
    return 'system';
}

export function getEffectiveTheme(stored = getStoredTheme()) {
    return stored === 'system' ? getSystemPreference() : stored;
}

export function applyThemePreference(mode) {
    if (typeof document === 'undefined') return;
    const meta = document.querySelector('meta[name="color-scheme"]');
    const content = mode === 'light' || mode === 'dark' ? mode : 'light dark';
    if (meta) {
        meta.setAttribute('content', content);
    }

    try {
        if (mode === 'light' || mode === 'dark') {
            localStorage.setItem(STORAGE_KEY, mode);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {}

    window.dispatchEvent(new Event(THEME_EVENT));
}

export function toggleOppositeTheme() {
    const currentEffective = getEffectiveTheme();
    const target = currentEffective === 'dark' ? 'light' : 'dark';
    const system = getSystemPreference();
    const nextMode = target === system ? 'system' : target;
    applyThemePreference(nextMode);
    return nextMode;
}

export function subscribeThemeChange(callback) {
    if (typeof window === 'undefined') return () => {};
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onStorage = (e) => {
        if (!e.key || e.key === STORAGE_KEY) callback();
    };
    mql.addEventListener('change', callback);
    window.addEventListener('storage', onStorage);
    window.addEventListener(THEME_EVENT, callback);
    return () => {
        mql.removeEventListener('change', callback);
        window.removeEventListener('storage', onStorage);
        window.removeEventListener(THEME_EVENT, callback);
    };
}
