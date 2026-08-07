import React from 'react';
import { motion } from 'framer-motion';

export type GlassCardPadding = 'none' | 'sm' | 'md' | 'lg';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  /** 是否启用 hover 微浮与发光（默认开启） */
  hoverGlow?: boolean;
  /** 内边距变体：none=0 / sm=16px / md=24px / lg=32px */
  padding?: GlassCardPadding;
}

const PADDING_MAP: Record<Exclude<GlassCardPadding, 'md'>, string> = {
  none: '0px',
  sm: 'var(--space-4)',
  lg: 'var(--space-6)',
};

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  style,
  onClick,
  hoverGlow = true,
  padding = 'md',
}) => {
  const interactive = hoverGlow || Boolean(onClick);

  const cardStyle: React.CSSProperties = {
    background: 'var(--glass-bg)',
    backdropFilter: 'var(--glass-blur)',
    WebkitBackdropFilter: 'var(--glass-blur)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--radius-premium)',
    boxShadow: 'var(--glass-shadow)',
    /* 默认 padding 走 token；页面可用 --glass-card-padding 覆写 */
    padding: 'var(--glass-card-padding, var(--card-padding))',
    overflow: 'hidden',
    position: 'relative',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  /* 非默认内边距变体：写入自定义属性，保证单一 padding 来源 */
  if (padding !== 'md') {
    Object.assign(cardStyle, { '--glass-card-padding': PADDING_MAP[padding] });
  }

  return (
    <motion.div
      className={className}
      onClick={onClick}
      style={cardStyle}
      whileHover={
        interactive
          ? {
              y: -2,
              background: 'var(--glass-bg-hover)',
              borderColor: 'var(--border-active)',
              boxShadow: 'var(--glass-shadow-hover)',
            }
          : undefined
      }
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {/* 顶部微妙的发光线条装饰 (适配亮暗) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, var(--glass-border), transparent)',
        }}
      />
      {children}
    </motion.div>
  );
};
