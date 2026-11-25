'use client';

import { useState, useMemo } from 'react';
import { CAMERAS, ZONES } from '@/lib/cameras';

/**
 * 计算镜头视场角扇形 SVG path（以站点为圆心，朝 bearing 方向张开）
 */
function buildFovConePath(cx, cy, bearingDeg, radius = 44, spreadDeg = 52) {
    const startRad = ((bearingDeg - spreadDeg / 2 - 90) * Math.PI) / 180;
    const endRad = ((bearingDeg + spreadDeg / 2 - 90) * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    return `M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${radius} ${radius} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}

const ANCHOR_LABEL_IDS = new Set([209, 100, 310, 702, 502, 106]);

/**
 * StationAtlas 组件 - 深圳点位微缩地图（带高亮脉冲当前点位与 FOV 视野角）及区域分组列表
 */
export default function StationAtlas({ currentCameraIndex, onCameraSelect }) {
    const [activeZone, setActiveZone] = useState('all');
    const [hoveredCamera, setHoveredCamera] = useState(null);
    const [showMap, setShowMap] = useState(true);

    const activeCamera = CAMERAS[currentCameraIndex];
    const previewCamera = hoveredCamera || activeCamera;

    const filteredCameras = CAMERAS.map((cam, index) => ({ cam, index })).filter(
        ({ cam }) => activeZone === 'all' || cam.zone === activeZone
    );

    // 渲染顺序：非活跃点位在前，悬停点位次之，当前选中点位最后渲染以确保置顶不被遮挡
    const orderedCameras = useMemo(() => {
        return CAMERAS.map((cam, index) => ({ cam, index })).sort((a, b) => {
            const rank = (item) => {
                if (item.index === currentCameraIndex) return 2;
                if (hoveredCamera?.id === item.cam.id) return 1;
                return 0;
            };
            return rank(a) - rank(b);
        });
    }, [currentCameraIndex, hoveredCamera]);

    const handleSvgKeyDown = (e) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
        }
    };

    const handleSvgKeyUp = (e, index) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
            onCameraSelect(index);
        }
    };

    return (
        <aside className="atlas-panel" aria-label="深圳监测点位地图与目录">
            <div className="atlas-header">
                <h2 className="atlas-title">监测点位与视野分布</h2>
                <button
                    type="button"
                    className="zone-pill"
                    aria-pressed={showMap}
                    onClick={() => setShowMap((v) => !v)}
                >
                    {showMap ? '收起地图' : '展开地图'}
                </button>
            </div>

            {showMap && (
                <div className="sz-map-card">
                    <svg
                        className="sz-map-svg"
                        viewBox="0 0 1000 500"
                        role="img"
                        aria-label="深圳市14个气象监控点位分布与镜头朝向示意图"
                    >
                        <defs>
                            <radialGradient id="activeFovGlow" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="var(--beacon-color)" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="var(--beacon-color)" stopOpacity="0.08" />
                            </radialGradient>
                        </defs>

                        <rect x="0" y="0" width="1000" height="500" fill="transparent" />
                        <path
                            d="M 40 245 Q 110 215 175 235 L 200 285 Q 230 340 250 400 Q 275 435 320 415 Q 370 365 440 368 Q 520 362 595 335 Q 685 322 735 352 Q 780 390 835 445 Q 885 452 918 408 Q 945 352 890 322 Q 832 292 782 288 Q 748 250 742 185 Q 705 135 612 132 Q 525 142 465 138 Q 390 120 305 130 Q 235 142 178 190 Z"
                            fill="var(--bg-elevated)"
                            stroke="var(--border-strong)"
                            strokeWidth="2"
                        />

                        {/* 深中通道示意线 */}
                        <path
                            d="M 55 245 Q 125 256 186 260"
                            fill="none"
                            stroke="var(--text-muted)"
                            strokeWidth="2"
                            strokeDasharray="5 5"
                            opacity="0.7"
                        />

                        {/* 区域水印标签 */}
                        <text x="95" y="340" className="map-sea-label" fontSize="20">伶仃洋</text>
                        <text x="335" y="458" className="map-sea-label" fontSize="19">深圳湾</text>
                        <text x="772" y="255" className="map-sea-label" fontSize="19">大亚湾</text>
                        <text x="235" y="195" className="map-district-label" fontSize="20">宝安</text>
                        <text x="315" y="345" className="map-district-label" fontSize="20">南山</text>
                        <text x="455" y="250" className="map-district-label" fontSize="20">福田</text>
                        <text x="580" y="245" className="map-district-label" fontSize="20">罗湖</text>
                        <text x="645" y="172" className="map-district-label" fontSize="20">龙岗</text>
                        <text x="815" y="365" className="map-district-label" fontSize="20">大鹏</text>

                        {orderedCameras.map(({ cam, index }) => {
                            const [cx, cy] = cam.coords;
                            const isActive = index === currentCameraIndex;
                            const isHovered = hoveredCamera?.id === cam.id;
                            const showAnchorLabel = !isActive && (isHovered || ANCHOR_LABEL_IDS.has(cam.id));

                            // 当前激活点位悬浮铭牌位置：尽量避开右侧边界和密集区
                            const placeLeft = cx > 760 || (cam.bearing > 180 && cx > 260);
                            const pillWidth = cam.name.length * 19 + 24;
                            const pillX = placeLeft ? cx - pillWidth - 16 : cx + 16;
                            const pillY = cy - 16;

                            return (
                                <g
                                    key={cam.id}
                                    className="map-station-btn"
                                    data-active={isActive ? 'true' : 'false'}
                                    role="button"
                                    tabIndex={0}
                                    aria-pressed={isActive}
                                    aria-label={`${cam.district} ${cam.name}（${cam.bearingLabel}）`}
                                    onClick={() => onCameraSelect(index)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onCameraSelect(index);
                                        handleSvgKeyDown(e);
                                    }}
                                    onKeyUp={(e) => handleSvgKeyUp(e, index)}
                                    onMouseEnter={() => setHoveredCamera(cam)}
                                    onMouseLeave={() => setHoveredCamera(null)}
                                    onFocus={() => setHoveredCamera(cam)}
                                    onBlur={() => setHoveredCamera(null)}
                                >
                                    <path
                                        className="map-station-cone"
                                        d={buildFovConePath(cx, cy, cam.bearing, isActive ? 74 : 36, isActive ? 60 : 48)}
                                        fill={isActive ? 'url(#activeFovGlow)' : undefined}
                                    />

                                    {isActive && (
                                        <>
                                            <circle className="map-active-pulse" cx={cx} cy={cy} r={14} />
                                            <circle className="map-active-halo" cx={cx} cy={cy} r={14} />
                                        </>
                                    )}

                                    <circle
                                        className="map-station-dot"
                                        cx={cx}
                                        cy={cy}
                                        r={isActive ? 8.5 : 5.5}
                                    />

                                    {showAnchorLabel && (
                                        <text
                                            className="map-station-label"
                                            x={cx + (cam.bearing > 180 ? -11 : 11)}
                                            y={cy - 9}
                                            textAnchor={cam.bearing > 180 ? 'end' : 'start'}
                                        >
                                            {cam.name}
                                        </text>
                                    )}

                                    {isActive && (
                                        <g className="map-active-pill" pointerEvents="none">
                                            <rect
                                                x={pillX}
                                                y={pillY}
                                                width={pillWidth}
                                                height={30}
                                                rx={15}
                                            />
                                            <text
                                                x={pillX + pillWidth / 2}
                                                y={pillY + 15}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                            >
                                                {cam.name}
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    <div className="map-hover-bar">
                        <span>
                            <strong>{previewCamera.district} · {previewCamera.name}</strong>（{previewCamera.bearingLabel} {previewCamera.bearing}°）
                        </span>
                        <span className="atlas-count">{previewCamera.tags.join(' · ')}</span>
                    </div>
                </div>
            )}

            <div className="zone-pills" role="group" aria-label="按地理区域筛选点位">
                {ZONES.map((z) => (
                    <button
                        key={z.id}
                        type="button"
                        className="zone-pill"
                        aria-pressed={activeZone === z.id}
                        onClick={() => setActiveZone(z.id)}
                    >
                        {z.label}
                    </button>
                ))}
            </div>

            <div className="station-grid-list">
                {filteredCameras.map(({ cam, index }) => {
                    const isActive = index === currentCameraIndex;
                    return (
                        <button
                            key={cam.id}
                            type="button"
                            className="station-card-btn"
                            aria-current={isActive ? 'true' : undefined}
                            onClick={() => onCameraSelect(index)}
                        >
                            <div className="station-card-top">
                                <span className="station-card-name">{cam.name}</span>
                                <span className="station-card-district">{cam.district}</span>
                            </div>
                            <span className="station-card-sub">
                                {cam.bearingLabel} · {cam.tags[0]}
                            </span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
