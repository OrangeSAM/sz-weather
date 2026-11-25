import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ALLOWED_HOST = 'weather.121.com.cn';
const ALLOWED_PATH_RE = /^\/data_cache\/video\/rt\/files\/video_\d+_\d{12}\.mp4$/;

/**
 * 视频流式下载与同源截图代理 API
 * - 流式转发 response.body，避免 Serverless 内存全量缓冲
 * - 严格校验主机名与路径白名单，防止 SSRF
 * - 支持 mode=inline（用于前端 Canvas 生成实景明信片）与 mode=attachment（用于文件下载）
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');
    const mode = searchParams.get('mode') === 'inline' ? 'inline' : 'attachment';
    const customFilename = searchParams.get('filename');

    if (!videoUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let urlObj;
    try {
        urlObj = new URL(videoUrl);
        if (urlObj.protocol !== 'https:' || urlObj.hostname !== ALLOWED_HOST || !ALLOWED_PATH_RE.test(urlObj.pathname)) {
            return NextResponse.json({ error: 'Invalid video source' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const upstream = await fetch(urlObj.toString(), {
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!upstream.ok || !upstream.body) {
            return NextResponse.json({ error: 'Failed to fetch video' }, { status: upstream.status || 502 });
        }

        const rawName = (customFilename || urlObj.pathname.split('/').pop() || 'sz-weather.mp4')
            .replace(/[\r\n"\\]/g, '')
            .slice(0, 120);
        const asciiFallback = rawName.replace(/[^\x20-\x7E]/g, '_') || 'sz-weather.mp4';

        const headers = new Headers({
            'Content-Type': 'video/mp4',
            'Cache-Control': 'public, max-age=3600',
        });

        const contentLength = upstream.headers.get('content-length');
        if (contentLength) {
            headers.set('Content-Length', contentLength);
        }

        if (mode === 'attachment') {
            headers.set(
                'Content-Disposition',
                `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(rawName)}`
            );
        } else {
            headers.set('Content-Disposition', 'inline');
        }

        return new NextResponse(upstream.body, {
            status: 200,
            headers,
        });
    } catch (error) {
        console.error('[Download API] Error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
