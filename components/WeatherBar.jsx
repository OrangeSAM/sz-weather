'use client';

import { useState, useEffect } from 'react';
import { formatDisplayTime, getSkyViewingHint } from '@/lib/cameras';

function getWeatherIcon(code) {
    if (!code) return null;
    const n = parseInt(code, 10);
    if (n === 100 || n === 150) {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
            </svg>
        );
    }
    if (n >= 300 && n < 400) {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M16 14v6M8 14v6M12 16v6" strokeLinecap="round" />
                <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
            </svg>
        );
    }
    if (n >= 400 && n < 500) {
        return (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 2v20M4.93 4.93l14.14 14.14M2 12h20M4.93 19.07L19.07 4.93" strokeLinecap="round" />
            </svg>
        );
    }
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
        </svg>
    );
}

/**
 * WeatherBar 组件 - 通过服务端 /api/weather 安全代理获取区域实况、气象预警与日出日落观景提示
 */
export default function WeatherBar({ locationId, districtName, isLive, onWeatherLoad }) {
    const location = locationId || '101280601';
    const [state, setState] = useState({
        location: null,
        now: null,
        warnings: [],
        configured: true,
        status: 'loading',
    });

    useEffect(() => {
        const CACHE_TTL = 10 * 60 * 1000;
        const cacheKey = `sz_weather_bff_${location}`;
        let cancelled = false;

        async function loadWeather() {
            try {
                const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
                if (cached && cached.now && Date.now() - cached.timestamp < CACHE_TTL) {
                    if (!cancelled) {
                        setState({
                            location,
                            now: cached.now,
                            warnings: cached.warnings || [],
                            configured: cached.configured !== false,
                            status: 'ok',
                        });
                        if (onWeatherLoad) onWeatherLoad(cached.now);
                    }
                    return;
                }
            } catch {}

            try {
                const r = await fetch(`/api/weather?location=${encodeURIComponent(location)}`);
                const data = await r.json();
                if (cancelled) return;
                setState({
                    location,
                    now: data.now || null,
                    warnings: Array.isArray(data.warnings) ? data.warnings : [],
                    configured: data.configured !== false,
                    status: data.now ? 'ok' : data.configured === false ? 'unconfigured' : 'unavailable',
                });
                if (onWeatherLoad) onWeatherLoad(data.now || null);

                if (data.now) {
                    try {
                        localStorage.setItem(
                            cacheKey,
                            JSON.stringify({
                                now: data.now,
                                warnings: data.warnings || [],
                                configured: data.configured !== false,
                                timestamp: Date.now(),
                            })
                        );
                    } catch {}
                }
            } catch {
                if (!cancelled) {
                    setState({
                        location,
                        now: null,
                        warnings: [],
                        configured: true,
                        status: 'unavailable',
                    });
                }
            }
        }

        loadWeather();

        return () => {
            cancelled = true;
        };
    }, [location, onWeatherLoad]);

    const isCurrentLocation = state.location === location;
    const weather = isCurrentLocation ? state.now : null;
    const warnings = isCurrentLocation ? state.warnings : [];
    const effectiveStatus = isCurrentLocation ? state.status : 'loading';

    const { solar, phaseLabel, clarityLabel, tone } = getSkyViewingHint(weather);
    const obsTime = weather?.obsTime ? formatDisplayTime(new Date(weather.obsTime)) : null;
    const weatherIconEl = getWeatherIcon(weather?.icon);

    const statusText = weather
        ? weather.text
        : effectiveStatus === 'unconfigured'
            ? '未配置气象密钥'
            : effectiveStatus === 'unavailable'
                ? '实况暂不可用'
                : '读取实况中...';

    return (
        <section className="weather-bar" aria-label="区域气象实况与观景指标">
            <div className="weather-bar-inner">
                <div className="weather-primary">
                    <div className="weather-condition">
                        {weatherIconEl && <span className="weather-icon">{weatherIconEl}</span>}
                        <span className="weather-temp">{weather ? `${weather.temp}°C` : `${districtName || '深圳'}`}</span>
                        <span className="weather-text">
                            {weather && districtName ? `${districtName} · ` : ''}
                            {statusText}
                        </span>
                    </div>

                    {weather && (
                        <div className="weather-metrics">
                            <span>体感 {weather.feelsLike}°</span>
                            <span className="weather-metric-sep" aria-hidden="true">·</span>
                            <span>{weather.windDir} {weather.windScale}级</span>
                            <span className="weather-metric-sep" aria-hidden="true">·</span>
                            <span>湿度 {weather.humidity}%</span>
                            <span className="weather-metric-sep" aria-hidden="true">·</span>
                            <span>能见度 {weather.vis}km</span>
                            {Number(weather.precip) > 0 && (
                                <>
                                    <span className="weather-metric-sep" aria-hidden="true">·</span>
                                    <span>降水 {weather.precip}mm</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="weather-insights">
                    {warnings.map((w) => (
                        <span key={w.id || w.title} className="weather-chip warning" title={w.text || w.title}>
                            <span aria-hidden="true">⚠</span>
                            <span>{w.typeName}{w.level ? ` ${w.level}` : ''}预警</span>
                        </span>
                    ))}

                    {clarityLabel && (
                        <span className="weather-chip clarity" data-tone={tone}>
                            {clarityLabel}
                        </span>
                    )}

                    {phaseLabel && (
                        <span className="weather-chip clarity" data-tone="clear">
                            {phaseLabel}
                        </span>
                    )}

                    <span className="weather-chip solar" title="今日深圳精确天文日出与日落时间（东八区）">
                        🌅 {formatDisplayTime(solar.sunrise)} / 🌄 {formatDisplayTime(solar.sunset)}
                    </span>

                    {obsTime && (
                        <span className="weather-chip obs-note">
                            {isLive ? `观测 ${obsTime}` : `当前实况 ${obsTime}`}
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}
