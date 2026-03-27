'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
    CAMERAS,
    getVideoTimestamp,
    getPreviousTimestamp,
    getVideoUrl,
    formatDisplayTime,
    formatVideoTimestamp
} from '@/lib/cameras';

/**
 * VideoPlayer 组件 - 视频播放器
 */
export default function VideoPlayer({ currentCameraIndex, onTimeUpdate, selectedTimestamp, onPlaybackComplete, onBackToLive }) {
    const videoRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [currentVideoTime, setCurrentVideoTime] = useState(null);
    const [isPlayingHistory, setIsPlayingHistory] = useState(false);
    const retryCountRef = useRef(0);
    const currentUrlRef = useRef(null); // 追踪当前正在加载的 URL
    const isRetryingRef = useRef(false); // 标记是否正在重试
    const onTimeUpdateRef = useRef(onTimeUpdate); // 用 ref 保存，避免触发 useEffect
    const MAX_RETRIES = 2;
    const selectedTimestampRef = useRef(null); // 记录选中的历史时间

    // 保持 ref 最新
    useEffect(() => {
        onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    // 切换到历史模式 / 返回直播
    useEffect(() => {
        if (selectedTimestamp) {
            selectedTimestampRef.current = selectedTimestamp;
            setIsPlayingHistory(true);
            retryCountRef.current = 0;
            loadVideo(selectedTimestamp);
        } else if (selectedTimestamp === null && isPlayingHistory) {
            selectedTimestampRef.current = null;
            setIsPlayingHistory(false);
            retryCountRef.current = 0;
            const camera = CAMERAS[currentCameraIndex];
            const timeSuffix = camera.timeSuffix || 19;
            loadVideo(getVideoTimestamp(timeSuffix));
        }
    }, [selectedTimestamp]);

    // 加载视频
    const loadVideo = useCallback((timestamp, isRetry = false) => {
        const camera = CAMERAS[currentCameraIndex];
        const videoUrl = getVideoUrl(camera, timestamp);

        // 记录当前正在加载的 URL
        currentUrlRef.current = videoUrl;

        console.log(`[Video] Loading: ${camera.name} - ${videoUrl} (retry: ${retryCountRef.current})`);

        setIsLoading(true);
        setHasError(false);
        setCurrentVideoTime(timestamp);
        isRetryingRef.current = isRetry;

        if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(formatDisplayTime(timestamp));
        }

        if (videoRef.current) {
            videoRef.current.src = videoUrl;
            videoRef.current.load();
        }
    }, [currentCameraIndex]);

    // 初始化或切换摄像头时加载视频
    useEffect(() => {
        retryCountRef.current = 0;
        const camera = CAMERAS[currentCameraIndex];
        const timeSuffix = camera.timeSuffix || 19;
        const timestamp = getVideoTimestamp(timeSuffix);
        loadVideo(timestamp);
    }, [currentCameraIndex, loadVideo]);

    // 定时检查新视频
    useEffect(() => {
        // 如果正在播放历史视频，不自动刷新
        if (isPlayingHistory) {
            return;
        }

        const interval = setInterval(() => {
            // 如果正在加载、已经出错或正在重试，不检查新视频
            if (isLoading || hasError || isRetryingRef.current) {
                return;
            }

            const camera = CAMERAS[currentCameraIndex];
            const timeSuffix = camera.timeSuffix || 19;
            const newTimestamp = getVideoTimestamp(timeSuffix);

            if (currentVideoTime && newTimestamp.getTime() !== currentVideoTime.getTime()) {
                console.log('[AutoRefresh] New video available, reloading...');
                retryCountRef.current = 0;
                loadVideo(newTimestamp);
            }
        }, 20000);

        return () => clearInterval(interval);
    }, [currentCameraIndex, currentVideoTime, loadVideo, isLoading, hasError, isPlayingHistory]);

    // 视频事件处理
    const handleCanPlay = () => {
        isRetryingRef.current = false;
        setIsLoading(false);
        setHasError(false);
        if (videoRef.current) {
            videoRef.current.play().catch(err => {
                console.log('[Video] Autoplay prevented:', err.message);
            });
        }
    };

    const handleError = () => {
        // 检查是否是当前 URL 的错误（忽略被 cancel 的请求）
        const currentUrl = currentUrlRef.current;
        const videoSrc = videoRef.current?.src || '';

        if (!videoSrc.includes(currentUrl?.split('/').pop())) {
            console.log('[Video] Ignoring canceled/aborted request');
            return;
        }

        console.error('[Video] Error, retryCount:', retryCountRef.current);

        if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            const camera = CAMERAS[currentCameraIndex];
            const timeSuffix = camera.timeSuffix || 19;

            // 如果 currentVideoTime 为空（首次加载失败），重新获取当前时间
            const timestamp = currentVideoTime || getVideoTimestamp(timeSuffix);
            const prevTimestamp = getPreviousTimestamp(timestamp, timeSuffix);

            console.log(`[Video] Retrying with previous timestamp:`, prevTimestamp, 'format:', formatVideoTimestamp(prevTimestamp));
            loadVideo(prevTimestamp, true);
        } else {
            console.log('[Video] Max retries reached, showing error');
            setIsLoading(false);
            setHasError(true);
        }
    };

    const handleLoadedData = () => {
        setIsLoading(false);
    };

    // 视频播放完毕，自动播放下一个时间点
    const handleEnded = () => {
        if (!isPlayingHistory) return;

        const currentTime = selectedTimestampRef.current;
        if (!currentTime) return;

        const camera = CAMERAS[currentCameraIndex];
        const timeSuffix = camera.timeSuffix || 19;

        // 获取上一个时间点
        const prevTimestamp = getPreviousTimestamp(currentTime, timeSuffix);

        // 检查是否已经播放到最早的时间点（24小时前）
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (prevTimestamp.getTime() < oneDayAgo.getTime()) {
            console.log('[Playback] Reached earliest available timestamp');
            return;
        }

        console.log('[Playback] Playing next timestamp:', prevTimestamp);
        selectedTimestampRef.current = prevTimestamp;
        loadVideo(prevTimestamp);

        // 通知父组件
        if (onPlaybackComplete) {
            onPlaybackComplete(prevTimestamp);
        }
    };

    // 返回直播模式
    const handleBackToLive = useCallback(() => {
        setIsPlayingHistory(false);
        selectedTimestampRef.current = null;
        retryCountRef.current = 0;

        const camera = CAMERAS[currentCameraIndex];
        const timeSuffix = camera.timeSuffix || 19;
        const timestamp = getVideoTimestamp(timeSuffix);
        loadVideo(timestamp);

        if (onBackToLive) {
            onBackToLive();
        }
    }, [currentCameraIndex, loadVideo, onBackToLive]);

    // 页面可见性变化时暂停/恢复
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                videoRef.current?.pause();
            } else {
                videoRef.current?.play().catch(() => {});
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // 全屏切换
    const toggleFullscreen = () => {
        const wrapper = document.querySelector('.video-wrapper');

        if (!document.fullscreenElement) {
            if (wrapper?.requestFullscreen) {
                wrapper.requestFullscreen();
            } else if (wrapper?.webkitRequestFullscreen) {
                wrapper.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    };

    const handleRetry = () => {
        retryCountRef.current = 0;
        const camera = CAMERAS[currentCameraIndex];
        const timeSuffix = camera.timeSuffix || 19;
        const timestamp = getVideoTimestamp(timeSuffix);
        loadVideo(timestamp);
    };

    return (
        <div className="video-container">
            <div className="video-wrapper">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    loop={!isPlayingHistory}
                    muted
                    preload="auto"
                    onCanPlay={handleCanPlay}
                    onError={handleError}
                    onLoadedData={handleLoadedData}
                    onEnded={handleEnded}
                    onDoubleClick={toggleFullscreen}
                >
                    您的浏览器不支持 video 标签
                </video>

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="loading-overlay">
                        <div className="loading-spinner">
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                            <div className="spinner-ring"></div>
                        </div>
                        <span className="loading-text">加载视频中...</span>
                    </div>
                )}

                {/* Error Overlay */}
                {hasError && (
                    <div className="error-overlay">
                        <div className="error-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                        </div>
                        <span className="error-text">视频加载失败</span>
                        <button className="retry-btn" onClick={handleRetry}>重试</button>
                    </div>
                )}

            </div>
        </div>
    );
}
