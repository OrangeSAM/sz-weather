'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllTimestampsInRange, formatDisplayTime, shouldShowTimeLabel } from '@/lib/cameras';

const VISIBLE_COUNT = 10; // 可见时间点数量
const ITEM_WIDTH = 65; // 每个时间点的宽度(px)
const HOURS_24_MS = 24 * 60 * 60 * 1000;

export default function VideoTimeline({ cameraTimeSuffix, onSelectTimestamp, onBackToLive }) {
    const [timestamps, setTimestamps] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [containerWidth, setContainerWidth] = useState(0);

    const containerRef = useRef(null);
    const startX = useRef(0);
    const baseOffsetX = useRef(0);
    const animationRef = useRef(null);

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

    // 获取容器宽度
    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    // 计算最大偏移量
    const getMaxOffsetX = useCallback(() => {
        const totalWidth = timestamps.length * ITEM_WIDTH;
        const visibleWidth = containerWidth;
        return Math.max(0, totalWidth - visibleWidth);
    }, [timestamps.length, containerWidth]);

    // 根据索引计算偏移量（使该索引位于中心）
    const getOffsetXForIndex = useCallback((index) => {
        const centerX = containerWidth / 2;
        const itemCenterX = index * ITEM_WIDTH + ITEM_WIDTH / 2;
        let offset = itemCenterX - centerX;

        // 边界限制
        const maxOffset = getMaxOffsetX();
        offset = Math.max(0, Math.min(maxOffset, offset));

        return offset;
    }, [containerWidth, getMaxOffsetX]);

    // 根据偏移量计算当前应该选中的索引
    // 确保边界情况下也能正确选中最左/最右侧的时刻
    const getIndexFromOffsetX = useCallback((offset) => {
        const maxOffset = getMaxOffsetX();

        // 左侧边界：offset <= 0 时，选中第一个时间点（最左侧）
        if (offset <= 0) {
            return 0;
        }

        // 右侧边界：offset >= maxOffset 时，选中最后一个时间点（最右侧）
        if (offset >= maxOffset) {
            return timestamps.length - 1;
        }

        // 中间区域：正常计算中心索引
        const centerX = containerWidth / 2;
        const itemCenterX = centerX + offset;
        const index = Math.round((itemCenterX - ITEM_WIDTH / 2) / ITEM_WIDTH);
        return Math.max(0, Math.min(timestamps.length - 1, index));
    }, [containerWidth, timestamps.length, getMaxOffsetX]);

    // 选中时间点
    const selectTimestamp = useCallback((index, animate = true) => {
        if (index < 0 || index >= timestamps.length) return;

        setSelectedIndex(index);

        // 计算偏移量并平滑滚动
        const targetOffset = getOffsetXForIndex(index);
        setOffsetX(targetOffset);

        // 触发视频播放
        const timestamp = timestamps[index];
        if (timestamp) {
            onSelectTimestamp(timestamp);
        }
    }, [timestamps, onSelectTimestamp, getOffsetXForIndex]);

    // 点击时刻处理
    const handleItemClick = useCallback((index) => {
        if (index < 0 || index >= timestamps.length) return;

        setSelectedIndex(index);
        const targetOffset = getOffsetXForIndex(index);
        setOffsetX(targetOffset);

        const timestamp = timestamps[index];
        if (timestamp) {
            onSelectTimestamp(timestamp);
        }
    }, [timestamps, onSelectTimestamp, getOffsetXForIndex]);

    // 处理触摸开始
    const handleTouchStart = (e) => {
        setIsDragging(true);
        startX.current = e.touches[0].clientX;
        baseOffsetX.current = offsetX;

        // 停止任何进行中的动画
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    // 处理触摸移动
    const handleTouchMove = (e) => {
        if (!isDragging) return;

        const deltaX = startX.current - e.touches[0].clientX;
        let newOffset = baseOffsetX.current + deltaX;

        // 边界限制（弹性效果）
        const maxOffset = getMaxOffsetX();
        if (newOffset < 0) {
            newOffset = newOffset * 0.3; // 弹性效果
        } else if (newOffset > maxOffset) {
            newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
        }

        setOffsetX(newOffset);
    };

    // 处理触摸结束
    const handleTouchEnd = () => {
        setIsDragging(false);

        // 计算中心索引并选中
        const centerIndex = getIndexFromOffsetX(offsetX);
        selectTimestamp(centerIndex, true);
    };

    // 处理鼠标事件（桌面端测试）
    const handleMouseDown = (e) => {
        setIsDragging(true);
        startX.current = e.clientX;
        baseOffsetX.current = offsetX;

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const deltaX = startX.current - e.clientX;
        let newOffset = baseOffsetX.current + deltaX;

        const maxOffset = getMaxOffsetX();
        if (newOffset < 0) {
            newOffset = newOffset * 0.3;
        } else if (newOffset > maxOffset) {
            newOffset = maxOffset + (newOffset - maxOffset) * 0.3;
        }

        setOffsetX(newOffset);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);

        const centerIndex = getIndexFromOffsetX(offsetX);
        selectTimestamp(centerIndex, true);
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            handleMouseUp();
        }
    };

    const handleLiveClick = () => {
        setSelectedIndex(-1);
        setOffsetX(getOffsetXForIndex(timestamps.length - 1)); // 重置到最新
        onBackToLive();
    };

    const getDisplayLabel = (index) => {
        if (index < 0) return '直播';
        const time = timestamps[index];
        return time ? formatDisplayTime(time) : '';
    };

    const centerIndex = getIndexFromOffsetX(offsetX);

    return (
        <div className="timeline-container">
            <div className="timeline-header">
                <span className="timeline-title">视频回放</span>
                <span className="timeline-current">{getDisplayLabel(selectedIndex)}</span>
            </div>

            {/* 滚轮选择器 */}
            <div className="timeline-wheel-wrapper">
                {/* 中央指示线 */}
                <div className="wheel-center-indicator" />

                {/* 可滚动的尺子 */}
                <div
                    className={`timeline-wheel-strip ${isDragging ? 'dragging' : ''}`}
                    style={{ transform: `translateX(-${offsetX}px)` }}
                    ref={containerRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                >
                    {timestamps.map((timestamp, index) => (
                        <div
                            key={timestamp.getTime()}
                            className={`wheel-item ${selectedIndex === index ? 'selected' : ''} ${centerIndex === index ? 'center' : ''} ${index > timestamps.length - 1 ? 'future' : ''}`}
                            style={{ width: ITEM_WIDTH, flexShrink: 0 }}
                            onClick={() => handleItemClick(index)}
                        >
                            {shouldShowTimeLabel(index) ? (
                                <span className="wheel-item-time">
                                    {formatDisplayTime(timestamp)}
                                </span>
                            ) : (
                                <span className="wheel-item-dot" />
                            )}
                            {index === timestamps.length - 1 && (
                                <span className="wheel-item-label">最新</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="timeline-footer">
                <button
                    className={`live-btn ${selectedIndex >= 0 ? 'active' : ''}`}
                    onClick={handleLiveClick}
                >
                    <span className="live-dot" />
                    返回直播
                </button>
            </div>
        </div>
    );
}
