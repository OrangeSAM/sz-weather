/**
 * 深圳天气实景监测 - 核心逻辑
 * Shenzhen Weather Live Monitoring
 */

// ================================
// 摄像头配置
// ================================
// timeSuffix: 时间戳结尾，默认为 19/39/59，部分摄像头为 18/38/58
const CAMERAS = [
    { id: 73, name: '福田东' },
    { id: 78, name: '福田西' },
    { id: 75, name: '福田南' },
    { id: 80, name: '福田北' },
    { id: 106, name: '罗湖东北' },
    { id: 102, name: '罗湖西南' },
    { id: 100, name: '蛇口码头', timeSuffix: 8 },  // 18, 38, 58
    { id: 105, name: '求雨坛南' },
    { id: 62, name: '石岩梯度塔全景' },
    { id: 309, name: '石岩观测场', timeSuffix: 8 }, // 18, 38, 58
    { id: 702, name: '大运中心东南' },
    { id: 46, name: '西涌南' },
    { id: 502, name: '西涌东' }
];

// ================================
// 状态管理
// ================================
const state = {
    currentCameraIndex: 0,
    currentVideoTime: null,
    isPlaying: true,
    isMuted: true,
    refreshInterval: null,
    autoRefreshMs: 20000 // 20秒检查一次
};

