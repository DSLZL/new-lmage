import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export type LoaderSize = 'sm' | 'md' | 'lg';

interface LoaderProps {
  /** 尺寸变体：sm=28 / md=44 / lg=64 */
  size?: LoaderSize;
  text?: string;
  className?: string;
}

const SIZE_CONFIG: Record<LoaderSize, { px: number; ring: number; gap: number; font: number }> = {
  sm: { px: 28, ring: 3, gap: 10, font: 12 },
  md: { px: 44, ring: 4, gap: 14, font: 13 },
  lg: { px: 64, ring: 5, gap: 18, font: 14 },
};

export const Loader: React.FC<LoaderProps> = ({ size = 'md', text, className }) => {
  const reduceMotion = useReducedMotion();
  const { px, ring, gap, font } = SIZE_CONFIG[size];

  const spinProps = reduceMotion
    ? {}
    : {
        animate: { rotate: 360 },
        transition: { repeat: Infinity, ease: 'linear' as const, duration: 0.9 },
      };

  const breatheProps = reduceMotion
    ? {}
    : {
        animate: { opacity: [0.45, 1, 0.45] },
        transition: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' as const },
      };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        padding: 'var(--space-5)',
      }}
    >
      <div style={{ position: 'relative', width: px, height: px }}>
        {/* 底环（静态轨道） */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `${ring}px solid var(--border-subtle)`,
          }}
        />
        {/* 青蓝渐变旋转环 */}
        <motion.div
          {...spinProps}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, transparent 15%, var(--accent-light), var(--accent-blue))',
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
            boxShadow: '0 0 22px -4px var(--accent)',
          }}
        />
      </div>
      {text && (
        <motion.span
          {...breatheProps}
          style={{
            fontSize: font,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
          }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
};
