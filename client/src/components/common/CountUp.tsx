import React, { useEffect, useRef } from 'react';
import { animate, useInView } from 'framer-motion';

interface CountUpProps {
  /** 目标数值 */
  value: number;
  /** 滚动时长（秒） */
  duration?: number;
  /** 小数位（不传 format 时生效） */
  decimals?: number;
  /** 自定义每帧渲染格式 */
  format?: (value: number) => string;
  className?: string;
}

/**
 * 数字滚动增长组件：进入视口后从旧值平滑滚动到目标值，
 * 数据刷新时自动衔接新一次滚动，为大盘数字注入视觉动感
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  duration = 1.4,
  decimals = 0,
  format,
  className,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-32px' });
  const fromRef = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const render = (v: number) => {
      el.textContent = format
        ? format(v)
        : v.toLocaleString('zh-CN', { maximumFractionDigits: decimals });
    };

    render(fromRef.current);
    if (!inView) return;

    const controls = animate(fromRef.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: render,
      onComplete: () => {
        fromRef.current = value;
      },
    });
    return () => controls.stop();
  }, [inView, value, duration, decimals, format]);

  return <span ref={ref} className={className} aria-label={String(value)} />;
};
