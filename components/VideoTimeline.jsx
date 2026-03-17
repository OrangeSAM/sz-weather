'use client';

import { useState, useEffect, useRef } from 'react';
import { getAllTimestampsInRange, formatDisplayTime } from '@/lib/cameras';

const HOURS_24_MS = 24 * 60 * 60 * 1000;

export default function VideoTimeline({ cameraTimeSuffix, onSelectTimestamp, onBackToLive }) {
    const [timestamps, setTimestamps] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [showHint, setShowHint] = useState(true);
    const trackRef = useRef(null);

    // 生成24小时时间范围内的所有时间点
    useEffect(() => {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - HOURS_24_MS);

        const times = getAllTimestampsInRange(startTime, endTime, cameraTimeSuffix);
        setTimestamps(times);

        // 默认选中最新时间点
        if (times.length > 0) {
            setSelectedIndex(times.length - 1);
        }
    }, [cameraTimeSuffix]);

    const handleTrackClick = (e) => {
        if (!trackRef.current || timestamps.length === 0) return;

        const rect = trackRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));

        const index = Math.floor(percentage * (timestamps.length - 1));
        const clampedIndex = Math.max(0, Math.min(timestamps.length - 1, index));

        setSelectedIndex(clampedIndex);
        setShowHint(false);

        const timestamp = timestamps[clampedIndex];
        if (timestamp) {
            onSelectTimestamp(timestamp);
        }
    };

    const handleLiveClick = () => {
        setSelectedIndex(-1);
        setShowHint(true);
        onBackToLive();
    };

    const getSelectedPosition = () => {
        if (selectedIndex < 0) return 100;
        return (selectedIndex / Math.max(1, timestamps.length - 1)) * 100;
    };

    const getDisplayLabel = (index) => {
        if (index < 0) return '直播';
        const time = timestamps[index];
        return time ? formatDisplayTime(time) : '';
    };

    // 生成小时刻度标签（每3小时）
    const hourMarks = [];
    for (let i = 0; i <= 24; i += 3) {
        const hoursAgo = 24 - i;
        hourMarks.push(
            <span key={i} className="hour-mark" style={{ left: `${(i / 24) * 100}%` }}>
                -{hoursAgo}h
            </span>
        );
    }

    return (
        <div className="timeline-container">
            <div className="timeline-header">
                <span className="timeline-title">视频回放</span>
                <span className="timeline-current">{getDisplayLabel(selectedIndex)}</span>
            </div>

            <div className="timeline-track" ref={trackRef} onClick={handleTrackClick}>
                {/* 进度背景 */}
                <div className="timeline-progress" style={{ width: `${getSelectedPosition()}%` }} />

                {/* 刻度线 */}
                <div className="timeline-ticks">{hourMarks}</div>

                {/* 当前位置指示器 */}
                <div className="timeline-handle" style={{ left: `${getSelectedPosition()}%` }}>
                    <div className="handle-inner" />
                </div>
            </div>

            <div className="timeline-footer">
                <button
                    className={`live-btn ${selectedIndex < 0 ? 'active' : ''}`}
                    onClick={handleLiveClick}
                >
                    <span className="live-dot" />
                    返回直播
                </button>
            </div>

            {showHint && (
                <div className="timeline-hint">点击时间轴选择历史视频</div>
            )}
        </div>
    );
}
