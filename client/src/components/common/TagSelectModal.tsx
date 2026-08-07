import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tag } from '../../services/api';
import { Check, X } from 'lucide-react';
import './modals.css';

interface TagSelectModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  mode: 'add' | 'remove';
  tags: Tag[];
  /** 默认勾选的标签 id（解绑模式下通常为当前查看的标签） */
  defaultCheckedIds?: string[];
  confirmText?: string;
  onClose: () => void;
  onConfirm: (tagIds: string[]) => void;
}

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const cardMotion = {
  initial: { opacity: 0, y: 36, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 30 },
  },
  exit: { opacity: 0, y: 18, scale: 0.96, transition: { duration: 0.16 } },
};

/** 标签多选面板：批量打标 / 批量解绑共用 */
export const TagSelectModal: React.FC<TagSelectModalProps> = ({
  open,
  title,
  subtitle,
  mode,
  tags,
  defaultCheckedIds = [],
  confirmText,
  onClose,
  onConfirm,
}) => {
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setChecked(mode === 'remove' ? defaultCheckedIds : []);
    }
  }, [open, mode, defaultCheckedIds]);

  const toggle = (id: string) => {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" {...overlayMotion} onClick={onClose}>
          <motion.div
            className="modal-card"
            {...cardMotion}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-head">
              <div>
                <h3 className="modal-title">{title}</h3>
                {subtitle && <p className="modal-subtitle">{subtitle}</p>}
              </div>
              <X size={20} strokeWidth={1.5} className="modal-close" onClick={onClose} />
            </div>

            {tags.length === 0 ? (
              <div className="picker-empty">
                还没有任何标签，请先创建标签后再来打标
              </div>
            ) : (
              <div className="tagselect-list">
                {tags.map((tag) => (
                  <motion.button
                    key={tag.id}
                    type="button"
                    className={`tagselect-chip ${checked.includes(tag.id) ? 'checked' : ''}`}
                    onClick={() => toggle(tag.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <span className="tagselect-dot" style={{ backgroundColor: tag.color || 'var(--accent)' }} />
                    <span>{tag.name}</span>
                    {checked.includes(tag.id) && <Check size={14} strokeWidth={1.5} className="tagselect-check" />}
                  </motion.button>
                ))}
              </div>
            )}

            <div className="modal-footer">
              <button className="modal-btn" onClick={onClose}>
                取消
              </button>
              <button
                className={`modal-btn ${mode === 'remove' ? 'modal-btn-danger' : 'modal-btn-primary'}`}
                disabled={checked.length === 0}
                onClick={() => {
                  onConfirm(checked);
                  setChecked([]);
                }}
              >
                {confirmText || (mode === 'remove' ? '确认解绑' : '确认打标')}（{checked.length}）
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
