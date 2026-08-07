import React, { useEffect } from 'react';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import './MobileSheet.css';

export interface MobileSheetProps {
  /** 是否展开弹层 */
  open: boolean;
  /** 关闭回调：遮罩点击、Esc、顶部下滑手势均会触发 */
  onClose: () => void;
  /** 顶栏标题（可选；不传则仅显示拖拽手柄条） */
  title?: string;
  /** 弹层内容（动作列表 / 表单等） */
  children?: React.ReactNode;
  /** 面板最大高度，默认 '82vh' */
  maxHeight?: string;
  /** 展开期间是否锁定背景滚动，默认 true */
  lockScroll?: boolean;
  /** 自定义面板类名（追加在 mobile-sheet 之后） */
  className?: string;
  /** 无障碍标签，默认取 title 或 '底部弹层' */
  ariaLabel?: string;
}

/**
 * MobileSheet — 移动端底部滑出动作弹层
 *
 * 特性：
 * - AnimatePresence + spring 从底部滑出 / 滑回
 * - 毛玻璃圆角顶栏 + 拖拽手柄条（按住手柄区下滑即可关闭）
 * - 遮罩点击关闭、Esc 关闭
 * - 展开时锁定背景滚动，底部 safe-area 适配
 *
 * 用法：
 * <MobileSheet open={open} onClose={() => setOpen(false)} title="更多操作">
 *   <button>操作一</button>
 * </MobileSheet>
 */
export const MobileSheet: React.FC<MobileSheetProps> = ({
  open,
  onClose,
  title,
  children,
  maxHeight = '82vh',
  lockScroll = true,
  className,
  ariaLabel,
}) => {
  const dragControls = useDragControls();

  /* Esc 关闭 */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  /* 展开期间锁定背景滚动 */
  useEffect(() => {
    if (!lockScroll || !open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, lockScroll]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="mobile-sheet-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          transition={{ duration: 0.22 }}
          onClick={(event) => {
            /* 仅点击遮罩本身时关闭（点击面板不关闭） */
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className={`mobile-sheet${className ? ` ${className}` : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? title ?? '底部弹层'}
            style={{ maxHeight }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { duration: 0.24, ease: 'easeIn' } }}
            transition={{ type: 'spring', stiffness: 400, damping: 36, mass: 0.9 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              /* 下滑超过阈值即关闭（松手回弹由 spring 接管） */
              if (info.offset.y > 96 || info.velocity.y > 480) onClose();
            }}
          >
            <div
              className="mobile-sheet-grab"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className="mobile-sheet-handle" aria-hidden="true" />
              {title && <h2 className="mobile-sheet-title">{title}</h2>}
            </div>
            {children && <div className="mobile-sheet-content">{children}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
