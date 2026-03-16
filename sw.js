/**
 * 深圳天气实景监测 - Service Worker
 * 离线缓存支持
 */

const CACHE_NAME = 'sz-weather-v1';

// 需要缓存的资源
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// 视频缓存配置
const VIDEO_CACHE_NAME = 'sz-weather-videos-v1';
const MAX_VIDEO_CACHE_SIZE = 10; // 最多缓存10个视频

// ================================
// 安装事件 - 缓存核心资源
// ================================
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching core resources');
            return cache.addAll(PRECACHE_URLS);
        }).then(() => {
            // 跳过等待，立即激活
            return self.skipWaiting();
        })
    );
});

// ================================
// 激活事件 - 清理旧缓存
// ================================
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        return name.startsWith('sz-weather-') &&
                               name !== CACHE_NAME &&
                               name !== VIDEO_CACHE_NAME;
                    })
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            // 立即接管所有页面
            return self.clients.claim();
        })
    );
});

// ================================
// 请求拦截 - 缓存策略
// ================================
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 视频请求处理
    if (url.pathname.includes('/video_')) {
        event.respondWith(handleVideoRequest(event.request));
        return;
    }

    // 其他请求 - 缓存优先，网络更新
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // 返回缓存，同时在后台更新
                event.waitUntil(updateCache(event.request));
                return cachedResponse;
            }

            // 没有缓存，从网络获取
            return fetch(event.request).then((response) => {
                // 缓存新的响应
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // 网络失败，返回离线页面
                return caches.match('/index.html');
            });
        })
    );
});

// ================================
// 视频请求处理
// ================================
async function handleVideoRequest(request) {
    const cache = await caches.open(VIDEO_CACHE_NAME);

    // 先检查缓存
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        console.log('[SW] Video from cache:', request.url);
        return cachedResponse;
    }

    // 缓存中没有，尝试从网络获取
    try {
        const response = await fetch(request);

        if (response.ok) {
            // 缓存视频
            console.log('[SW] Caching video:', request.url);
            const responseClone = response.clone();

            // 清理旧视频缓存
            await cleanVideoCache(cache);

            // 添加新视频到缓存
            await cache.put(request, responseClone);
        }

        return response;
    } catch (error) {
        console.error('[SW] Video fetch failed:', error);

        // 尝试返回最近缓存的视频（如果有）
        const keys = await cache.keys();
        if (keys.length > 0) {
            const lastVideo = keys[keys.length - 1];
            console.log('[SW] Returning last cached video');
            return cache.match(lastVideo);
        }

        // 返回错误响应
        return new Response('Video not available offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// ================================
// 清理旧视频缓存
// ================================
async function cleanVideoCache(cache) {
    const keys = await cache.keys();

    if (keys.length >= MAX_VIDEO_CACHE_SIZE) {
        // 删除最旧的缓存
        const oldestKey = keys[0];
        console.log('[SW] Removing old video:', oldestKey.url);
        await cache.delete(oldestKey);
    }
}

// ================================
// 后台更新缓存
// ================================
async function updateCache(request) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response);
        }
    } catch (error) {
        // 忽略更新错误
    }
}

// ================================
// 消息处理
// ================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
