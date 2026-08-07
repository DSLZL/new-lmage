import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Tag } from '../../services/api';
import { Check } from 'lucide-react';
import { MobileSheet } from './MobileSheet';
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

/** 标签多选面板：批量打标 / 批量解绑共用（移动端底部弹层，桌面自动居中） */
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
    <MobileSheet open={open} onClose={onClose} title={title} maxHeight="78vh">
      {subtitle && <p className="modal-subtitle tagselect-subtitle">{subtitle}</p>}

      {tags.length === 0 ? (
        <div className="picker-empty">还没有任何标签，请先创建标签后再来打标</div>
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
    </MobileSheet>
  );
};
