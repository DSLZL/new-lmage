import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverGlow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, onClick, hoverGlow = true }) => {
  return (
    <motion.div
      onClick={onClick}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-premium)',
        boxShadow: 'var(--glass-shadow)',
        padding: '24px',
        overflow: 'hidden',
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
      }}
      whileHover={onClick || hoverGlow ? {
        borderColor: 'var(--border-active)',
        boxShadow: 'var(--accent-glow)',
      } : undefined}
      transition={{ duration: 0.2 }}
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
