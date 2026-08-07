import React from 'react';

interface BrandLogoProps {
  size?: number;
  /** 是否带霓虹光晕（Header 高亮场景） */
  glow?: boolean;
}

/**
 * 品牌 SVG 商标：画框 + 山峰 + 旭日，象征"图床承载影像"
 * 手绘矢量，随 CSS 变量变色，亮暗双模自适应
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 28, glow = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={glow ? { filter: 'drop-shadow(0 0 10px var(--accent-glow-strong, rgba(168,85,247,0.45)))' } : undefined}
      aria-label="LMage Pro"
    >
      <defs>
        <linearGradient id="logo-grad" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent-light, #67e8f9)" />
          <stop offset="1" stopColor="var(--accent, #22d3ee)" />
        </linearGradient>
        <linearGradient id="logo-mount" x1="12" y1="36" x2="36" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent, #22d3ee)" />
          <stop offset="1" stopColor="var(--accent-blue, #2563eb)" />
        </linearGradient>
      </defs>

      {/* 画框 */}
      <rect x="5" y="5" width="38" height="38" rx="9" stroke="url(#logo-grad)" strokeWidth="2.4" />

      {/* 山峰 */}
      <path
        d="M11 33.5 L20 21 L25.5 28.5 L29 24 L37 33.5"
        stroke="url(#logo-mount)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* 旭日 */}
      <circle cx="29.5" cy="17.5" r="3.2" fill="var(--accent, #22d3ee)" />
      <circle cx="29.5" cy="17.5" r="5.4" stroke="url(#logo-grad)" strokeWidth="1.2" strokeDasharray="1.2 3.2" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
};
