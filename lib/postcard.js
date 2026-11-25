import { formatPostcardTimestamp, formatVideoTimestamp } from '@/lib/cameras';

/**
 * 抓取当前视频帧并绘制带气象水印的“深圳实景明信片” PNG
 * 优先尝试直接绘制；若因上游缺少 CORS 响应头导致 Canvas Tainted，则通过同源 /api/download?mode=inline 拉取并定位到相同时间点抽帧
 */
export async function exportWeatherPostcard({ videoEl, videoUrl, camera, timestamp, weather }) {
    const targetTime = videoEl && Number.isFinite(videoEl.currentTime) ? videoEl.currentTime : 0;

    let sourceEl = videoEl;
    let cleanupUrl = null;
    let tempVideo = null;

    async function drawToCanvas(mediaEl) {
        const width = mediaEl.videoWidth || 1280;
        const height = mediaEl.videoHeight || 720;
        const footerHeight = Math.round(height * 0.14);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height + footerHeight;
        const ctx = canvas.getContext('2d');

        const isDark =
            document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') === 'dark' ||
            (document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') !== 'light' &&
                window.matchMedia('(prefers-color-scheme: dark)').matches);

        ctx.fillStyle = isDark ? '#12171d' : '#f4f0e8';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(mediaEl, 0, 0, width, height);

        // 顶部极细暗角条，增强观感
        const grad = ctx.createLinearGradient(0, height - 48, 0, height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, height - 48, width, 48);

        // 明信片底部信息栏
        const padX = Math.round(width * 0.032);
        const centerY = height + Math.round(footerHeight * 0.5);

        ctx.fillStyle = isDark ? '#d29d5e' : '#8c6030';
        ctx.fillRect(0, height, width, 3);

        ctx.textBaseline = 'middle';
        ctx.fillStyle = isDark ? '#f2ede4' : '#1a1410';
        ctx.font = `600 ${Math.round(footerHeight * 0.34)}px "Noto Serif SC", "PingFang SC", serif`;
        const titleText = `${camera.district} · ${camera.name}  (${camera.bearingLabel})`;
        ctx.fillText(titleText, padX, centerY - Math.round(footerHeight * 0.14));

        ctx.fillStyle = isDark ? '#9ea7b3' : '#6a5840';
        ctx.font = `400 ${Math.round(footerHeight * 0.21)}px "JetBrains Mono", monospace, sans-serif`;
        const weatherText = weather
            ? `${weather.temp}°C · ${weather.text} · 能见度 ${weather.vis}km · 湿度 ${weather.humidity}%`
            : '深圳市气象局实景监测';
        ctx.fillText(`${formatPostcardTimestamp(timestamp)}   |   ${weatherText}`, padX, centerY + Math.round(footerHeight * 0.2));

        // 右侧印章标识
        ctx.textAlign = 'right';
        ctx.fillStyle = isDark ? '#d29d5e' : '#8c6030';
        ctx.font = `500 ${Math.round(footerHeight * 0.22)}px "Noto Sans SC", sans-serif`;
        ctx.fillText('深圳实时天象台', width - padX, centerY - Math.round(footerHeight * 0.1));
        ctx.fillStyle = isDark ? '#707b88' : '#a09070';
        ctx.font = `400 ${Math.round(footerHeight * 0.16)}px "JetBrains Mono", monospace`;
        ctx.fillText('SZ WEATHER OBSERVATORY', width - padX, centerY + Math.round(footerHeight * 0.18));

        return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas export failed'));
                } else {
                    resolve(blob);
                }
            }, 'image/png');
        });
    }

    let blob;
    try {
        if (sourceEl && sourceEl.readyState >= 2) {
            blob = await drawToCanvas(sourceEl);
        } else {
            throw new Error('Video not ready for direct capture');
        }
    } catch {
        // 回退：通过同源代理拉取视频流并抽帧，解决上游无 CORS 头导致的 Tainted Canvas
        const proxyUrl = `/api/download?url=${encodeURIComponent(videoUrl)}&mode=inline`;
        const res = await fetch(proxyUrl);
        if (!res.ok) {
            throw new Error('无法拉取视频帧');
        }
        const videoBlob = await res.blob();
        cleanupUrl = URL.createObjectURL(videoBlob);

        tempVideo = document.createElement('video');
        tempVideo.muted = true;
        tempVideo.playsInline = true;
        tempVideo.preload = 'auto';
        tempVideo.src = cleanupUrl;

        await new Promise((resolve, reject) => {
            const onLoaded = () => {
                const seekTo = Math.min(targetTime, Math.max(0, (tempVideo.duration || 0) - 0.1));
                if (seekTo > 0.05) {
                    tempVideo.currentTime = seekTo;
                    tempVideo.addEventListener('seeked', resolve, { once: true });
                } else {
                    resolve();
                }
            };
            tempVideo.addEventListener('loadeddata', onLoaded, { once: true });
            tempVideo.addEventListener('error', () => reject(new Error('视频解码失败')), { once: true });
        });

        blob = await drawToCanvas(tempVideo);
    } finally {
        if (cleanupUrl) {
            URL.revokeObjectURL(cleanupUrl);
        }
    }

    const fileName = `深圳天气明信片_${camera.name}_${formatVideoTimestamp(timestamp)}.png`;
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    return fileName;
}
