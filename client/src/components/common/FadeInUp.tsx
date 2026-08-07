import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import './FadeInUp.css';

export interface FadeInUpProps {
  /** 包裹内容（任意 ReactNode） */
  children: React.ReactNode;
  /** 入场延迟（秒），配合 index 错峰递增，默认 0 */
  delay?: number;
  /** 动画时长（秒），默认 0.55 */
  duration?: number;
  /** 上浮距离（px），默认 22 */
  distance?: number;
  /** true 时滚动进入视口才触发；false 时挂载即播放，默认 false */
  inView?: boolean;
  /** 视口触发后是否只播放一次，默认 true */
  once?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/** 缓动曲线：先快后慢，收尾轻盈 */
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * FadeInUp — 入场动画容器（错峰上浮）
 *
 * 包裹子元素淡入 + 上浮入场，通过 delay 实现错峰递增：
 * 列表场景：{items.map((item, i) => <FadeInUp key={item.id} delay={i * 0.08}>...)}
 * 滚动场景：<FadeInUp inView>...</FadeInUp>
 * 自动尊重 prefers-reduced-motion（直接渲染，不做动画）。
 */
export const FadeInUp: React.FC<FadeInUpProps> = ({
  children,
  delay = 0,
  duration = 0.55,
  distance = 22,
  inView = false,
  once = true,
  className,
  style,
}) => {
  const reduceMotion = useReducedMotion();
  const cls = ['fade-in-up', className].filter(Boolean).join(' ') || undefined;

  /* 系统关闭动效时直接渲染 */
  if (reduceMotion) {
    return (
      <div className={cls} style={style}>
        {children}
      </div>
    );
  }

  const initial = { opacity: 0, y: distance };
  const visible = { opacity: 1, y: 0 };
  const transition = { duration, delay, ease: EASE };

  if (inView) {
    return (
      <motion.div
        className={cls}
        style={style}
        initial={initial}
        whileInView={visible}
        viewport={{ once, margin: '0px 0px -48px 0px' }}
        transition={transition}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cls}
      style={style}
      initial={initial}
      animate={visible}
      transition={transition}
    >
      {children}
    </motion.div>
  );
};
