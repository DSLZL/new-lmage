import React from 'react';
import './EmptyIllustration.css';

export interface EmptyIllustrationProps {
  /** 插画宽度（px 数字或任意 CSS 长度），默认 220 */
  size?: number | string;
  /** 是否启用上下浮动动画，默认 true（prefers-reduced-motion 时自动关闭） */
  float?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 无障碍标签，默认 '空状态插画' */
  ariaLabel?: string;
}

/**
 * EmptyIllustration — 手绘风格空状态插画（画框 + 山峦 + 旭日）
 *
 * 纯 SVG，全部使用青蓝 CSS 变量着色（--accent / --accent-light /
 * --border-subtle），随 data-theme 亮暗自动适配，供各页面空状态复用：
 *
 * <EmptyState 场景用法：先插画后文案 />
 * <div style={{ textAlign: 'center' }}>
 *   <EmptyIllustration size={180} />
 *   <p style={{ color: 'var(--text-muted)' }}>暂无数据</p>
 * </div>
 */
export const EmptyIllustration: React.FC<EmptyIllustrationProps> = ({
  size = 220,
  float = true,
  className,
  ariaLabel = '空状态插画',
}) => {
  return (
    <svg
      viewBox="0 0 220 150"
      fill="none"
      role="img"
      aria-label={ariaLabel}
      className={`empty-illustration${float ? '' : ' empty-illustration-static'}${
        className ? ` ${className}` : ''
      }`}
      style={{ width: size, height: 'auto' }}
    >
      {/* 微斜画框 */}
      <rect
        x="54"
        y="20"
        width="114"
        height="90"
        rx="12"
        transform="rotate(-3 54 20)"
        stroke="var(--accent-light)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* 内框虚线 */}
      <rect
        x="66"
        y="31"
        width="90"
        height="68"
        rx="8"
        transform="rotate(-3 66 31)"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        strokeDasharray="4 7"
        strokeLinecap="round"
      />
      {/* 山峦轮廓 */}
      <path
        d="M72 82 L94 54 L106 68 L115 60 L138 82"
        stroke="var(--accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 地平线 */}
      <path
        d="M58 96 h104"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        strokeDasharray="3 7"
        strokeLinecap="round"
      />
      {/* 旭日与虚线光晕 */}
      <circle cx="133" cy="46" r="6" fill="var(--accent-light)" />
      <circle
        cx="133"
        cy="46"
        r="9.5"
        stroke="var(--accent-light)"
        strokeWidth="1.2"
        strokeDasharray="2 4"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* 星光点缀 */}
      <path
        d="M162 42 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"
        fill="var(--accent-light)"
        opacity="0.85"
      />
      <circle cx="88" cy="44" r="2" fill="var(--accent)" opacity="0.5" />
      <circle cx="112" cy="38" r="1.5" fill="var(--accent-light)" opacity="0.7" />
    </svg>
  );
};
