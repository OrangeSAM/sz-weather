'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    getAllTimestampsInRange,
    formatDisplayTime,
    formatVideoTimestamp,
    formatRelativeTimestamp,
    shouldShowTimeLabel,
    getSpecialMoment,
    getSolarTimes,
    toShenzhenParts,
    SUNRISE_CAMERAS,
    SUNSET_CAMERAS,
} from '@/lib/cameras';

const ITEM_WIDTH = 64;
const HOURS_24_MS = 24 * 60 * 60 * 1000;

function getSkyBandColor(timestamp, solar) {
    const t = timestamp.getTime();
    if (t < solar.dawn.getTime() || t > solar.dusk.getTime()) {
        return '#1e2c44';
    }
    if (t >= solar.dawn.getTime() && t <= solar.goldenMorningEnd.getTime()) {
        return '#d98a4c';
    }
    if (t >= solar.goldenEveningStart.getTime() && t <= solar.dusk.getTime()) {
        return '#cc6b49';
    }
    return '#5d95bf';
}

/**
 * VideoTimeline 组件 - 24 小时昼夜光谱时间轴与可拖拽延时控制尺
 */
export default function VideoTimeline({
    cameraTimeSuffix,
    cameraId,
    initialNowMs,
    isLive,
    activeTimestamp,
    availableKeys,
    onSelectTimestamp,
    onBackToLive,
}) {
    const [dragOffsetX, setDragOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    const wrapperRef = useRef(null);
    const startXRef = useRef(0);
    const baseOffsetRef = useRef(0);
    const didDragRef = useRef(false);

    const timestamps = useMemo(() => {
        const endTime = new Date(initialNowMs);
        const startTime = new Date(endTime.getTime() - HOURS_24_MS);
        return getAllTimestampsInRange(startTime, endTime, cameraTimeSuffix);
    }, [initialNowMs, cameraTimeSuffix]);

    const solarByDate = useMemo(() => {
        const map = new Map();
        timestamps.forEach((ts) => {
            const { dateKey } = toShenzhenParts(ts);
            if (!map.has(dateKey)) {
                map.set(dateKey, getSolarTimes(ts));
            }
        });
        return map;
    }, [timestamps]);

    useEffect(() => {
        const updateWidth = () => {
            if (wrapperRef.current) {
                setContainerWidth(wrapperRef.current.offsetWidth);
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const getMaxOffsetX = useCallback(() => {
        return Math.max(0, timestamps.length * ITEM_WIDTH - containerWidth);
    }, [timestamps.length, containerWidth]);

    const getOffsetXForIndex = useCallback(
        (index) => {
            if (containerWidth <= 0) return 0;
            const centerX = containerWidth / 2;
            const itemCenterX = index * ITEM_WIDTH + ITEM_WIDTH / 2;
            return Math.max(0, Math.min(getMaxOffsetX(), itemCenterX - centerX));
        },
        [containerWidth, getMaxOffsetX]
    );

    const getIndexFromOffsetX = useCallback(
        (offset) => {
            if (timestamps.length === 0) return 0;
            const maxOffset = getMaxOffsetX();
            if (offset <= 0) return 0;
            if (offset >= maxOffset) return timestamps.length - 1;
            const centerX = containerWidth / 2;
            const itemCenterX = centerX + offset;
            const index = Math.round((itemCenterX - ITEM_WIDTH / 2) / ITEM_WIDTH);
            return Math.max(0, Math.min(timestamps.length - 1, index));
        },
        [containerWidth, timestamps.length, getMaxOffsetX]
    );

    const selectedIndex = useMemo(() => {
        if (timestamps.length === 0) return -1;
        if (isLive || !activeTimestamp) return timestamps.length - 1;
        const targetKey = formatVideoTimestamp(activeTimestamp);
        const exact = timestamps.findIndex((t) => formatVideoTimestamp(t) === targetKey);
        if (exact >= 0) return exact;
        let closest = timestamps.length - 1;
        let minDiff = Infinity;
        timestamps.forEach((t, idx) => {
            const diff = Math.abs(t.getTime() - activeTimestamp.getTime());
            if (diff < minDiff) {
                minDiff = diff;
                closest = idx;
            }
        });
        return closest;
    }, [timestamps, isLive, activeTimestamp]);

    const settledOffsetX = selectedIndex >= 0 ? getOffsetXForIndex(selectedIndex) : 0;
    const displayOffsetX = isDragging ? dragOffsetX : settledOffsetX;

    const commitSelection = (index) => {
        const ts = timestamps[index];
        if (!ts) return;
        if (index === timestamps.length - 1) {
            onBackToLive();
        } else {
            onSelectTimestamp(ts);
        }
    };

    const handlePointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        setIsDragging(true);
        didDragRef.current = false;
        startXRef.current = e.clientX;
        baseOffsetRef.current = settledOffsetX;
        setDragOffsetX(settledOffsetX);
    };

    const handlePointerMove = (e) => {
        if (!isDragging) return;
        const deltaX = startXRef.current - e.clientX;
        if (Math.abs(deltaX) > 4) didDragRef.current = true;

        let next = baseOffsetRef.current + deltaX;
        const maxOffset = getMaxOffsetX();
        if (next < 0) next = next * 0.3;
        else if (next > maxOffset) next = maxOffset + (next - maxOffset) * 0.3;
        setDragOffsetX(next);
    };

    const handlePointerUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        if (didDragRef.current) {
            const centerIdx = getIndexFromOffsetX(dragOffsetX);
            commitSelection(centerIdx);
        }
    };

    const jumpToSpecial = (type) => {
        if (timestamps.length === 0) return;
        const { sunrise, sunset } = getSolarTimes(new Date(initialNowMs));
        let target = type === 'sunrise' ? sunrise : sunset;
        if (target.getTime() > timestamps[timestamps.length - 1].getTime()) {
            const prevDay = new Date(target.getTime() - 24 * 60 * 60 * 1000);
            const prevSolar = getSolarTimes(prevDay);
            target = type === 'sunrise' ? prevSolar.sunrise : prevSolar.sunset;
        }
        const startOffset = target.getTime() - 20 * 60 * 1000;
        let closest = 0;
        let minDiff = Infinity;
        timestamps.forEach((t, i) => {
            const diff = Math.abs(t.getTime() - startOffset);
            if (diff < minDiff) {
                minDiff = diff;
                closest = i;
            }
        });
        onSelectTimestamp(timestamps[closest]);
    };

    const jumpPast3Hours = () => {
        if (timestamps.length === 0) return;
        const target = timestamps[timestamps.length - 1].getTime() - 3 * 60 * 60 * 1000;
        let closest = 0;
        let minDiff = Infinity;
        timestamps.forEach((t, i) => {
            const diff = Math.abs(t.getTime() - target);
            if (diff < minDiff) {
                minDiff = diff;
                closest = i;
            }
        });
        onSelectTimestamp(timestamps[closest]);
    };

    const currentLabel = activeTimestamp
        ? formatRelativeTimestamp(activeTimestamp)
        : timestamps.length > 0
            ? formatRelativeTimestamp(timestamps[timestamps.length - 1])
            : '--:--';

    return (
        <section className="timeline-card" aria-label="24小时天色回放时间轴">
            <div className="timeline-header">
                <div className="timeline-time-readout">
                    <span className="timeline-current">{currentLabel}</span>
                    <span className="timeline-sub-hint">
                        {isLive ? '当前为最新实时分片' : '按时间正序自动连播'}
                    </span>
                </div>

                <div className="timeline-quick-actions">
                    {SUNRISE_CAMERAS.includes(cameraId) && (
                        <button
                            type="button"
                            className="timeline-chip-btn"
                            onClick={() => jumpToSpecial('sunrise')}
                            title="从最近一次日出前 20 分钟开始连播"
                        >
                            🌅 日出连播
                        </button>
                    )}
                    {SUNSET_CAMERAS.includes(cameraId) && (
                        <button
                            type="button"
                            className="timeline-chip-btn"
                            onClick={() => jumpToSpecial('sunset')}
                            title="从最近一次日落前 20 分钟开始连播"
                        >
                            🌄 日落连播
                        </button>
                    )}
                    <button
                        type="button"
                        className="timeline-chip-btn"
                        onClick={jumpPast3Hours}
                        title="回看过去 3 小时天气变化"
                    >
                        ▶ 过去3小时
                    </button>
                    <button
                        type="button"
                        className={`timeline-chip-btn live-return ${isLive ? 'active' : ''}`}
                        onClick={onBackToLive}
                    >
                        {isLive ? '● 实时观测中' : '↺ 返回实时'}
                    </button>
                </div>
            </div>

            <div className="timeline-wheel-wrapper" ref={wrapperRef}>
                <div className="wheel-center-indicator" aria-hidden="true" />
                <div
                    className={`timeline-wheel-strip ${isDragging ? 'dragging' : ''}`}
                    style={{ transform: `translateX(-${displayOffsetX}px)` }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                >
                    {timestamps.map((ts, index) => {
                        const compactKey = formatVideoTimestamp(ts);
                        const { dateKey } = toShenzhenParts(ts);
                        const solar = solarByDate.get(dateKey) || getSolarTimes(ts);
                        const bandColor = getSkyBandColor(ts, solar);
                        const specialMoment = getSpecialMoment(ts, cameraId);
                        const showTime = shouldShowTimeLabel(index);
                        const isSelected = index === selectedIndex;

                        let availStatus = 'unknown';
                        if (availableKeys && availableKeys.size > 0) {
                            availStatus = availableKeys.has(compactKey) ? 'available' : 'missing';
                        }

                        return (
                            <button
                                key={compactKey}
                                type="button"
                                className={`wheel-item ${isSelected ? 'selected' : ''}`}
                                style={{ inlineSize: ITEM_WIDTH }}
                                aria-label={`${formatRelativeTimestamp(ts)}${specialMoment === 'sunrise' ? ' 日出时段' : specialMoment === 'sunset' ? ' 日落时段' : ''}`}
                                aria-pressed={isSelected}
                                onClick={() => {
                                    if (!didDragRef.current) {
                                        commitSelection(index);
                                    }
                                }}
                            >
                                <span
                                    className="wheel-sky-band"
                                    style={{ backgroundColor: bandColor }}
                                    aria-hidden="true"
                                />
                                <span className="wheel-item-label-slot">
                                    {specialMoment ? (
                                        <span className="wheel-item-special" aria-hidden="true">
                                            {specialMoment === 'sunrise' ? '🌅' : '🌄'}
                                        </span>
                                    ) : showTime ? (
                                        <span className="wheel-item-time">{formatDisplayTime(ts)}</span>
                                    ) : (
                                        <span className="wheel-item-dot" aria-hidden="true" />
                                    )}
                                </span>
                                <span
                                    className="wheel-item-avail"
                                    data-status={availStatus}
                                    aria-hidden="true"
                                />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="timeline-legend">
                <div className="legend-items">
                    <span className="legend-item">
                        <span className="legend-swatch available" aria-hidden="true" />
                        <span>已探测分片</span>
                    </span>
                    <span className="legend-item">
                        <span className="legend-swatch missing" aria-hidden="true" />
                        <span>暂缺分片</span>
                    </span>
                </div>
                <span className="timeline-legend-hint">拖动或点按时刻跳转 · 顶部色条表示昼夜天色</span>
            </div>
        </section>
    );
}
