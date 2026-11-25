'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import WeatherBar from '@/components/WeatherBar';
import VideoPlayer from '@/components/VideoPlayer';
import VideoTimeline from '@/components/VideoTimeline';
import StationAtlas from '@/components/StationAtlas';
import MultiCamGrid from '@/components/MultiCamGrid';
import AboutPanel from '@/components/AboutPanel';
import {
    CAMERAS,
    getVideoTimestamp,
    getPreviousTimestamp,
    getNextTimestamp,
    formatVideoTimestamp,
    parseVideoTimestamp,
} from '@/lib/cameras';

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const EMPTY_SET = new Set();

export default function ObservatoryClient({
    initialCameraIndex = 0,
    initialTimestampStr = null,
    initialViewMode = 'single',
    initialNowMs,
}) {
    const initialParsedTimestamp = useMemo(() => {
        if (!initialTimestampStr) return null;
        const parsed = parseVideoTimestamp(initialTimestampStr);
        if (parsed && initialNowMs - parsed.getTime() <= 48 * 60 * 60 * 1000) {
            return parsed;
        }
        return null;
    }, [initialTimestampStr, initialNowMs]);

    const [currentCameraIndex, setCurrentCameraIndex] = useState(initialCameraIndex);
    const [viewMode, setViewMode] = useState(initialViewMode);
    const [isAboutOpen, setIsAboutOpen] = useState(false);

    const [isLive, setIsLive] = useState(!initialParsedTimestamp);
    const [requestedTimestamp, setRequestedTimestamp] = useState(initialParsedTimestamp);
    const [activeTimestamp, setActiveTimestamp] = useState(initialParsedTimestamp);
    const [playbackStatus, setPlaybackStatus] = useState(initialParsedTimestamp ? 'playback' : 'live');
    const [lockTimestamp, setLockTimestamp] = useState(true);

    const [availabilityState, setAvailabilityState] = useState({ cameraId: null, keys: EMPTY_SET });
    const [weatherNow, setWeatherNow] = useState(null);

    const currentCamera = CAMERAS[currentCameraIndex];
    const timeSuffix = currentCamera.timeSuffix || 19;
    const availableKeys =
        availabilityState.cameraId === currentCamera.id ? availabilityState.keys : EMPTY_SET;

    // 同步当前机位、回放时刻与视图模式到 URL Query，方便分享直达
    useEffect(() => {
        const params = new URLSearchParams();
        params.set('cam', String(currentCamera.id));
        if (!isLive && (requestedTimestamp || activeTimestamp)) {
            params.set('t', formatVideoTimestamp(requestedTimestamp || activeTimestamp));
        }
        if (viewMode === 'grid') {
            params.set('view', 'grid');
        }
        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState(null, '', nextUrl);
    }, [currentCamera.id, isLive, requestedTimestamp, activeTimestamp, viewMode]);

    // 获取当前点位过去 24h 分片可用性
    useEffect(() => {
        let cancelled = false;

        fetch(`/api/availability?cameraId=${currentCamera.id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (!cancelled && data && Array.isArray(data.available)) {
                    setAvailabilityState({
                        cameraId: currentCamera.id,
                        keys: new Set(data.available),
                    });
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [currentCamera.id]);

    const handleCameraSelect = useCallback(
        (index) => {
            if (index === currentCameraIndex) return;
            setCurrentCameraIndex(index);
            if (!isLive && lockTimestamp) {
                const pinned = requestedTimestamp || activeTimestamp;
                if (pinned) {
                    setRequestedTimestamp(pinned);
                    return;
                }
            }
            setIsLive(true);
            setRequestedTimestamp(null);
            setPlaybackStatus('live');
        },
        [currentCameraIndex, isLive, lockTimestamp, requestedTimestamp, activeTimestamp]
    );

    const handleSelectTimestamp = useCallback((ts) => {
        setRequestedTimestamp(ts);
        setActiveTimestamp(ts);
        setIsLive(false);
        setPlaybackStatus('playback');
    }, []);

    const handleBackToLive = useCallback(() => {
        setRequestedTimestamp(null);
        setIsLive(true);
        setPlaybackStatus('live');
    }, []);

    const handleZoomFromGrid = useCallback((cameraId, clipTs, keepHistory) => {
        const idx = CAMERAS.findIndex((c) => c.id === cameraId);
        if (idx >= 0) {
            setCurrentCameraIndex(idx);
        }
        if (keepHistory && clipTs) {
            setRequestedTimestamp(clipTs);
            setActiveTimestamp(clipTs);
            setIsLive(false);
            setPlaybackStatus('playback');
        } else {
            setRequestedTimestamp(null);
            setIsLive(true);
            setPlaybackStatus('live');
        }
        setViewMode('single');
    }, []);

    useEffect(() => {
        const onKeyDown = (e) => {
            if (isAboutOpen) return;
            if (e.target.closest('input, textarea, select, [contenteditable]')) return;

            if (e.key === 'l' || e.key === 'L') {
                handleBackToLive();
            } else if (e.key === 'g' || e.key === 'G') {
                setViewMode((m) => (m === 'single' ? 'grid' : 'single'));
            } else if (viewMode === 'single' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                if (e.target.closest('[role="toolbar"]')) return;
                e.preventDefault();
                const base = activeTimestamp || getVideoTimestamp(timeSuffix);
                const liveLimit = getVideoTimestamp(timeSuffix);
                if (e.key === 'ArrowLeft') {
                    const prev = getPreviousTimestamp(base);
                    if (Date.now() - prev.getTime() <= HOURS_24_MS) {
                        handleSelectTimestamp(prev);
                    }
                } else {
                    const next = getNextTimestamp(base);
                    if (next.getTime() >= liveLimit.getTime()) {
                        handleBackToLive();
                    } else {
                        handleSelectTimestamp(next);
                    }
                }
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isAboutOpen, viewMode, activeTimestamp, timeSuffix, handleBackToLive, handleSelectTimestamp]);

    return (
        <div className="observatory-shell">
            <a href="#main-stage" className="skip-link visually-hidden">
                跳至实景画面
            </a>

            <Header
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                playbackStatus={playbackStatus}
                activeTimestamp={activeTimestamp}
                onAboutOpen={() => setIsAboutOpen(true)}
            />

            <WeatherBar
                locationId={currentCamera.locationId}
                districtName={currentCamera.district}
                isLive={isLive}
                onWeatherLoad={setWeatherNow}
            />

            <main
                id="main-stage"
                className={`observatory-main ${viewMode === 'grid' ? 'grid-mode' : ''}`}
                tabIndex={-1}
            >
                {viewMode === 'grid' ? (
                    <MultiCamGrid
                        lockedTimestamp={activeTimestamp || requestedTimestamp}
                        isLive={isLive}
                        onZoomToCamera={handleZoomFromGrid}
                    />
                ) : (
                    <>
                        <div className="stage-column">
                            <VideoPlayer
                                cameraIndex={currentCameraIndex}
                                isLive={isLive}
                                requestedTimestamp={requestedTimestamp}
                                initialNowMs={initialNowMs}
                                availableKeys={availableKeys}
                                lockTimestamp={lockTimestamp}
                                weatherNow={weatherNow}
                                onToggleLockTimestamp={() => setLockTimestamp((v) => !v)}
                                onActiveTimestampChange={setActiveTimestamp}
                                onStatusChange={setPlaybackStatus}
                                onBackToLive={handleBackToLive}
                                onStepTimestamp={handleSelectTimestamp}
                            />

                            <VideoTimeline
                                cameraTimeSuffix={timeSuffix}
                                cameraId={currentCamera.id}
                                initialNowMs={initialNowMs}
                                isLive={isLive}
                                activeTimestamp={activeTimestamp}
                                availableKeys={availableKeys}
                                onSelectTimestamp={handleSelectTimestamp}
                                onBackToLive={handleBackToLive}
                            />
                        </div>

                        <StationAtlas
                            currentCameraIndex={currentCameraIndex}
                            onCameraSelect={handleCameraSelect}
                        />
                    </>
                )}
            </main>

            <AboutPanel isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
        </div>
    );
}
