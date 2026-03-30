'use client';

import { useState, useEffect } from 'react';

function getWeatherIcon(code) {
    if (!code) return null;
    const n = parseInt(code);
    if (n === 100)
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="4"/>
                <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
        );
    if (n >= 300 && n < 400)
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="16" y1="13" x2="16" y2="21"/><line x1="8" y1="13" x2="8" y2="21"/><line x1="12" y1="15" x2="12" y2="23"/>
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/>
            </svg>
        );
    if (n >= 400 && n < 500)
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="12" y1="2" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                <line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
            </svg>
        );
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
        </svg>
    );
}

export default function WeatherBar({ locationId }) {
    const [weather, setWeather] = useState(null);
    const location = locationId || '101280601';

    const today = new Date().toLocaleDateString('zh-CN', {
        month: 'long', day: 'numeric', weekday: 'short',
    });

    useEffect(() => {
        const CACHE_TTL = 30 * 60 * 1000; // 30 分钟
        const cacheKey = `weather_${location}`;

        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey));
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                setWeather(cached.data);
                return;
            }
        } catch {}

        setWeather(null);
        fetch(`${process.env.NEXT_PUBLIC_QWEATHER_HOST}/v7/weather/now?location=${location}&key=${process.env.NEXT_PUBLIC_QWEATHER_KEY}`)
            .then(r => r.json())
            .then(data => {
                if (data.code === '200') {
                    setWeather(data.now);
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify({ data: data.now, timestamp: Date.now() }));
                    } catch {}
                }
            })
            .catch(() => {});
    }, [location]);

    const obsTime = weather?.obsTime
        ? new Date(weather.obsTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        : null;

    return (
        <div className="weather-bar">
            <div className="weather-bar-content">
                <div className="weather-bar-main">
                    <span className="weather-icon">{getWeatherIcon(weather?.icon)}</span>
                    <span className="weather-temp">{weather ? `${weather.temp}°C` : '--°C'}</span>
                    <span className="weather-text">{weather ? weather.text : '加载中...'}</span>
                </div>
                <div className="weather-bar-details">
                    <span className="weather-detail">体感 {weather ? `${weather.feelsLike}°` : '--'}</span>
                    <span className="weather-divider">·</span>
                    <span className="weather-detail">{weather ? `${weather.windDir} ${weather.windScale}级` : '--'}</span>
                    <span className="weather-divider">·</span>
                    <span className="weather-detail">湿度 {weather ? `${weather.humidity}%` : '--'}</span>
                    <span className="weather-divider">·</span>
                    <span className="weather-detail">能见度 {weather ? `${weather.vis}km` : '--'}</span>
                    {weather?.precip > 0 && (
                        <><span className="weather-divider">·</span>
                        <span className="weather-detail">降水 {weather.precip}mm</span></>
                    )}
                </div>
                <div className="weather-bar-right">
                    <span className="weather-date">{today}</span>
                    {obsTime && <span className="weather-obs">观测 {obsTime}</span>}
                </div>
            </div>
        </div>
    );
}
