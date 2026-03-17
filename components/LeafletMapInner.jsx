'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { CAMERAS } from '@/lib/cameras';

// 深圳中心位置
const SHENZHEN_CENTER = [22.55, 114.05];

// 修复 Leaflet 默认图标问题
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 创建自定义图标
const createIcon = (isActive) => {
    const color = isActive ? '#2563eb' : '#64748b';
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            width: 24px;
            height: 24px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <path d="M23 7l-7 5 7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="white"/>
            </svg>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

// 自定义聚合图标样式
const createClusterIcon = (cluster) => {
    const count = cluster.getChildCount();
    return L.divIcon({
        html: `<div style="
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 14px;
        ">${count}</div>`,
        className: 'marker-cluster-custom',
        iconSize: L.point(36, 36),
        iconAnchor: [18, 18],
    });
};

// 使用 useMap hook 获取 map 实例的组件
function MapMarkers({ currentCameraIndex, onCameraSelect, groupedCameras }) {
    const map = useMap();
    const markersRef = useRef(null);

    useEffect(() => {
        if (markersRef.current) {
            map.removeLayer(markersRef.current);
        }

        const markers = L.markerClusterGroup({
            iconCreateFunction: createClusterIcon,
            maxClusterRadius: 50,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
        });

        Object.values(groupedCameras).forEach(group => {
            if (group.length === 1) {
                const camera = group[0];
                const isActive = camera.index === currentCameraIndex;
                const marker = L.marker([camera.latitude, camera.longitude], {
                    icon: createIcon(isActive),
                });

                marker.on('click', () => {
                    onCameraSelect(camera.index);
                });

                marker.bindPopup(`
                    <div style="min-width: 120px">
                        <strong>${camera.name}</strong>
                    </div>
                `, { closeButton: false });

                markers.addLayer(marker);
            } else {
                const firstCamera = group[0];

                const marker = L.marker([firstCamera.latitude, firstCamera.longitude], {
                    icon: createIcon(false),
                });

                const popupContent = `
                    <div style="min-width: 140px">
                        <div style="font-weight: 600; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #eee;">
                            ${firstCamera.name.split('').slice(0, 2).join('')} (${group.length}个)
                        </div>
                        ${group.map(c => `
                            <div class="cluster-popup-item"
                                 data-index="${c.index}"
                                 style="padding: 6px 0; cursor: pointer; color: ${c.index === currentCameraIndex ? '#2563eb' : '#333'}; font-weight: ${c.index === currentCameraIndex ? '600' : '400'};"
                            >
                                ${c.name}
                            </div>
                        `).join('')}
                    </div>
                `;

                marker.bindPopup(popupContent, { closeButton: false });

                marker.on('popupopen', () => {
                    document.querySelectorAll('.cluster-popup-item').forEach(item => {
                        item.addEventListener('click', function() {
                            const index = parseInt(this.getAttribute('data-index'));
                            onCameraSelect(index);
                            marker.closePopup();
                        });
                    });
                });

                markers.addLayer(marker);
            }
        });

        map.addLayer(markers);
        markersRef.current = markers;

        return () => {
            if (markersRef.current) {
                map.removeLayer(markersRef.current);
            }
        };
    }, [map, currentCameraIndex, groupedCameras, onCameraSelect]);

    return null;
}

export default function LeafletMapInner({ currentCameraIndex, onCameraSelect }) {
    // 按经纬度分组摄像头
    const groupedCameras = useMemo(() => {
        const groups = {};
        CAMERAS.forEach((camera, index) => {
            if (!camera.latitude || !camera.longitude) return;
            const key = `${camera.latitude},${camera.longitude}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push({ ...camera, index });
        });
        return groups;
    }, []);

    return (
        <div className="camera-map">
            <MapContainer
                center={SHENZHEN_CENTER}
                zoom={11}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapMarkers
                    currentCameraIndex={currentCameraIndex}
                    onCameraSelect={onCameraSelect}
                    groupedCameras={groupedCameras}
                />
            </MapContainer>
        </div>
    );
}