// ================================
// DOM 元素
// ================================
const elements = {
    videoPlayer: document.getElementById('videoPlayer'),
    cameraName: document.getElementById('cameraName'),
    updateTime: document.getElementById('updateTime'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    errorOverlay: document.getElementById('errorOverlay'),
    retryBtn: document.getElementById('retryBtn'),
    playPauseBtn: document.getElementById('playPauseBtn'),
    muteBtn: document.getElementById('muteBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    timestampBadge: document.getElementById('timestampBadge'),
    timestampValue: document.getElementById('timestampValue'),
    tabsTrack: document.getElementById('tabsTrack'),
    indicatorLine: document.getElementById('indicatorLine')
};

// ================================
// 工具函数
// ================================

/**
 * 计算当前时间对应的视频时间
 * @param {number} timeSuffix - 时间戳结尾，默认19，部分摄像头为8
 */
function getVideoTimestamp(timeSuffix = 19) {
    const now = new Date();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const s = timeSuffix; // 8 or 19
    const step = 20;
    const prevSuffix = s === 8 ? 58 : 59; // 上一个时间点

    let roundedMinutes, roundedHours;

    if (minutes <= s) {
        // 当前分钟 <= suffix，用上一时间点
        roundedMinutes = prevSuffix;
        roundedHours = hours - 1;
    } else if (minutes <= s + step) {
        // 当前分钟 <= suffix + 20，用第一个时间点
        roundedMinutes = s;
        roundedHours = hours;
    } else if (minutes <= s + step * 2) {
        // 当前分钟 <= suffix + 40，用第二个时间点
        roundedMinutes = s + step;
        roundedHours = hours;
    } else {
        // 用第三个时间点
        roundedMinutes = s + step * 2;
        roundedHours = hours;
    }

    const result = new Date(now);
    result.setHours(roundedHours);
    result.setMinutes(roundedMinutes, 0, 0);

    // 处理跨天情况
    if (roundedHours < 0) {
        result.setDate(result.getDate() - 1);
    }

    return result;
}

/**
 * 格式化日期为 YYYYMMDDHHMM
 */
function formatVideoTimestamp(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}`;
}

/**
 * 格式化时间为 HH:MM
 */
function formatDisplayTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * 获取上一个可用时间点
 * @param {Date} date - 当前时间点
 * @param {number} timeSuffix - 时间戳结尾，默认19，部分摄像头为8
 */
function getPreviousTimestamp(date, timeSuffix = 19) {
    const result = new Date(date);
    const minutes = result.getMinutes();
    const step = 20;

    // 18 -> 58 (prev hour), 38 -> 18, 58 -> 38 (for suffix=8)
    // 19 -> 59 (prev hour), 39 -> 19, 59 -> 39 (for suffix=19)
    const prevSuffix = timeSuffix === 8 ? 58 : 59;
    const prevStep = minutes - step;

    if (prevStep < timeSuffix) {
        // 需要退回到上一个小时
        result.setHours(result.getHours() - 1);
        result.setMinutes(prevSuffix);
    } else {
        result.setMinutes(prevStep);
    }

    // Handle cross-day
    if (result.getHours() < 0) {
        result.setDate(result.getDate() - 1);
    }

    return result;
}

/**
 * 尝试加载视频，支持回退到上一个时间点
 */
let retryCount = 0;
const MAX_RETRIES = 2;

function tryLoadVideo(timestamp) {
    const camera = CAMERAS[state.currentCameraIndex];
    const timeStr = formatVideoTimestamp(timestamp);
    state.currentVideoTime = timestamp;

    const videoUrl = `https://weather.121.com.cn/data_cache/video/rt/files/video_${camera.id}_${timeStr}.mp4`;

    console.log(`[Video] Loading: ${camera.name} - ${videoUrl} (retry: ${retryCount})`);

    // 显示加载状态
    elements.loadingOverlay.classList.remove('hidden');
    elements.errorOverlay.classList.add('hidden');

    // 更新界面
    elements.cameraName.textContent = camera.name;
    elements.updateTime.textContent = formatDisplayTime(state.currentVideoTime);
    elements.timestampValue.textContent = formatDisplayTime(state.currentVideoTime);

    // 设置视频源
    elements.videoPlayer.src = videoUrl;
    elements.videoPlayer.load();
}

/**
 * 加载视频
 */
function loadVideo() {
    retryCount = 0;
    const camera = CAMERAS[state.currentCameraIndex];
    const timeSuffix = camera.timeSuffix || 19;
    const timestamp = getVideoTimestamp(timeSuffix);
    tryLoadVideo(timestamp);
}

/**
 * 视频加载完成
 */
function onVideoCanPlay() {
    elements.loadingOverlay.classList.add('hidden');
    elements.errorOverlay.classList.add('hidden');

    if (state.isPlaying) {
        elements.videoPlayer.play().catch(err => {
            console.log('[Video] Autoplay prevented:', err.message);
        });
    }
}

/**
 * 视频加载错误
 */
function onVideoError(error) {
    console.error('[Video] Error:', error);

    // 尝试回退到上一个时间点
    if (retryCount < MAX_RETRIES) {
        retryCount++;
        const camera = CAMERAS[state.currentCameraIndex];
        const timeSuffix = camera.timeSuffix || 19;
        const prevTimestamp = getPreviousTimestamp(state.currentVideoTime, timeSuffix);
        console.log(`[Video] Retrying with previous timestamp:`, prevTimestamp);
        tryLoadVideo(prevTimestamp);
    } else {
        // 达到最大重试次数，显示错误
        elements.loadingOverlay.classList.add('hidden');
        elements.errorOverlay.classList.remove('hidden');
    }
}

/**
 * 切换播放/暂停
 */
function togglePlayPause() {
    state.isPlaying = !state.isPlaying;

    const playIcon = elements.playPauseBtn.querySelector('.icon-play');
    const pauseIcon = elements.playPauseBtn.querySelector('.icon-pause');

    if (state.isPlaying) {
        elements.videoPlayer.play();
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
    } else {
        elements.videoPlayer.pause();
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
    }
}

/**
 * 切换静音
 */
function toggleMute() {
    state.isMuted = !state.isMuted;
    elements.videoPlayer.muted = state.isMuted;

    const volumeIcon = elements.muteBtn.querySelector('.icon-volume-up');
    const mutedIcon = elements.muteBtn.querySelector('.icon-muted');

    if (state.isMuted) {
        volumeIcon.classList.add('hidden');
        mutedIcon.classList.remove('hidden');
    } else {
        volumeIcon.classList.remove('hidden');
        mutedIcon.classList.add('hidden');
    }
}

/**
 * 切换全屏
 */
function toggleFullscreen() {
    const wrapper = document.querySelector('.video-wrapper');

    if (!document.fullscreenElement) {
        if (wrapper.requestFullscreen) {
            wrapper.requestFullscreen();
        } else if (wrapper.webkitRequestFullscreen) {
            wrapper.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

// ================================
// 摄像头切换
// ================================

/**
 * 初始化摄像头 Tab
 */
function initCameraTabs() {
    elements.tabsTrack.innerHTML = '';

    CAMERAS.forEach((camera, index) => {
        const tab = document.createElement('button');
        tab.className = 'camera-tab' + (index === state.currentCameraIndex ? ' active' : '');
        tab.dataset.index = index;
        tab.innerHTML = `
            <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M23 7l-7 5 7 5V7z"/>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            <span class="tab-name">${camera.name}</span>
        `;

        tab.addEventListener('click', () => switchCamera(index));
        elements.tabsTrack.appendChild(tab);
    });

    updateTabIndicator();
}

/**
 * 切换摄像头
 */
function switchCamera(index) {
    if (index === state.currentCameraIndex) return;

    state.currentCameraIndex = index;

    // 更新 Tab 状态
    const tabs = elements.tabsTrack.querySelectorAll('.camera-tab');
    tabs.forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });

    updateTabIndicator();

    // 加载新视频
    loadVideo();
}

/**
 * 更新 Tab 指示器位置
 */
function updateTabIndicator() {
    const tabs = elements.tabsTrack.querySelectorAll('.camera-tab');
    const activeTab = tabs[state.currentCameraIndex];

    if (activeTab) {
        const trackRect = elements.tabsTrack.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();

        const offsetLeft = tabRect.left - trackRect.left;
        const width = tabRect.width;

        elements.indicatorLine.style.left = `${offsetLeft}px`;
        elements.indicatorLine.style.width = `${width}px`;
    }
}

// ================================
// 自动刷新
// ================================

/**
 * 启动自动刷新
 */
function startAutoRefresh() {
    // 先清除已有的定时器
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
    }

    // 设置定时检查
    state.refreshInterval = setInterval(() => {
        checkForNewVideo();
    }, state.autoRefreshMs);

    console.log(`[AutoRefresh] Started, interval: ${state.autoRefreshMs}ms`);
}

/**
 * 检查是否有新视频
 */
function checkForNewVideo() {
    const newTimestamp = getVideoTimestamp();
    const currentTimestamp = state.currentVideoTime;

    // 如果时间戳发生变化，说明有新视频
    if (currentTimestamp && newTimestamp.getTime() !== currentTimestamp.getTime()) {
        console.log('[AutoRefresh] New video available, reloading...');
        loadVideo();
    }
}

/**
 * 停止自动刷新
 */
function stopAutoRefresh() {
    if (state.refreshInterval) {
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
        console.log('[AutoRefresh] Stopped');
    }
}

// ================================
// PWA - Service Worker
// ================================

/**
 * 注册 Service Worker
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('[SW] Registered:', registration.scope);
        } catch (error) {
            console.error('[SW] Registration failed:', error);
        }
    }
}

// ================================
// 事件监听
// ================================

/**
 * 初始化事件监听
 */
function initEventListeners() {
    // 视频事件
    elements.videoPlayer.addEventListener('canplay', onVideoCanPlay);
    elements.videoPlayer.addEventListener('error', () => onVideoError());
    elements.videoPlayer.addEventListener('loadeddata', () => {
        elements.loadingOverlay.classList.add('hidden');
    });

    // 控件事件
    elements.playPauseBtn.addEventListener('click', togglePlayPause);
    elements.muteBtn.addEventListener('click', toggleMute);
    elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
    elements.retryBtn.addEventListener('click', loadVideo);

    // 页面可见性变化时暂停/恢复
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            elements.videoPlayer.pause();
        } else {
            if (state.isPlaying) {
                elements.videoPlayer.play();
            }
        }
    });

    // 窗口大小变化时更新指示器
    window.addEventListener('resize', updateTabIndicator);

    // 首次加载后更新指示器
    setTimeout(updateTabIndicator, 100);
}

// ================================
// 初始化
// ================================

/**
 * 初始化应用
 */
function init() {
    console.log('[App] Initializing Shenzhen Weather Monitor...');

    // 初始化 UI
    initCameraTabs();
    initEventListeners();

    // 注册 Service Worker
    registerServiceWorker();

    // 加载第一个视频
    loadVideo();

    // 启动自动刷新
    startAutoRefresh();

    // 设置静音状态
    elements.videoPlayer.muted = true;

    console.log('[App] Ready!');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
