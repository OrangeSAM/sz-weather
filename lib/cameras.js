/**
 * 深圳天气实景监测 - 摄像头配置、东八区时间工具与精确太阳天文计算
 */

const SHENZHEN_OFFSET_MS = 8 * 60 * 60 * 1000;
const SHENZHEN_LAT = 22.5431;
const SHENZHEN_LON = 114.0579;

export const ZONES = [
    { id: 'all', label: '全部点位' },
    { id: '中心城区', label: '中心城区' },
    { id: '湾海口岸', label: '湾海口岸' },
    { id: '西部空港与山体', label: '西部空港' },
    { id: '东部山海', label: '东部山海' },
];

export const CAMERAS = [
    {
        id: 73,
        name: '福田东',
        district: '福田',
        zone: '中心城区',
        locationId: '101280603',
        bearing: 90,
        bearingLabel: '朝东',
        coords: [484, 330],
        tags: ['日出', '深港边界'],
        description: '朝东俯瞰福田区东侧和远方罗湖区，画面右侧河对岸是香港，本视角可观测日出方向天色变化',
    },
    {
        id: 75,
        name: '福田南',
        district: '福田',
        zone: '中心城区',
        locationId: '101280603',
        bearing: 180,
        bearingLabel: '朝南',
        coords: [462, 355],
        tags: ['深港边界', '城区'],
        description: '朝南俯瞰福田南部及深港边界，视野开阔',
    },
    {
        id: 80,
        name: '福田北',
        district: '福田',
        zone: '中心城区',
        locationId: '101280603',
        bearing: 0,
        bearingLabel: '朝北',
        coords: [455, 298],
        tags: ['莲花山', '山体能见度'],
        description: '朝北俯瞰福田北部，下方为莲花山公园，远处左侧可见梅林山，右侧为银湖山',
    },
    {
        id: 209,
        name: '长富大厦北',
        district: '福田',
        zone: '中心城区',
        locationId: '101280603',
        bearing: 0,
        bearingLabel: '朝北',
        coords: [450, 342],
        tags: ['CBD天际线', '平安金融中心'],
        description: '朝北俯瞰福田城区全景，正前方为平安国际金融中心及CBD天际线，远处可见塘朗山与梅林山脉',
    },
    {
        id: 210,
        name: '竹子林东',
        district: '福田',
        zone: '中心城区',
        locationId: '101280603',
        bearing: 90,
        bearingLabel: '朝东',
        coords: [414, 332],
        tags: ['日出', 'CBD天际线'],
        description: '朝东俯瞰竹子林及福田CBD天际线，左侧为车公庙与平安金融中心建筑群，右侧可见深圳湾海岸，本视角可观测日出方向天色变化',
    },
    {
        id: 106,
        name: '罗湖东北',
        district: '罗湖',
        zone: '中心城区',
        locationId: '101280602',
        bearing: 45,
        bearingLabel: '朝东北',
        coords: [570, 290],
        tags: ['梧桐山云雾', '洪湖公园'],
        description: '俯瞰罗湖东北方向，可观测梧桐山山脉云雾，画面左下角为洪湖公园',
    },
    {
        id: 102,
        name: '罗湖西南',
        district: '罗湖',
        zone: '中心城区',
        locationId: '101280602',
        bearing: 225,
        bearingLabel: '朝西南',
        coords: [538, 334],
        tags: ['日落', '深港河'],
        description: '俯瞰罗湖西南方向，可观测福田和南山市区全貌，画面左下方为深圳河',
    },
    {
        id: 100,
        name: '蛇口码头',
        district: '南山',
        zone: '湾海口岸',
        locationId: '101280604',
        bearing: 165,
        bearingLabel: '朝南偏东',
        coords: [274, 412],
        tags: ['海面能见度', '深圳湾'],
        description: '俯瞰蛇口港和深圳湾，对面为香港元朗区，可观测海面天气与能见度',
    },
    {
        id: 310,
        name: '机场码头',
        district: '宝安',
        zone: '湾海口岸',
        locationId: '101280605',
        bearing: 270,
        bearingLabel: '朝西',
        coords: [186, 260],
        tags: ['日落', '深中通道', '海面能见度'],
        description: '朝西俯瞰机场码头防波堤与伶仃洋海面，远眺深中通道，可观测海面能见度及日落方向天色',
    },
    {
        id: 105,
        name: '求雨坛南',
        district: '宝安',
        zone: '西部空港与山体',
        locationId: '101280605',
        bearing: 135,
        bearingLabel: '朝东南',
        coords: [262, 224],
        tags: ['铁岗水库', '山顶全景'],
        description: '山顶东南向全景，可观测沈海高速和铁岗水库',
    },
    {
        id: 62,
        name: '石岩梯度塔全景',
        district: '宝安',
        zone: '西部空港与山体',
        locationId: '101280605',
        bearing: 315,
        bearingLabel: '朝西北',
        coords: [298, 178],
        tags: ['大气层结', '西北方向'],
        description: '石岩梯度塔全景，可观测西北方向大气层结变化',
    },
    {
        id: 702,
        name: '大运中心东南',
        district: '龙岗',
        zone: '东部山海',
        locationId: '101280606',
        bearing: 135,
        bearingLabel: '朝东南',
        coords: [684, 200],
        tags: ['龙岗城区', '马峦山'],
        description: '俯瞰大运中心东南方向，可观测龙岗区天气，远处为马峦山',
    },
    {
        id: 46,
        name: '西涌南',
        district: '大鹏',
        zone: '东部山海',
        locationId: '101280609',
        bearing: 180,
        bearingLabel: '朝南',
        coords: [842, 430],
        tags: ['南海海湾', '海岸天气'],
        description: '朝南俯瞰西涌海湾，可观测南海水天一色',
    },
    {
        id: 502,
        name: '西涌东',
        district: '大鹏',
        zone: '东部山海',
        locationId: '101280609',
        bearing: 90,
        bearingLabel: '朝东',
        coords: [878, 415],
        tags: ['日出', '东海岸'],
        description: '朝东俯瞰西涌东海岸，可观测日出及海面天气',
    },
];

