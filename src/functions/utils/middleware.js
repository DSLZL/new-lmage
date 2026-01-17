/**
 * 错误处理中间件
 */
export async function errorHandling(c) {
    // 全局错误处理逻辑（检查请求来源、IP限制等）
    return;
}

/**
 * 遥测数据中间件
 * 生产环境移除日志输出，提升性能
 */
export function telemetryData(c) {
    // 可以在这里添加统计或分析代码（发送到分析服务）
    // 生产环境不打印日志
    return;
}
