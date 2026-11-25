'use client';

import { useRef, useEffect, useState, useCallback, useId } from 'react';
import {
    CAMERAS,
    getVideoTimestamp,
    getPreviousTimestamp,
    getNextTimestamp,
    getVideoUrl,
    formatDisplayTime,
    formatVideoTimestamp,
    formatRelativeTimestamp,
} from '@/lib/cameras';
import { exportWeatherPostcard } from '@/lib/postcard';

const MAX_LIVE_FALLBACK_STEPS = 3;
const FAILED_TIMESTAMP_COOLDOWN_MS = 180000;
const PLAYBACK_RATES = [1, 2, 4];

/**
 * VideoPlayer 组件 - 双缓冲无缝切换播放器 + 视频角标播控 + 4按钮单行气象工具栏
 */
export default function VideoPlayer({
    cameraIndex,
    isLive,
    requestedTimestamp,
    initialNowMs,
    availableKeys,
    lockTimestamp,
    weatherNow,
    onToggleLockTimestamp,
    onActiveTimestampChange,
    onStatusChange,
    onBackToLive,
    onStepTimestamp,
}) {
    const camera = CAMERAS[cameraIndex];
    const timeSuffix = camera.timeSuffix || 19;
    const videoStageId = useId();

    const videoElsRef = useRef([null, null]);
    const toolbarRef = useRef(null);

    const [activeSlot, setActiveSlot] = useState(0);
    const [slotUrls, setSlotUrls] = useState(['', '']);
    const [hasFirstFrame, setHasFirstFrame] = useState(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isExportingPostcard, setIsExportingPostcard] = useState(false);
    const [liveAnnouncement, setLiveAnnouncement] = useState('');

    const [loadedTimestamp, setLoadedTimestamp] = useState(() =>
        requestedTimestamp || getVideoTimestamp(timeSuffix, new Date(initialNowMs))
    );

    const pendingSlotRef = useRef(0);
    const pendingTimestampRef = useRef(loadedTimestamp);
    const retryCountRef = useRef(0);
    const failedLatestRef = useRef({ key: null, at: 0 });
    const activeSlotRef = useRef(0);

    useEffect(() => {
        activeSlotRef.current = activeSlot;
    }, [activeSlot]);

    useEffect(() => {
        const el = videoElsRef.current[activeSlot];
        if (el) {
            el.playbackRate = playbackRate;
        }
    }, [playbackRate, activeSlot]);

    useEffect(() => {
        const bar = toolbarRef.current;
        if (!bar || 'focusGroup' in HTMLElement.prototype) return;

        const getItems = () => Array.from(bar.querySelectorAll('button'));
        const items = getItems();
        if (items.length === 0) return;

        items.forEach((btn, idx) => {
            btn.tabIndex = idx === 0 ? 0 : -1;
        });

        const handleFocusIn = (e) => {
            const list = getItems();
            if (!list.includes(e.target)) return;
            list.forEach((btn) => {
                btn.tabIndex = btn === e.target ? 0 : -1;
            });
        };

        const handleKeyDown = (e) => {
            const list = getItems();
            const idx = list.indexOf(document.activeElement);
            if (idx === -1) return;

            let nextIdx = -1;
            if (e.key === 'ArrowRight') nextIdx = (idx + 1) % list.length;
            else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + list.length) % list.length;
            else if (e.key === 'Home') nextIdx = 0;
            else if (e.key === 'End') nextIdx = list.length - 1;

            if (nextIdx >= 0) {
                e.preventDefault();
                list[nextIdx].focus();
            }
        };

        bar.addEventListener('focusin', handleFocusIn);
        bar.addEventListener('keydown', handleKeyDown);
        return () => {
            bar.removeEventListener('focusin', handleFocusIn);
            bar.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const loadClip = useCallback(
        (timestamp, { preserveFrame = true, resetRetry = true } = {}) => {
            if (!timestamp) return;
            if (resetRetry) {
                retryCountRef.current = 0;
            }
            const targetUrl = getVideoUrl(camera, timestamp);
            const targetSlot = preserveFrame ? (activeSlotRef.current === 0 ? 1 : 0) : activeSlotRef.current;

            pendingSlotRef.current = targetSlot;
            pendingTimestampRef.current = timestamp;

            if (!preserveFrame) {
                setHasFirstFrame(false);
            }
            setIsBuffering(true);
            setHasError(false);

            setSlotUrls((prev) => {
                if (prev[targetSlot] === targetUrl) {
                    const el = videoElsRef.current[targetSlot];
                    if (el) {
                        el.currentTime = 0;
                        el.play().catch(() => {});
                    }
                    return prev;
                }
                const next = [...prev];
                next[targetSlot] = targetUrl;
                return next;
            });
        },
        [camera]
    );

    const targetTimeKey = !isLive && requestedTimestamp ? requestedTimestamp.getTime() : null;

    useEffect(() => {
        let cancelled = false;
        Promise.resolve().then(() => {
            if (cancelled) return;
            failedLatestRef.current = { key: null, at: 0 };
            const target = targetTimeKey ? new Date(targetTimeKey) : getVideoTimestamp(timeSuffix);
            loadClip(target, { preserveFrame: false, resetRetry: true });
        });
        return () => {
            cancelled = true;
        };
    }, [camera.id, isLive, targetTimeKey, timeSuffix, loadClip]);

    useEffect(() => {
        if (!isLive) return;

        const timer = setInterval(() => {
            if (isBuffering || hasError) return;
            const latest = getVideoTimestamp(timeSuffix);
            const latestKey = formatVideoTimestamp(latest);
            const cooldownActive =
                failedLatestRef.current.key === latestKey &&
                Date.now() - failedLatestRef.current.at < FAILED_TIMESTAMP_COOLDOWN_MS;

            if (latest.getTime() > loadedTimestamp.getTime() && !cooldownActive) {
                loadClip(latest, { preserveFrame: true, resetRetry: true });
            }
        }, 20000);

        return () => clearInterval(timer);
    }, [isLive, timeSuffix, isBuffering, hasError, loadedTimestamp, loadClip]);

    useEffect(() => {
        const onVisChange = () => {
            const el = videoElsRef.current[activeSlotRef.current];
            if (!el) return;
            if (document.hidden) {
                el.pause();
            } else if (!isPaused) {
                el.play().catch(() => {});
            }
        };
        document.addEventListener('visibilitychange', onVisChange);
        return () => document.removeEventListener('visibilitychange', onVisChange);
    }, [isPaused]);

    const handleCanPlay = (slotIndex) => {
        if (slotIndex !== pendingSlotRef.current) return;

        const nextTs = pendingTimestampRef.current;
        const el = videoElsRef.current[slotIndex];
        const oldSlot = slotIndex === 0 ? 1 : 0;
        const oldEl = videoElsRef.current[oldSlot];

        if (oldEl && oldSlot !== slotIndex) {
            oldEl.pause();
        }

        if (el) {
            el.playbackRate = playbackRate;
            if (!isPaused) {
                el.play().catch(() => {});
            }
        }

        setActiveSlot(slotIndex);
        setHasFirstFrame(true);
        setIsBuffering(false);
        setHasError(false);
        setLoadedTimestamp(nextTs);

        if (onActiveTimestampChange) {
            onActiveTimestampChange(nextTs);
        }

        if (onStatusChange) {
            if (!isLive) {
                onStatusChange('playback');
            } else if (retryCountRef.current > 0) {
                onStatusChange('delayed');
            } else {
                onStatusChange('live');
            }
        }
    };

    const handleVideoError = (slotIndex) => {
        if (slotIndex !== pendingSlotRef.current) return;

        const failedTs = pendingTimestampRef.current;
        if (isLive) {
            if (retryCountRef.current === 0) {
                failedLatestRef.current = {
                    key: formatVideoTimestamp(failedTs),
                    at: Date.now(),
                };
            }
            if (retryCountRef.current < MAX_LIVE_FALLBACK_STEPS) {
                retryCountRef.current += 1;
                const fallbackTs = getPreviousTimestamp(failedTs);
                loadClip(fallbackTs, { preserveFrame: hasFirstFrame, resetRetry: false });
                return;
            }
        } else if (retryCountRef.current < 2) {
            retryCountRef.current += 1;
            const liveLimit = getVideoTimestamp(timeSuffix);
            const nextCandidate = getNextTimestamp(failedTs);
            if (nextCandidate.getTime() <= liveLimit.getTime()) {
                loadClip(nextCandidate, { preserveFrame: hasFirstFrame, resetRetry: false });
                return;
            }
        }

        setIsBuffering(false);
        setHasError(true);
        if (onStatusChange) {
            onStatusChange('error');
        }
    };

    const handleEnded = (slotIndex) => {
        if (slotIndex !== activeSlotRef.current || isLive) return;

        const liveLimit = getVideoTimestamp(timeSuffix);
        let candidate = getNextTimestamp(loadedTimestamp);

        if (availableKeys && availableKeys.size > 0) {
            while (
                candidate.getTime() <= liveLimit.getTime() &&
                !availableKeys.has(formatVideoTimestamp(candidate))
            ) {
                candidate = getNextTimestamp(candidate);
            }
        }

        if (candidate.getTime() >= liveLimit.getTime()) {
            onBackToLive();
            setLiveAnnouncement('延时回放已推进至最新实时画面');
            return;
        }

        if (onStepTimestamp) {
            onStepTimestamp(candidate);
        }
    };

    const togglePlayPause = useCallback(() => {
        const el = videoElsRef.current[activeSlotRef.current];
        if (!el) return;
        if (el.paused) {
            el.play().catch(() => {});
            setIsPaused(false);
            setLiveAnnouncement('继续播放');
        } else {
            el.pause();
            setIsPaused(true);
            setLiveAnnouncement('已暂停');
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        const wrapper = document.getElementById(videoStageId);
        if (!wrapper) return;
        if (!document.fullscreenElement) {
            wrapper.requestFullscreen?.() || wrapper.webkitRequestFullscreen?.();
        } else {
            document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        }
    }, [videoStageId]);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.target.closest('input, textarea, select, button, dialog')) return;
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                togglePlayPause();
            } else if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [togglePlayPause, toggleFullscreen]);

    const cyclePlaybackRate = () => {
        const idx = PLAYBACK_RATES.indexOf(playbackRate);
        const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
        setPlaybackRate(next);
        setLiveAnnouncement(`播放倍速已切换为 ${next}x`);
    };

    const handleDownloadVideo = () => {
        const videoUrl = getVideoUrl(camera, loadedTimestamp);
        const fileName = `深圳天气_${camera.name}_${formatVideoTimestamp(loadedTimestamp)}.mp4`;
        const proxyUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&filename=${encodeURIComponent(fileName)}`;

        const link = document.createElement('a');
        link.href = proxyUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setLiveAnnouncement(`开始下载 ${camera.name} 视频片段`);
    };

    const handleExportPostcard = async () => {
        if (isExportingPostcard) return;
        setIsExportingPostcard(true);
        setLiveAnnouncement('正在生成实景明信片...');
        try {
            const videoEl = videoElsRef.current[activeSlotRef.current];
            const videoUrl = getVideoUrl(camera, loadedTimestamp);
            const name = await exportWeatherPostcard({
                videoEl,
                videoUrl,
                camera,
                timestamp: loadedTimestamp,
                weather: weatherNow,
            });
            setLiveAnnouncement(`已保存实景明信片：${name}`);
        } catch (err) {
            console.error('[Postcard]', err);
            setLiveAnnouncement('生成实景明信片失败，请稍后重试');
        } finally {
            setIsExportingPostcard(false);
        }
    };

    const handleRetry = () => {
        failedLatestRef.current = { key: null, at: 0 };
        const target = !isLive && requestedTimestamp ? requestedTimestamp : getVideoTimestamp(timeSuffix);
        loadClip(target, { preserveFrame: false, resetRetry: true });
    };

    return (
        <section className="video-stage-card" aria-label="实时视频观测台">
            <div className="video-wrapper" id={videoStageId} onDoubleClick={toggleFullscreen}>
                {[0, 1].map((slot) => (
                    <video
                        key={slot}
                        ref={(el) => {
                            videoElsRef.current[slot] = el;
                        }}
                        className={`video-layer ${activeSlot === slot ? 'active' : ''}`}
                        src={slotUrls[slot] || undefined}
                        autoPlay
                        playsInline
                        loop={isLive}
                        muted
                        preload="auto"
                        onCanPlay={() => handleCanPlay(slot)}
                        onError={() => handleVideoError(slot)}
                        onEnded={() => handleEnded(slot)}
                    />
                ))}

                <div className="video-hud-top">
                    <span className="hud-badge">
                        {camera.district} · {camera.name}（{camera.bearingLabel}）
                    </span>
                    <span className="hud-badge">
                        {formatRelativeTimestamp(loadedTimestamp)}
                        {playbackRate > 1 ? ` · ${playbackRate}x` : ''}
                    </span>
                </div>

                {/* 画面底部居中播控悬浮胶囊（避开左下水印与右下时间角标） */}
                <div className="video-hud-bottom" role="group" aria-label="画面播控">
                    <button
                        type="button"
                        className="hud-control-btn"
                        aria-pressed={isPaused}
                        onClick={togglePlayPause}
                        aria-label={isPaused ? '继续播放' : '暂停画面'}
                        title={isPaused ? '继续播放 (Space)' : '暂停画面 (Space)'}
                    >
                        {isPaused ? (
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        ) : (
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                            </svg>
                        )}
                    </button>
                    <button
                        type="button"
                        className="hud-control-btn"
                        onClick={toggleFullscreen}
                        aria-label="全屏显示"
                        title="全屏 (F)"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {!hasFirstFrame && isBuffering && !hasError && (
                    <div className="loading-overlay" aria-label="视频加载中">
                        <div className="loading-spinner" aria-hidden="true">
                            <span className="spinner-ring" />
                            <span className="spinner-ring" />
                        </div>
                        <span className="loading-text">正在接入 {camera.name} 实时画面...</span>
                    </div>
                )}

                {hasError && (
                    <div className="error-overlay" role="alert">
                        <div className="error-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M12 9v3.5m0 3.5h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" strokeLinecap="round" />
                            </svg>
                        </div>
                        <span className="error-text">当前分片暂不可用（{formatDisplayTime(loadedTimestamp)}）</span>
                        <button type="button" className="retry-btn" onClick={handleRetry}>
                            重新加载
                        </button>
                    </div>
                )}
            </div>

            {/* 单行四键气象操作工具栏：移动端四等分一行，桌面端舒展对齐 */}
            <div
                ref={toolbarRef}
                className="player-toolbar"
                role="toolbar"
                focusgroup="toolbar wrap"
                aria-label="天象回放与导出工具"
                aria-controls={videoStageId}
            >
                <div className="toolbar-group" role="group" aria-label="时间控制">
                    <button
                        type="button"
                        className="tool-btn"
                        onClick={cyclePlaybackRate}
                        title="切换延时播放倍速"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M13 17l5-5-5-5M6 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{playbackRate}x 倍速</span>
                    </button>

                    <button
                        type="button"
                        className="tool-btn"
                        aria-pressed={lockTimestamp}
                        onClick={() => {
                            onToggleLockTimestamp();
                            setLiveAnnouncement(lockTimestamp ? '已关闭跨机位时刻锁定' : '已开启跨机位时刻锁定');
                        }}
                        title="切换机位时保持当前回放时刻"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="5" y="11" width="14" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                        <span>锁定时刻</span>
                    </button>
                </div>

                <span className="toolbar-sep" role="separator" aria-orientation="vertical" />

                <div className="toolbar-group" role="group" aria-label="画面导出">
                    <button
                        type="button"
                        className="tool-btn primary"
                        aria-disabled={isExportingPostcard ? 'true' : undefined}
                        onClick={handleExportPostcard}
                        title="导出带点位时间与天气水印的实景明信片"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <circle cx="8.5" cy="10.5" r="1.5" />
                            <path d="M21 15l-5-5L5 19" />
                        </svg>
                        <span>{isExportingPostcard ? '生成中' : '明信片'}</span>
                    </button>

                    <button
                        type="button"
                        className="tool-btn"
                        onClick={handleDownloadVideo}
                        title="下载当前 20 分钟原始 MP4 片段"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>下载</span>
                    </button>
                </div>
            </div>

            <p role="status" className="visually-hidden">
                {liveAnnouncement}
            </p>

            <div className="station-meta-strip">
                <div className="station-meta-head">
                    <div className="station-heading">
                        <h1 className="station-name">{camera.name}</h1>
                        <span className="station-district-badge">{camera.district}</span>
                        <span className="station-bearing-badge">
                            {camera.bearingLabel} {String(camera.bearing).padStart(3, '0')}°
                        </span>
                    </div>
                    <div className="station-tags">
                        {camera.tags.map((tag) => (
                            <span key={tag} className="station-tag">{tag}</span>
                        ))}
                    </div>
                </div>
                <p className="station-description">{camera.description}</p>
            </div>
        </section>
    );
}