export const MULTI_CAM_PRESETS = [
    {
        id: 'overview',
        label: '全城四向精选',
        cameraIds: [209, 100, 310, 502],
    },
    {
        id: 'sunrise',
        label: '日出追光组',
        cameraIds: [73, 210, 502, 106],
    },
    {
        id: 'sunset',
        label: '日落海湾组',
        cameraIds: [310, 102, 100, 46],
    },
    {
        id: 'futian',
        label: '福田四向矩阵',
        cameraIds: [73, 75, 80, 209],
    },
];

export const ALLOWED_LOCATION_IDS = new Set([
    '101280601',
    ...CAMERAS.map((c) => c.locationId),
]);

export const SUNRISE_CAMERAS = [73, 210, 502];
export const SUNSET_CAMERAS = [102, 310];

export function getCurrentEpochMs() {
    return Date.now();
}

/**
 * 将任意 Date 转换为深圳东八区（UTC+8）墙钟分量，完全不依赖宿主机时区
 */
export function toShenzhenParts(date = new Date()) {
    const shifted = new Date(date.getTime() + SHENZHEN_OFFSET_MS);
    const year = shifted.getUTCFullYear();
    const month = shifted.getUTCMonth() + 1;
    const day = shifted.getUTCDate();
    const hours = shifted.getUTCHours();
    const minutes = shifted.getUTCMinutes();
    const seconds = shifted.getUTCSeconds();

    const pad = (n) => String(n).padStart(2, '0');
    return {
        year,
        month,
        day,
        hours,
        minutes,
        seconds,
        dateKey: `${year}-${pad(month)}-${pad(day)}`,
        timeKey: `${pad(hours)}:${pad(minutes)}`,
        compactKey: `${year}${pad(month)}${pad(day)}${pad(hours)}${pad(minutes)}`,
    };
}

/**
 * 由东八区墙钟分量构造真实 UTC Date 实例
 */
export function fromShenzhenParts(year, month, day, hours, minutes, seconds = 0) {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds, 0) - SHENZHEN_OFFSET_MS);
}

/**
 * 解析 YYYYMMDDHHMM 格式的深圳时间戳
 */
