'use client';

import { useSyncExternalStore } from 'react';
import { formatDisplayTime, formatRelativeTimestamp } from '@/lib/cameras';
import { getEffectiveTheme, subscribeThemeChange, toggleOppositeTheme } from '@/lib/theme';

const getThemeSnapshot = () => getEffectiveTheme();
const getServerThemeSnapshot = () => 'light';

/**
 * Header 组件 - 顶部天象台状态栏、视图切换与昼夜舒适切换
 */
export default function Header({
    viewMode,
    onViewModeChange,
    playbackStatus,
    activeTimestamp,
    onAboutOpen,
}) {
    const effectiveTheme = useSyncExternalStore(
        subscribeThemeChange,
        getThemeSnapshot,
        getServerThemeSnapshot
    );

    const getStatusLabel = () => {
        const timeStr = activeTimestamp ? formatDisplayTime(activeTimestamp) : '--:--';
        if (playbackStatus === 'error') {
            return { state: 'error', text: '画面异常' };
        }
        if (playbackStatus === 'playback' && activeTimestamp) {
            return { state: 'playback', text: `回放 · ${formatRelativeTimestamp(activeTimestamp)}` };
        }
        if (playbackStatus === 'delayed') {
            return { state: 'delayed', text: `延迟帧 · ${timeStr}` };
        }
        return { state: 'live', text: `LIVE · ${timeStr}` };
    };

    const status = getStatusLabel();

    return (
        <header className="header">
            <div className="header-inner">
                <div className="header-brand">
                    <span className="brand-mark" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <circle cx="12" cy="12" r="8" />
                            <path d="M12 4v4M12 12l5.2-3.2M4 15h16" strokeLinecap="round" />
                        </svg>
                    </span>
                    <div className="brand-titles">
                        <span className="site-title">深圳实时天象台</span>
                        <span className="site-subtitle">SZ WEATHER OBSERVATORY</span>
                    </div>
                </div>

                <div className="header-actions">
                    <div className="view-switch" role="group" aria-label="视图模式">
                        <button
                            type="button"
                            className="view-switch-btn"
                            aria-pressed={viewMode === 'single'}
                            onClick={() => onViewModeChange('single')}
                        >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                            </svg>
                            <span>单机位</span>
                        </button>
                        <button
                            type="button"
                            className="view-switch-btn"
                            aria-pressed={viewMode === 'grid'}
                            onClick={() => onViewModeChange('grid')}
                        >
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <rect x="3" y="4" width="7.5" height="7" rx="1.2" />
                                <rect x="13.5" y="4" width="7.5" height="7" rx="1.2" />
                                <rect x="3" y="13" width="7.5" height="7" rx="1.2" />
                                <rect x="13.5" y="13" width="7.5" height="7" rx="1.2" />
                            </svg>
                            <span>四宫格</span>
                        </button>
                    </div>

                    <div className="status-pill" data-state={status.state} aria-live="polite">
                        <span className="status-dot" aria-hidden="true" />
                        <span>{status.text}</span>
                    </div>

                    <button
                        type="button"
                        className="icon-btn"
                        onClick={toggleOppositeTheme}
                        aria-label={effectiveTheme === 'dark' ? '切换为日间纸本主题' : '切换为夜间天文台主题'}
                        title={effectiveTheme === 'dark' ? '切换为日间纸本主题' : '切换为夜间天文台主题'}
                    >
                        {effectiveTheme === 'dark' ? (
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <circle cx="12" cy="12" r="4" />
                                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                            </svg>
                        )}
                    </button>

                    <button
                        type="button"
                        className="icon-btn"
                        onClick={onAboutOpen}
                        aria-label="关于与快捷键设置"
                        title="关于与设置"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <circle cx="12" cy="12" r="9.5" />
                            <path d="M12 8h.01M12 11v5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
