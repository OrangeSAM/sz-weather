'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import VideoPlayer from '@/components/VideoPlayer';
import VideoTimeline from '@/components/VideoTimeline';
import CameraTabs from '@/components/CameraTabs';
import WeatherBar from '@/components/WeatherBar';
import AboutPanel from '@/components/AboutPanel';
import { CAMERAS } from '@/lib/cameras';

export default function Home() {
    const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [updateTime, setUpdateTime] = useState('--:--');
    const [selectedTimestamp, setSelectedTimestamp] = useState(null);
    const [isLive, setIsLive] = useState(true);
    const [currentVideoTimestamp, setCurrentVideoTimestamp] = useState(null);

    const currentCamera = CAMERAS[currentCameraIndex];
    const timeSuffix = currentCamera.timeSuffix || 19;

    const handleCameraSelect = (index) => {
        if (index !== currentCameraIndex) {
            setCurrentCameraIndex(index);
            setSelectedTimestamp(null);
        }
    };

    const handleTimeUpdate = (time) => {
        setUpdateTime(time);
    };

    const handleTimestampChange = (timestamp) => {
        setCurrentVideoTimestamp(timestamp);
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
            <Header onAboutOpen={() => setIsAboutOpen(true)} />
            <WeatherBar locationId={currentCamera.locationId} />
            <div className="video-section">
                <VideoPlayer
                    currentCameraIndex={currentCameraIndex}
                    onTimeUpdate={handleTimeUpdate}
                    onTimestampChange={handleTimestampChange}
                    selectedTimestamp={selectedTimestamp}
                    initialTimestamp={isLive ? null : currentVideoTimestamp}
                    onBackToLive={handleBackToLive}
                />
                {currentCamera.description && (
                    <div className="camera-description">{currentCamera.description}</div>
                )}
            </div>
            <VideoTimeline
                cameraTimeSuffix={timeSuffix}
                cameraId={currentCamera.id}
                onSelectTimestamp={handleSelectTimestamp}
                onBackToLive={handleBackToLive}
                activeTimestamp={isLive ? null : currentVideoTimestamp}
            />
            <CameraTabs
                currentCameraIndex={currentCameraIndex}
                onCameraSelect={handleCameraSelect}
            />
            {isAboutOpen && <AboutPanel onClose={() => setIsAboutOpen(false)} />}
        </div>
    );
}