export function parseVideoTimestamp(str) {
    if (!str || !/^\d{12}$/.test(str)) return null;
    const year = Number(str.slice(0, 4));
    const month = Number(str.slice(4, 6));
    const day = Number(str.slice(6, 8));
    const hours = Number(str.slice(8, 10));
    const minutes = Number(str.slice(10, 12));
    if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null;
    const date = fromShenzhenParts(year, month, day, hours, minutes);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 计算指定参考时刻在深圳时间下对应的最新可用视频槽位（默认 19/39/59）
 */
export function getVideoTimestamp(timeSuffix = 19, referenceDate = new Date()) {
    const { year, month, day, hours, minutes } = toShenzhenParts(referenceDate);
    const s = timeSuffix;
    const step = 20;
    const prevSuffix = s === 8 ? 58 : 59;

    let roundedMinutes;
    let roundedHours = hours;

    if (minutes <= s) {
        roundedMinutes = prevSuffix;
        roundedHours = hours - 1;
    } else if (minutes <= s + step) {
        roundedMinutes = s;
    } else if (minutes <= s + step * 2) {
        roundedMinutes = s + step;
    } else {
        roundedMinutes = s + step * 2;
    }

    return fromShenzhenParts(year, month, day, roundedHours, roundedMinutes);
}

/**
 * 格式化日期为 YYYYMMDDHHMM（严格基于深圳 UTC+8）
 */
export function formatVideoTimestamp(date) {
    return toShenzhenParts(date).compactKey;
}

/**
 * 格式化时间为 HH:MM（严格基于深圳 UTC+8）
 */
export function formatDisplayTime(date) {
    return toShenzhenParts(date).timeKey;
}

/**
 * 格式化为友好的深圳日期时间标签（如 "今天 06:39" / "昨天 18:19"）
 */
export function formatRelativeTimestamp(timestamp, now = new Date()) {
    const targetParts = toShenzhenParts(timestamp);
    const nowParts = toShenzhenParts(now);
    const yesterdayParts = toShenzhenParts(new Date(now.getTime() - 24 * 60 * 60 * 1000));

    if (targetParts.dateKey === nowParts.dateKey) {
        return `今天 ${targetParts.timeKey}`;
    }
    if (targetParts.dateKey === yesterdayParts.dateKey) {
        return `昨天 ${targetParts.timeKey}`;
    }
    return `${targetParts.month}/${targetParts.day} ${targetParts.timeKey}`;
}

export function formatPostcardTimestamp(timestamp) {
    const p = toShenzhenParts(timestamp);
    const pad = (n) => String(n).padStart(2, '0');
    return `${p.year}.${pad(p.month)}.${pad(p.day)} ${p.timeKey} CST`;
}

export function shouldShowTimeLabel(index) {
    return index % 3 === 0;
}

/**
 * 获取上一个可用时间点（-20分钟）
 */
export function getPreviousTimestamp(date) {
    return new Date(date.getTime() - 20 * 60 * 1000);
}

/**
 * 获取下一个可用时间点（+20分钟）
 */
export function getNextTimestamp(date) {
    return new Date(date.getTime() + 20 * 60 * 1000);
}

/**
 * 生成视频URL
 */
export function getVideoUrl(camera, timestamp) {
    const timeStr = formatVideoTimestamp(timestamp);
    return `https://weather.121.com.cn/data_cache/video/rt/files/video_${camera.id}_${timeStr}.mp4`;
}

/**
 * 获取指定时间范围内的所有时间点（每20分钟一个，严格按 UTC+8 对齐）
 */
export function getAllTimestampsInRange(startTime, endTime, timeSuffix = 19) {
    const timestamps = [];
    let current = getVideoTimestamp(timeSuffix, endTime);

    while (current.getTime() >= startTime.getTime()) {
        timestamps.push(current);
        current = getPreviousTimestamp(current);
    }

    return timestamps.reverse();
}

/**
 * NOAA / Meeus 太阳天文精确算法（含均时差与 0.833° 大气折射修正）
 * 返回深圳当日的曙光、日出、早黄金时刻结束、正午、晚黄金时刻开始、日落、暮光结束
 */
export function getSolarTimes(date = new Date()) {
    const { year, month, day } = toShenzhenParts(date);
    const startOfYearUtc = Date.UTC(year, 0, 0);
    const targetUtc = Date.UTC(year, month - 1, day);
    const dayOfYear = Math.floor((targetUtc - startOfYearUtc) / (24 * 60 * 60 * 1000));

    const gamma = (2 * Math.PI / 365) * (dayOfYear - 1);
    const eqTime = 229.18 * (
        0.000075
        + 0.001868 * Math.cos(gamma)
        - 0.032077 * Math.sin(gamma)
        - 0.014615 * Math.cos(2 * gamma)
        - 0.040849 * Math.sin(2 * gamma)
    );

    const decl = (
        0.006918
        - 0.399912 * Math.cos(gamma)
        + 0.070257 * Math.sin(gamma)
        - 0.006758 * Math.cos(2 * gamma)
        + 0.000907 * Math.sin(2 * gamma)
        - 0.002697 * Math.cos(3 * gamma)
        + 0.00148 * Math.sin(3 * gamma)
    );

    const latRad = (SHENZHEN_LAT * Math.PI) / 180;

    function calcTimeForZenith(zenithDeg, isMorning) {
        const zenithRad = (zenithDeg * Math.PI) / 180;
        const cosHA = Math.cos(zenithRad) / (Math.cos(latRad) * Math.cos(decl)) - Math.tan(latRad) * Math.tan(decl);
        const clamped = Math.max(-1, Math.min(1, cosHA));
        const haDeg = (Math.acos(clamped) * 180) / Math.PI;
        const minutesUtc = 720 - 4 * (SHENZHEN_LON + (isMorning ? haDeg : -haDeg)) - eqTime;
        const totalSecondsUtc = Math.round(minutesUtc * 60);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, totalSecondsUtc));
    }

    const solarNoonMinutesUtc = 720 - 4 * SHENZHEN_LON - eqTime;

    return {
        dawn: calcTimeForZenith(96, true),
        sunrise: calcTimeForZenith(90.833, true),
        goldenMorningEnd: calcTimeForZenith(84, true),
        solarNoon: new Date(Date.UTC(year, month - 1, day, 0, 0, Math.round(solarNoonMinutesUtc * 60))),
        goldenEveningStart: calcTimeForZenith(84, false),
        sunset: calcTimeForZenith(90.833, false),
        dusk: calcTimeForZenith(96, false),
    };
}

