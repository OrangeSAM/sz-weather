/**
 * 摄像头配置数据
 * timeSuffix: 时间戳结尾，默认为 19/39/59，部分摄像头为 18/38/58
 */

export const CAMERAS = [
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

/**
 * 计算当前时间对应的视频时间戳
 * @param {number} timeSuffix - 时间戳结尾，默认19，部分摄像头为8
 */
export function getVideoTimestamp(timeSuffix = 19) {
    const now = new Date();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const s = timeSuffix;
    const step = 20;
    const prevSuffix = s === 8 ? 58 : 59;

    let roundedMinutes, roundedHours;

    if (minutes <= s) {
        roundedMinutes = prevSuffix;
        roundedHours = hours - 1;
    } else if (minutes <= s + step) {
        roundedMinutes = s;
        roundedHours = hours;
    } else if (minutes <= s + step * 2) {
        roundedMinutes = s + step;
        roundedHours = hours;
    } else {
        roundedMinutes = s + step * 2;
        roundedHours = hours;
    }

    const result = new Date(now);
    result.setHours(roundedHours);
    result.setMinutes(roundedMinutes, 0, 0);

    if (roundedHours < 0) {
        result.setDate(result.getDate() - 1);
    }

    return result;
}

/**
 * 格式化日期为 YYYYMMDDHHMM
 */
export function formatVideoTimestamp(date) {
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
export function formatDisplayTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * 判断是否应该显示时间标签（每3个显示1个）
 * 索引 0, 3, 6, 9... 显示时间
 * 索引 1, 2, 4, 5, 7, 8... 显示圆点
 */
export function shouldShowTimeLabel(index) {
    return index % 3 === 0;
}

/**
 * 获取上一个可用时间点
 */
export function getPreviousTimestamp(date, timeSuffix = 19) {
    const result = new Date(date);
    const minutes = result.getMinutes();
    const step = 20;

    const prevSuffix = timeSuffix === 8 ? 58 : 59;
    const prevStep = minutes - step;

    if (prevStep < timeSuffix) {
        result.setHours(result.getHours() - 1);
        result.setMinutes(prevSuffix);
    } else {
        result.setMinutes(prevStep);
    }

    if (result.getHours() < 0) {
        result.setDate(result.getDate() - 1);
    }

    return result;
}

/**
 * 生成视频URL
 */
export function getVideoUrl(camera, timestamp) {
    const timeStr = formatVideoTimestamp(timestamp);
    return `https://weather.121.com.cn/data_cache/video/rt/files/video_${camera.id}_${timeStr}.mp4`;
}

/**
 * 获取指定时间范围内的所有时间点（每20分钟一个）
 * @param {Date} startTime - 开始时间
 * @param {Date} endTime - 结束时间
 * @param {number} timeSuffix - 时间戳结尾，默认19
 * @returns {Date[]} 时间点数组
 */
export function getAllTimestampsInRange(startTime, endTime, timeSuffix = 19) {
    const timestamps = [];
    const step = 20;
    const prevSuffix = timeSuffix === 8 ? 58 : 59;
    const stepSuffixes = timeSuffix === 8 ? [58, 38, 18] : [59, 39, 19];

    // 从结束时间开始，先找到最近的有效时间点
    let current = new Date(endTime);
    const endMinutes = current.getMinutes();
    const s = timeSuffix;

    // 使用与 getVideoTimestamp 相同的逻辑
    let targetMinutes, targetHours;

    if (endMinutes <= s) {
        // 需要回退到上一小时的 prevSuffix
        targetMinutes = prevSuffix;
        targetHours = current.getHours() - 1;
    } else if (endMinutes <= s + step) {
        targetMinutes = s;
        targetHours = current.getHours();
    } else if (endMinutes <= s + step * 2) {
        targetMinutes = s + step;
        targetHours = current.getHours();
    } else {
        targetMinutes = s + step * 2;
        targetHours = current.getHours();
    }

    // 处理小时回退到负数的情况
    if (targetHours < 0) {
        current.setDate(current.getDate() - 1);
        current.setHours(23);
    } else {
        current.setHours(targetHours);
    }
    current.setMinutes(targetMinutes, 0, 0);

    // 向前遍历所有时间点
    while (current.getTime() >= startTime.getTime()) {
        timestamps.push(new Date(current));

        // 向前移动20分钟
        let newMinutes = current.getMinutes() - 20;
        let newHours = current.getHours();

        if (newMinutes < 0) {
            newMinutes += 60;
            newHours -= 1;
            if (newHours < 0) {
                current.setDate(current.getDate() - 1);
                current.setHours(23);
            } else {
                current.setHours(newHours);
            }
        }
        current.setMinutes(newMinutes);
    }

    return timestamps.reverse();
}

// 深圳坐标
const SHENZHEN_LAT = 22.5;
const SHENZHEN_LON = 114.0;

/**
 * 计算指定日期的日出和日落时间（使用简化算法）
 * @param {Date} date - 日期
 * @returns {{ sunrise: Date, sunset: Date }}
 */
export function getSunriseAndSunset(date) {
    const d = new Date(date);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

    // 简化的日出日落计算算法
    const latRad = SHENZHEN_LAT * Math.PI / 180;

    // 计算太阳赤纬（太阳相对于赤道的纬度）
    const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180) * Math.PI / 180;

    // 计算日出时角
    const cosHourAngle = -Math.tan(latRad) * Math.tan(declination);

    // 极昼极夜处理
    let hourAngle;
    if (cosHourAngle > 1) {
        // 极夜（太阳不升起）
        hourAngle = 0;
    } else if (cosHourAngle < -1) {
        // 极昼（太阳不落下）
        hourAngle = Math.PI;
    } else {
        hourAngle = Math.acos(cosHourAngle);
    }

    // 计算日出日落时间（小时）
    const sunriseHour = 12 - (hourAngle * 180 / Math.PI) / 15 - (SHENZHEN_LON - 120) / 15;
    const sunsetHour = 12 + (hourAngle * 180 / Math.PI) / 15 - (SHENZHEN_LON - 120) / 15;

    const sunrise = new Date(d);
    sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0, 0);

    const sunset = new Date(d);
    sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0, 0);

    return { sunrise, sunset };
}

