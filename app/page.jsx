'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import VideoPlayer from '@/components/VideoPlayer';
import VideoTimeline from '@/components/VideoTimeline';
import CameraTabs from '@/components/CameraTabs';
import { CAMERAS } from '@/lib/cameras';

export default function Home() {
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [updateTime, setUpdateTime] = useState('--:--');
    const [selectedTimestamp, setSelectedTimestamp] = useState(null);
    const [isLive, setIsLive] = useState(true);

    const currentCamera = CAMERAS[currentCameraIndex];
    const timeSuffix = currentCamera.timeSuffix || 19;

    const handleCameraSelect = (index) => {
        if (index !== currentCameraIndex) {
            setCurrentCameraIndex(index);
            setSelectedTimestamp(null);
            setIsLive(true);
        }
    };

    const handleTimeUpdate = (time) => {
        setUpdateTime(time);
    };

    const handleSelectTimestamp = (timestamp) => {
        setSelectedTimestamp(timestamp);
        setIsLive(false);
    };

    const handleBackToLive = () => {
        setSelectedTimestamp(null);
        setIsLive(true);
    };

    return (
        <div className="app-container">
            <Header />
            <VideoPlayer
                currentCameraIndex={currentCameraIndex}
                onTimeUpdate={handleTimeUpdate}
                selectedTimestamp={selectedTimestamp}
                onBackToLive={handleBackToLive}
            />
            <VideoTimeline
                cameraTimeSuffix={timeSuffix}
                onSelectTimestamp={handleSelectTimestamp}
                onBackToLive={handleBackToLive}
            />
            <CameraTabs
                currentCameraIndex={currentCameraIndex}
                onCameraSelect={handleCameraSelect}
            />
        </div>
    );
}
