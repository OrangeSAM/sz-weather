'use client';

import { useEffect, useState } from 'react';
import { CAMERAS } from '@/lib/cameras';
import dynamic from 'next/dynamic';

// 动态导入 Leaflet 组件，确保只在客户端渲染
const LeafletMap = dynamic(
    () => import('./LeafletMapInner'),
    { ssr: false, loading: () => <MapLoading /> }
);

function MapLoading() {
    return (
        <div className="camera-map">
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '13px'
            }}>
                加载地图中...
            </div>
        </div>
    );
}

export default function CameraMap({ currentCameraIndex, onCameraSelect }) {
    return (
        <LeafletMap
            currentCameraIndex={currentCameraIndex}
            onCameraSelect={onCameraSelect}
        />
    );
}
