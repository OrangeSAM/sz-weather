'use client';

import { useState } from 'react';
import {
    CAMERAS,
    MULTI_CAM_PRESETS,
    getVideoTimestamp,
    getPreviousTimestamp,
    getVideoUrl,
    formatRelativeTimestamp,
} from '@/lib/cameras';

function GridTile({ camera, targetTimestamp, onZoomIn }) {
    const [clipTs, setClipTs] = useState(targetTimestamp);
    const [retryCount, setRetryCount] = useState(0);
    const [failed, setFailed] = useState(false);

    const videoUrl = getVideoUrl(camera, clipTs);

    const handleError = () => {
        if (retryCount < 2) {
            setRetryCount((c) => c + 1);
            setClipTs((prev) => getPreviousTimestamp(prev));
        } else {
            setFailed(true);
        }
    };

    return (
        <article className="multicam-tile">
            <div className="multicam-video-box">
                <video
                    key={videoUrl}
                    src={videoUrl}
                    autoPlay
                    playsInline
                    loop
                    muted
                    preload="metadata"
                    onError={handleError}
                />
                {failed && (
                    <div className="error-overlay">
                        <span className="error-text">该时段分片暂缺</span>
                    </div>
                )}
                <div className="video-hud-top">
                    <span className="hud-badge">{camera.district} · {camera.bearingLabel}</span>
                    <span className="hud-badge">{formatRelativeTimestamp(clipTs)}</span>
                </div>
            </div>
            <div className="multicam-tile-footer">
                <div>
                    <div className="multicam-tile-title">{camera.name}</div>
                    <div className="multicam-tile-meta">{camera.tags.join(' · ')}</div>
                </div>
                <button
                    type="button"
                    className="tool-btn"
                    onClick={() => onZoomIn(camera.id, clipTs)}
                >
                    放大观测
                </button>
            </div>
        </article>
    );
}

/**
 * MultiCamGrid 组件 - 2×2 多机位巡检墙，支持一键对比日出/日落/海湾与城市四向
 */
export default function MultiCamGrid({ lockedTimestamp, isLive, onZoomToCamera }) {
    const [presetId, setPresetId] = useState('overview');
    const [syncWithSelectedTime, setSyncWithSelectedTime] = useState(!isLive && Boolean(lockedTimestamp));

    const preset = MULTI_CAM_PRESETS.find((p) => p.id === presetId) || MULTI_CAM_PRESETS[0];
    const cameras = preset.cameraIds
        .map((id) => CAMERAS.find((c) => c.id === id))
        .filter(Boolean);

    const targetTimestamp = syncWithSelectedTime && lockedTimestamp
        ? lockedTimestamp
        : getVideoTimestamp(19);

    return (
        <section className="multicam-wrapper" aria-label="四宫格实景巡检墙">
            <div className="multicam-toolbar">
                <div className="station-heading">
                    <h1 className="station-name">四宫格实景巡检</h1>
                    <span className="station-district-badge">多视角同步对比</span>
                </div>

                <div className="toolbar-group" role="group" aria-label="巡检编组">
                    {MULTI_CAM_PRESETS.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            className="zone-pill"
                            aria-pressed={presetId === p.id}
                            onClick={() => setPresetId(p.id)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {lockedTimestamp && !isLive && (
                    <button
                        type="button"
                        className="tool-btn"
                        aria-pressed={syncWithSelectedTime}
                        onClick={() => setSyncWithSelectedTime((v) => !v)}
                    >
                        {syncWithSelectedTime
                            ? `已对齐回放 · ${formatRelativeTimestamp(lockedTimestamp)}`
                            : '切换至实时对比'}
                    </button>
                )}
            </div>

            <div className="multicam-grid">
                {cameras.map((cam) => (
                    <GridTile
                        key={`${cam.id}-${targetTimestamp.getTime()}`}
                        camera={cam}
                        targetTimestamp={targetTimestamp}
                        onZoomIn={(camId, ts) => onZoomToCamera(camId, ts, syncWithSelectedTime && !isLive)}
                    />
                ))}
            </div>
        </section>
    );
}
