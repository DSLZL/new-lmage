import React from 'react';
import { motion } from 'framer-motion';
import './EmptyState.css';

interface EmptyStateProps {
  variant?: 'album' | 'tag';
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}

/** 手绘插画空状态：相册（画框 + 山峦） / 标签（便签挂牌） */
export const EmptyState: React.FC<EmptyStateProps> = ({
  variant = 'album',
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="empty-state-art">
        {variant === 'album' ? <AlbumArt /> : <TagArt />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-desc">{description}</p>}
      {actionText && onAction && (
        <motion.button
          className="empty-state-action"
          onClick={onAction}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          {actionText}
        </motion.button>
      )}
    </motion.div>
  );
};

const drawTransition = { duration: 1.1, ease: 'easeInOut' as const };

/** 相册插画：微斜画框 + 山峦轮廓 + 旭日 */
const AlbumArt: React.FC = () => (
  <svg viewBox="0 0 220 150" fill="none" className="empty-art-svg" aria-hidden>
    <motion.rect
      x="54" y="20" width="114" height="90" rx="12"
      transform="rotate(-3 54 20)"
      stroke="var(--accent-light)"
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.15 }}
    />
    <rect
      x="66" y="31" width="90" height="68" rx="8"
      transform="rotate(-3 66 31)"
      stroke="var(--border-subtle)"
      strokeWidth="1.5"
      strokeDasharray="4 7"
      strokeLinecap="round"
    />
    <motion.path
      d="M72 82 L94 54 L106 68 L115 60 L138 82"
      stroke="var(--accent)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={drawTransition}
    />
    <motion.circle
      cx="133" cy="46" r="6"
      fill="var(--accent-light)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.45, delay: 0.8 }}
    />
    <circle
      cx="133" cy="46" r="9.5"
      stroke="var(--accent-light)"
      strokeWidth="1.2"
      strokeDasharray="2 4"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M162 42 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"
      fill="var(--accent-light)"
      opacity="0.85"
    />
  </svg>
);

/** 标签插画：挂牌便签 + 打孔 + 虚线挂绳 */
const TagArt: React.FC = () => (
  <svg viewBox="0 0 220 150" fill="none" className="empty-art-svg" aria-hidden>
    <motion.path
      d="M56 28 h94 l26 27 -26 27 h-94 a8 8 0 0 1 -8 -8 v-38 a8 8 0 0 1 8 -8 z"
      transform="rotate(-4 100 55)"
      stroke="var(--accent-light)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={drawTransition}
    />
    <motion.circle
      cx="78" cy="58" r="5.5"
      stroke="var(--accent)"
      strokeWidth="1.8"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.4, delay: 0.75 }}
    />
    <path
      d="M98 47 h36 M98 60 h28"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.75"
    />
    <motion.path
      d="M178 84 q15 6 8 22 q-8 12 -24 10"
      stroke="var(--text-muted)"
      strokeWidth="1.6"
      strokeDasharray="3 6"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1, delay: 0.3 }}
    />
    <path
      d="M148 32 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"
      fill="var(--accent-light)"
      opacity="0.85"
    />
  </svg>
);
