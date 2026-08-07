import React from 'react';
import { motion } from 'framer-motion';
import './galleryList.css';

interface GalleryEmptyProps {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

const drawTransition = { duration: 1.05, ease: 'easeInOut' as const };

/** 手绘插画：微斜画框 + 层叠山峦 + 旭日与星光（全部 CSS 变量着色） */
const GalleryEmptyArt: React.FC = () => (
  <svg viewBox="0 0 240 170" fill="none" className="g-empty-svg" aria-hidden>
    {/* 画框（微斜，双线描边） */}
    <motion.rect
      x="52"
      y="30"
      width="136"
      height="100"
      rx="14"
      transform="rotate(-4 52 30)"
      stroke="var(--accent-light)"
      strokeWidth="2.2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
    />
    <motion.g transform="rotate(-4 66 44)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
      {/* 内框虚线 */}
      <rect
        x="66"
        y="44"
        width="108"
        height="76"
        rx="9"
        stroke="var(--border-subtle)"
        strokeWidth="1.5"
        strokeDasharray="5 7"
      />
      {/* 旭日 + 光芒 */}
      <motion.circle
        cx="120"
        cy="60"
        r="8"
        fill="var(--accent-light)"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 15, delay: 0.35 }}
      />
      <motion.g
        stroke="var(--accent-light)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.75, 0.35, 0.75] }}
        transition={{ opacity: { duration: 0.6, delay: 0.7 }, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
      >
        <path d="M120 47 v-6 M120 73 v6 M105 60 h-6 M135 60 h6" />
      </motion.g>
      {/* 层叠山峦 */}
      <motion.path
        d="M70 106 L94 72 L106 86 L116 78 L140 106"
        stroke="var(--accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ ...drawTransition, delay: 0.35 }}
      />
      <motion.path
        d="M74 106 L92 90 L112 106"
        stroke="var(--accent-light)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.65"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ ...drawTransition, delay: 0.55 }}
      />
      {/* 地平线 */}
      <path d="M66 106 h108" stroke="var(--border-subtle)" strokeWidth="1.2" strokeDasharray="3 5" />
    </motion.g>

    {/* 星光点缀 */}
    <motion.path
      d="M34 42 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 z"
      fill="var(--accent-light)"
      opacity="0.9"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.9 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.8 }}
    />

    {/* 画框外的漂浮迷你卡片 */}
    <motion.g
      transform="rotate(8 196 118)"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.55 }}
    >
      <rect
        x="180"
        y="104"
        width="46"
        height="36"
        rx="8"
        stroke="var(--accent-light)"
        strokeWidth="1.6"
      />
      <circle cx="206" cy="112" r="3.5" fill="var(--accent-light)" opacity="0.85" />
      <path
        d="M186 132 L196 118 L204 126 L212 132"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </motion.g>
  </svg>
);

/** 图库专属空状态（画框 + 山峦 + 旭日插画，与相册组件的 EmptyState 互不干扰） */
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