export function getSunriseAndSunset(date = new Date()) {
    const { sunrise, sunset } = getSolarTimes(date);
    return { sunrise, sunset };
}

/**
 * 检测给定时间戳是否处于日出或日落观测窗口（默认 ±25 分钟）
 */
export function getSpecialMoment(timestamp, cameraId, toleranceMinutes = 25) {
    const { sunrise, sunset } = getSolarTimes(timestamp);
    const tolMs = toleranceMinutes * 60 * 1000;
    const t = timestamp.getTime();

    if (SUNRISE_CAMERAS.includes(cameraId) && Math.abs(t - sunrise.getTime()) <= tolMs) {
        return 'sunrise';
    }
    if (SUNSET_CAMERAS.includes(cameraId) && Math.abs(t - sunset.getTime()) <= tolMs) {
        return 'sunset';
    }
    return null;
}

/**
 * 根据气象实况和太阳时间生成通透度/观景参考提示
 */
export function getSkyViewingHint(weather, now = new Date()) {
    const solar = getSolarTimes(now);
    const nowMs = now.getTime();
    const min = 60 * 1000;

    let phaseLabel = null;
    if (nowMs >= solar.dawn.getTime() && nowMs <= solar.goldenMorningEnd.getTime()) {
        phaseLabel = '晨光黄金窗口';
    } else if (nowMs >= solar.goldenEveningStart.getTime() && nowMs <= solar.dusk.getTime()) {
        phaseLabel = '日落黄金窗口';
    } else if (solar.sunrise.getTime() - nowMs > 0 && solar.sunrise.getTime() - nowMs <= 90 * min) {
        const mins = Math.round((solar.sunrise.getTime() - nowMs) / min);
        phaseLabel = `距日出 ${mins} 分钟`;
    } else if (solar.sunset.getTime() - nowMs > 0 && solar.sunset.getTime() - nowMs <= 90 * min) {
        const mins = Math.round((solar.sunset.getTime() - nowMs) / min);
        phaseLabel = `距日落 ${mins} 分钟`;
    }

    if (!weather) {
        return {
            solar,
            phaseLabel,
            clarityLabel: null,
            tone: 'neutral',
        };
    }

    const vis = Number(weather.vis);
    const humidity = Number(weather.humidity);
    const precip = Number(weather.precip);

    let clarityLabel = '能见度一般';
    let tone = 'neutral';

    if (precip > 0) {
        clarityLabel = '降水影响视野';
        tone = 'rain';
    } else if (!Number.isNaN(vis) && vis >= 20) {
        clarityLabel = '通透极佳 · 适合远眺';
        tone = 'clear';
    } else if (!Number.isNaN(vis) && vis >= 10) {
        clarityLabel = '视野良好';
        tone = 'good';
    } else if (!Number.isNaN(humidity) && humidity >= 88) {
        clarityLabel = '高湿轻雾';
        tone = 'mist';
    } else if (!Number.isNaN(vis) && vis < 5) {
        clarityLabel = '低能见度';
        tone = 'mist';
    }

    return {
        solar,
        phaseLabel,
        clarityLabel,
        tone,
    };
}
