'use client';

import { CAMERAS } from '@/lib/cameras';

/**
 * CameraTabs 组件 - 摄像头选择标签
 */
export default function CameraTabs({ currentCameraIndex, onCameraSelect }) {
    return (
        <nav className="camera-tabs">
            <div className="tabs-scroll-container">
                <div className="tabs-track">
                    {CAMERAS.map((camera, index) => (
                        <button
                            key={camera.id}
                            className={`camera-tab ${index === currentCameraIndex ? 'active' : ''}`}
                            onClick={() => onCameraSelect(index)}
                        >
                            <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M23 7l-7 5 7 5V7z"/>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                            <span className="tab-name">{camera.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
}
