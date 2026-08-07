import React from 'react';
import { motion } from 'framer-motion';

export const Loader: React.FC<{ size?: number; text?: string }> = ({ size = 48, text }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px' }}>
      <motion.div
        style={{
          width: size,
          height: size,
          border: '3px solid var(--border-subtle)',
          borderTop: '3px solid var(--accent)',
          borderRadius: '50%',
        }}
        animate={{ rotate: 360 }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration: 0.8,
        }}
      />
      {text && (
        <motion.span
          style={{ fontSize: '14px', color: 'var(--text-muted)', letterSpacing: '0.05em' }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
        >
          {text}
        </motion.span>
      )}
    </div>
  );
};
