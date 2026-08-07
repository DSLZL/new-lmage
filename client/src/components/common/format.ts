/**
 * 通用格式化工具（大盘页 / 全站共用）
 */

/** 字节数自动换算：B / KB / MB / GB（1024 进制，整数自动省略小数） */
export function formatBytes(bytes: number, decimals = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  const digits = value >= 100 || i === 0 ? 0 : decimals;
  return `${value.toFixed(digits)} ${units[i]}`;
}

/** 大整数千分位格式化 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('zh-CN');
}
