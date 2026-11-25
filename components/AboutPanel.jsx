'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { applyThemePreference, getStoredTheme, subscribeThemeChange } from '@/lib/theme';

const getStoredThemeSnapshot = () => getStoredTheme();
const getServerThemeSnapshot = () => 'system';

/**
 * AboutPanel 组件 - 基于原生 <dialog>（showModal + closedby="any" + 指针降级）的关于与设置弹窗
 */
export default function AboutPanel({ isOpen, onClose }) {
    const dialogRef = useRef(null);
    const themeMode = useSyncExternalStore(
        subscribeThemeChange,
        getStoredThemeSnapshot,
        getServerThemeSnapshot
    );

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen && !dialog.open) {
            dialog.showModal();
        } else if (!isOpen && dialog.open) {
            dialog.close();
        }
    }, [isOpen]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        const handleClose = () => {
            dialog.returnValue = '';
            onClose();
        };
        dialog.addEventListener('close', handleClose);

        let cleanupLightDismiss = () => {};
        if (!('closedBy' in HTMLDialogElement.prototype)) {
            let pressedOutside = false;
            const isOutside = (e) => {
                const r = dialog.getBoundingClientRect();
                return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
            };
            const onPointerDown = (e) => {
                pressedOutside = isOutside(e);
            };
            const onPointerUp = (e) => {
                if (pressedOutside && isOutside(e)) {
                    dialog.close();
                }
            };
            dialog.addEventListener('pointerdown', onPointerDown);
            dialog.addEventListener('pointerup', onPointerUp);
            cleanupLightDismiss = () => {
                dialog.removeEventListener('pointerdown', onPointerDown);
                dialog.removeEventListener('pointerup', onPointerUp);
            };
        }

        return () => {
            dialog.removeEventListener('close', handleClose);
            cleanupLightDismiss();
        };
    }, [onClose]);

    return (
        <dialog
            ref={dialogRef}
            className="about-dialog"
            closedby="any"
            aria-labelledby="about-dialog-title"
        >
            <div className="about-dialog-header">
                <div>
                    <h1 id="about-dialog-title" className="about-title">深圳实时天象台</h1>
                    <p className="about-subtitle">SZ WEATHER OBSERVATORY · V0.3.0</p>
                </div>
                <button
                    type="button"
                    className="about-close-btn"
                    onClick={() => dialogRef.current?.close()}
                    aria-label="关闭弹窗"
                    autoFocus
                >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            <p className="station-description">
                聚合深圳市气象局 14 路实景摄像头、和风天气区级实况与预警信号，提供空间点位方位图、四宫格巡检与 24 小时连续延时回放。
            </p>

            <div className="about-section">
                <span className="about-section-title">外观主题</span>
                <div className="theme-selector-row" role="group" aria-label="外观主题选择">
                    <button
                        type="button"
                        className="theme-option-btn"
                        aria-pressed={themeMode === 'system'}
                        onClick={() => applyThemePreference('system')}
                    >
                        跟随系统
                    </button>
                    <button
                        type="button"
                        className="theme-option-btn"
                        aria-pressed={themeMode === 'light'}
                        onClick={() => applyThemePreference('light')}
                    >
                        日间纸本
                    </button>
                    <button
                        type="button"
                        className="theme-option-btn"
                        aria-pressed={themeMode === 'dark'}
                        onClick={() => applyThemePreference('dark')}
                    >
                        夜间天文台
                    </button>
                </div>
            </div>

            <div className="about-section">
                <span className="about-section-title">桌面快捷键</span>
                <div className="shortcuts-list">
                    <div className="shortcut-item"><span>播放 / 暂停</span><kbd>Space</kbd></div>
                    <div className="shortcut-item"><span>前后 20 分钟</span><kbd>← / →</kbd></div>
                    <div className="shortcut-item"><span>返回实时画面</span><kbd>L</kbd></div>
                    <div className="shortcut-item"><span>切换四宫格</span><kbd>G</kbd></div>
                    <div className="shortcut-item"><span>全屏开关</span><kbd>F</kbd></div>
                    <div className="shortcut-item"><span>关闭弹窗</span><kbd>Esc</kbd></div>
                </div>
            </div>

            <div className="about-section">
                <span className="about-section-title">项目信息</span>
                <div className="about-meta-list">
                    <div className="about-meta-row">
                        <span className="about-meta-label">实景数据</span>
                        <span className="about-meta-value">深圳市气象局 weather.121.com.cn</span>
                    </div>
                    <div className="about-meta-row">
                        <span className="about-meta-label">开源仓库</span>
                        <a
                            className="about-meta-value about-link"
                            href="https://github.com/OrangeSAM/sz-weather"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            OrangeSAM/sz-weather（刘一笔）
                        </a>
                    </div>
                </div>
                <div className="about-qr-codes">
                    <div className="qr-code-item">
                        <Image src="/gzh.jpg" alt="作者公众号二维码" width={96} height={96} />
                        <span>公众号</span>
                    </div>
                    <div className="qr-code-item">
                        <Image src="/wxh.png" alt="作者微信二维码" width={96} height={96} />
                        <span>微信</span>
                    </div>
                </div>
            </div>
        </dialog>
    );
}
