'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import VideoPlayer from '@/components/VideoPlayer';
import CameraTabs from '@/components/CameraTabs';
import { CAMERAS } from '@/lib/cameras';

export default function Home() {
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [updateTime, setUpdateTime] = useState('--:--');

    const currentCamera = CAMERAS[currentCameraIndex];

    const handleCameraSelect = (index) => {
        if (index !== currentCameraIndex) {
            setCurrentCameraIndex(index);
        }
    };

    const handleTimeUpdate = (time) => {
        setUpdateTime(time);
    };

    return (
        <div className="app-container">
            <Header
                cameraName={currentCamera.name}
                updateTime={updateTime}
                isLive={true}
            />
            <VideoPlayer
                currentCameraIndex={currentCameraIndex}
                onTimeUpdate={handleTimeUpdate}
            />
            <CameraTabs
                currentCameraIndex={currentCameraIndex}
                onCameraSelect={handleCameraSelect}
            />
        </div>
    );
}
