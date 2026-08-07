import React from 'react';
import { motion } from 'framer-motion';
import './galleryList.css';
import './EmptyState.css';

interface GalleryEmptyProps {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

const drawTransition = { duration: 1.05, ease: 'easeInOut' as const };

/** 手绘插画：微斜画框 + 渐变旭日与光芒 + 层叠青蓝山峦 + 漂浮卡片与星光（全部 CSS 变量着色） */
const GalleryEmptyArt: React.FC = () => (
  <svg viewBox="0 0 240 180" fill="none" className="g-empty-svg" aria-hidden>
    <defs>
      {/* 旭日渐变（青 → 蓝） */}
      <linearGradient id="gEmptySun" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--accent-light)" />
        <stop offset="1" stopColor="var(--accent-blue)" />
      </linearGradient>
      {/* 远山雾气渐变 */}
      <linearGradient id="gEmptyMtn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="var(--accent)" stopOpacity="0.3" />
        <stop offset="1" stopColor="var(--accent)" stopOpacity="0.05" />
      </linearGradient>
    </defs>

    {/* 画框（微斜，双线描边） */}
    <motion.rect
      x="50"
      y="26"
      width="140"
      height="104"
      rx="16"
      transform="rotate(-4 50 26)"
      stroke="var(--accent-light)"
      strokeWidth="2.2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    />
    <motion.g transform="rotate(-4 64 40)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
      {/* 内框虚线 */}
      <rect
        x="64"
        y="40"
        width="112"
        height="78"
        rx="10"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        strokeDasharray="5 7"
      />

      {/* 旭日辉光 + 渐变太阳 */}
      <motion.circle
        cx="120"
        cy="66"
        r="26"
        fill="var(--accent-light)"
        opacity="0.16"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.16 }}
        transition={{ type: 'spring', stiffness: 200, damping: 16, delay: 0.35 }}
      />
      <motion.circle
        cx="120"
        cy="66"
        r="14.5"
        stroke="var(--accent-light)"
        strokeWidth="1.2"
        opacity="0.4"
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        transition={{ duration: 0.7, delay: 0.45 }}
      />
      <motion.circle
        cx="120"
        cy="66"
        r="9"
        fill="url(#gEmptySun)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.35 }}
      />

      {/* 光芒：整组慢速自转（CSS 动画驱动，framer 只做入场） */}
      <motion.g
        className="g-empty-rays"
        stroke="var(--accent-light)"
        strokeWidth="1.3"
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <path d="M120 42 v-8 M120 90 v8 M93 66 h-8 M147 66 h8" />
        <path d="M101 47 l-5.6 -5.6 M139 47 l5.6 -5.6 M101 85 l-5.6 5.6 M139 85 l5.6 5.6" />
      </motion.g>

      {/* 远山：渐变雾层 */}
      <motion.path
        d="M60 118 L86 80 L98 92 L110 84 L140 118 Z"
        fill="url(#gEmptyMtn)"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ ...drawTransition, delay: 0.4 }}
      />
      {/* 近山：手绘双层描线 */}
      <motion.path
        d="M64 118 L90 92 L102 104 L116 95 L138 118"
        stroke="var(--accent-light)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ ...drawTransition, delay: 0.55 }}
      />
      <motion.path
        d="M74 118 L94 106 L112 118"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ ...drawTransition, delay: 0.7 }}
      />
      {/* 地平线与草丛 */}
      <path d="M62 118 h116" stroke="var(--border-subtle)" strokeWidth="1.2" strokeDasharray="3 5" />
      <motion.g
        stroke="var(--accent-light)"
        strokeWidth="1.3"
        strokeLinecap="round"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ duration: 0.5, delay: 0.85 }}
      >
        <path d="M74 118 l2.4 -5 M76.5 118 l-2 -3.5 M118 118 l2.4 -5 M120.5 118 l-2 -3.5" />
      </motion.g>
    </motion.g>

    {/* 漂浮迷你照片卡（画框外右下，旋转悬浮） */}
    <motion.g
      transform="rotate(8 196 136)"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.6 }}
    >
      <rect
        x="178"
        y="118"
        width="50"
        height="40"
        rx="9"
        fill="var(--bg-surface)"
        stroke="var(--accent-light)"
        strokeWidth="1.6"
      />
      <circle cx="194" cy="128" r="4" fill="var(--accent-light)" opacity="0.9" />
      {/* 迷你浏览曲线 */}
      <motion.path
        d="M184 152 L196 138 L204 146 L212 141 L220 152"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ ...drawTransition, delay: 0.85 }}
      />
      <path d="M182 152 h36" stroke="var(--border-subtle)" strokeWidth="1.2" />
    </motion.g>

    {/* 星光点缀（四角 + 漂浮气泡） */}
    <motion.path
      d="M32 40 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6 z"
      fill="var(--accent-light)"
      opacity="0.9"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.8 }}
    />
    <motion.path
      d="M208 34 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2 z"
      fill="var(--accent)"
      opacity="0.75"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.75 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.95 }}
    />
    <g className="g-empty-bubble">
      <circle cx="36" cy="128" r="2.6" fill="var(--accent-light)" opacity="0.55" />
    </g>
    <g className="g-empty-bubble" style={{ animationDelay: '1.6s' }}>
      <circle cx="206" cy="96" r="2" fill="var(--accent)" opacity="0.5" />
    </g>
    <g className="g-empty-bubble" style={{ animationDelay: '2.8s' }}>
      <circle cx="150" cy="160" r="2.2" fill="var(--accent-light)" opacity="0.45" />
    </g>
  </svg>
);

/** 图库专属空状态（青蓝手绘插画，与相册组件的 EmptyState 互不干扰） */
export const GalleryEmpty: React.FC<GalleryEmptyProps> = ({ title, description, actionText, onAction }) => (
  <motion.div
    className="g-empty"
    initial={{ opacity: 0, y: 26 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
  >
    <div className="g-empty-art">
      <GalleryEmptyArt />
    </div>
    <h3 className="g-empty-title">{title}</h3>
    {description && <p className="g-empty-desc">{description}</p>}
    {actionText && onAction && (
      <motion.button
        className="g-empty-action"
        onClick={onAction}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        {actionText}
      </motion.button>
    )}
  </motion.div>
);
