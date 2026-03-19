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
    const stepSuffixes = timeSuffix === 8 ? [58, 38, 18] : [59, 39, 19];

    // 从结束时间开始，先找到最近的有效时间点
    let current = new Date(endTime);
    const endMinutes = current.getMinutes();

    // 找到最近的可用分钟数
    let targetMinutes = stepSuffixes.find(s => s <= endMinutes) || stepSuffixes[stepSuffixes.length - 1];

    // 如果当前分钟不在有效列表中，需要回退
    if (!stepSuffixes.includes(endMinutes)) {
        // 找到比当前分钟小的最大有效值
        for (let i = stepSuffixes.length - 1; i >= 0; i--) {
            if (stepSuffixes[i] < endMinutes) {
                targetMinutes = stepSuffixes[i];
                break;
            }
        }
        // 如果没找到，回退一小时
        if (targetMinutes === undefined) {
            targetMinutes = stepSuffixes[stepSuffixes.length - 1];
            current.setHours(current.getHours() - 1);
        }
        current.setMinutes(targetMinutes, 0, 0);
    }

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
