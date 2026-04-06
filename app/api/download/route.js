import { NextResponse } from 'next/server';

/**
 * 视频下载代理 API
 * 解决跨域问题：通过服务端请求视频并转发给客户端
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // 验证 URL 必须是允许的视频源
    const allowedHost = 'weather.121.com.cn';
    try {
        const urlObj = new URL(videoUrl);
        if (urlObj.hostname !== allowedHost) {
            return NextResponse.json({ error: 'Invalid video source' }, { status: 403 });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    try {
        const response = await fetch(videoUrl);

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch video' }, { status: response.status });
        }

        // 获取视频内容
        const arrayBuffer = await response.arrayBuffer();

        // 从 URL 中提取文件名
        const urlPath = videoUrl.split('/').pop();
        const filename = urlPath || 'video.mp4';

        // 返回视频流，设置合适的 headers
        return new NextResponse(arrayBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Content-Length': arrayBuffer.byteLength,
                'Cache-Control': 'private, max-age=3600',
            },
        });
    } catch (error) {
        console.error('[Download API] Error:', error);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