/**
 * 特殊时刻可见性配置
 * 摄像头 ID 列表
 */
export const SUNRISE_CAMERAS = [73, 502];   // 福田东、西涌东 - 可以看到日出
export const SUNSET_CAMERAS = [78, 102];    // 福田西、罗湖西南 - 可以看到日落

/**
 * 检测给定时间戳是否接近日出或日落时刻
 * @param {Date} timestamp - 要检测的时间戳
 * @param {number} cameraId - 摄像头 ID
 * @param {number} toleranceMinutes - 容差时间（分钟），默认 20
 * @returns {string|null} - 返回 'sunrise', 'sunset' 或 null
 */
export function getSpecialMoment(timestamp, cameraId, toleranceMinutes = 20) {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0); // 只保留日期

    const { sunrise, sunset } = getSunriseAndSunset(date);

    const sunriseStart = new Date(sunrise.getTime() - toleranceMinutes * 60 * 1000);
    const sunriseEnd = new Date(sunrise.getTime() + toleranceMinutes * 60 * 1000);

    const sunsetStart = new Date(sunset.getTime() - toleranceMinutes * 60 * 1000);
    const sunsetEnd = new Date(sunset.getTime() + toleranceMinutes * 60 * 1000);

    // 检测日出
    if (SUNRISE_CAMERAS.includes(cameraId)) {
        if (timestamp >= sunriseStart && timestamp <= sunriseEnd) {
            return 'sunrise';
        }
    }

    // 检测日落
    if (SUNSET_CAMERAS.includes(cameraId)) {
        if (timestamp >= sunsetStart && timestamp <= sunsetEnd) {
            return 'sunset';
        }
    }

    return null;
}
