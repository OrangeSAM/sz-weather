import { NextResponse } from 'next/server';
import { ALLOWED_LOCATION_IDS } from '@/lib/cameras';

export const runtime = 'nodejs';

/**
 * 和风天气服务端代理（BFF）
 * 1. 保护 QWEATHER_KEY 不暴露给客户端
 * 2. 合并当前天气实况与深圳市气象预警信号
 * 3. 仅在成功获取实况时启用边缘 CDN 缓存，避免错误态被缓存
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || '101280601';

    if (!ALLOWED_LOCATION_IDS.has(location)) {
        return NextResponse.json({ error: 'Invalid location parameter' }, { status: 400 });
    }

    const host = (process.env.QWEATHER_HOST || process.env.NEXT_PUBLIC_QWEATHER_HOST || '')
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/\/+$/, '');
    const key = (process.env.QWEATHER_KEY || process.env.NEXT_PUBLIC_QWEATHER_KEY || '')
        .trim()
        .replace(/^['"]|['"]$/g, '');

    if (!host || !key) {
        return NextResponse.json(
            { configured: false, status: 'unconfigured', now: null, warnings: [], fetchedAt: new Date().toISOString() },
            { status: 200, headers: { 'Cache-Control': 'no-store' } }
        );
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const headers = { 'X-QW-Api-Key': key };

        const [nowRes, warningRes] = await Promise.allSettled([
            fetch(`${host}/v7/weather/now?location=${encodeURIComponent(location)}&key=${encodeURIComponent(key)}`, {
                headers,
                signal: controller.signal,
                next: { revalidate: 300 },
            }),
            fetch(`${host}/v7/warning/now?location=101280601&key=${encodeURIComponent(key)}`, {
                headers,
                signal: controller.signal,
                next: { revalidate: 180 },
            }),
        ]);

        clearTimeout(timeoutId);

        let now = null;
        let upstreamStatus = 200;
        if (nowRes.status === 'fulfilled') {
            upstreamStatus = nowRes.value.status;
            if (nowRes.value.ok) {
                const nowJson = await nowRes.value.json();
                if (nowJson?.code === '200' && nowJson.now) {
                    now = nowJson.now;
                }
            }
        }

        let warnings = [];
        if (warningRes.status === 'fulfilled' && warningRes.value.ok) {
            const warningJson = await warningRes.value.json();
            if (warningJson?.code === '200' && Array.isArray(warningJson.warning)) {
                warnings = warningJson.warning.map((item) => ({
                    id: item.id,
                    title: item.title,
                    typeName: item.typeName,
                    severity: item.severity,
                    severityColor: item.severityColor,
                    level: item.level,
                    pubTime: item.pubTime,
                    text: item.text,
                }));
            }
        }

        const ok = Boolean(now);
        return NextResponse.json(
            {
                configured: true,
                status: ok ? 'ok' : 'unavailable',
                upstreamStatus: ok ? 200 : upstreamStatus,
                location,
                now,
                warnings,
                fetchedAt: new Date().toISOString(),
            },
            {
                headers: {
                    'Cache-Control': ok ? 'public, s-maxage=300, stale-while-revalidate=300' : 'no-store',
                },
            }
        );
    } catch (error) {
        console.error('[Weather API] Error:', error);
        return NextResponse.json(
            { configured: true, status: 'error', error: 'Failed to fetch weather data', now: null, warnings: [] },
            { status: 502, headers: { 'Cache-Control': 'no-store' } }
        );
    }
}
