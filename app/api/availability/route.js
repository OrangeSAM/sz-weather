import { NextResponse } from 'next/server';
import {
    CAMERAS,
    getAllTimestampsInRange,
    formatVideoTimestamp,
    getVideoUrl,
} from '@/lib/cameras';

export const runtime = 'nodejs';

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const CONCURRENCY = 12;

/**
 * 批量探测过去 24 小时某个点位的视频分片可用性
 * 通过服务端 HEAD 请求绕过浏览器跨域限制，并做边缘缓存
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const cameraId = Number(searchParams.get('cameraId'));
    const camera = CAMERAS.find((c) => c.id === cameraId);

    if (!camera) {
        return NextResponse.json({ error: 'Invalid cameraId' }, { status: 400 });
    }

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - HOURS_24_MS);
    const timestamps = getAllTimestampsInRange(startTime, endTime, camera.timeSuffix || 19);

    const availableSet = new Set();

    async function checkSlot(ts) {
        const key = formatVideoTimestamp(ts);
        const url = getVideoUrl(camera, ts);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        try {
            const res = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
            });
            if (res.ok) {
                availableSet.add(key);
            }
        } catch {
            // 忽略单个超时或网络错误，保留为未确认状态
        } finally {
            clearTimeout(timer);
        }
    }

    for (let i = 0; i < timestamps.length; i += CONCURRENCY) {
        const batch = timestamps.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(checkSlot));
    }

    const available = timestamps
        .map((ts) => formatVideoTimestamp(ts))
        .filter((key) => availableSet.has(key));

    return NextResponse.json(
        {
            cameraId: camera.id,
            available,
            totalChecked: timestamps.length,
            checkedAt: new Date().toISOString(),
        },
        {
            headers: {
                'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=120',
            },
        }
    );
}
