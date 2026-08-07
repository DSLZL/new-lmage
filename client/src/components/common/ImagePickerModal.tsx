import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import type { Image } from '../../services/api';
import { Check, LoaderCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import { MobileSheet } from './MobileSheet';
import './modals.css';

interface ImagePickerModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  /** 需要从图库中排除的图片 id（已在当前相册内） */
  excludeIds: string[];
  confirmText?: string;
  /** 提交进行中时禁用操作按钮 */
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

/** 图库图片选择器：供相册批量加图等场景复用（移动端底部弹层，桌面自动居中） */
export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  open,
  title,
  subtitle,
  excludeIds,
  confirmText = '确认加入',
  submitting = false,
  onClose,
  onConfirm,
}) => {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected([]);
    setLoading(true);
    api
      .getImages(1, 500)
      .then((res) => setImages(res.images))
      .catch(() => toast.error('加载图库图片失败'))
      .finally(() => setLoading(false));
  }, [open]);

  const available = useMemo(() => {
    const exclude = new Set(excludeIds);
    const q = query.trim().toLowerCase();
    return images.filter(
      (img) => !exclude.has(img.id) && (!q || img.file_name.toLowerCase().includes(q))
    );
  }, [images, excludeIds, query]);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (available.length === 0) return;
    const allSelected = available.every((img) => selected.includes(img.id));
    setSelected((prev) =>
      allSelected ? prev.filter((x) => !available.some((img) => img.id === x)) : Array.from(new Set([...prev, ...available.map((img) => img.id)]))
    );
  };

  return (
    <MobileSheet open={open} onClose={onClose} title={title} maxHeight="86vh">
      {subtitle && <p className="modal-subtitle picker-subtitle">{subtitle}</p>}

      <div className="picker-search">
        <Search size={14} strokeWidth={1.5} className="picker-search-icon" />
        <input
          className="modal-input"
          placeholder="搜索图片名称..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="picker-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <LoaderCircle size={14} strokeWidth={1.5} style={{ animation: 'modal-spin 0.8s linear infinite' }} />
          正在载入图库...
        </div>
      ) : (
        <div className="picker-grid">
          {available.length === 0 ? (
            <div className="picker-empty">
              {query ? '没有匹配的图片' : '图库中暂无可用图片，请先到图库上传'}
            </div>
          ) : (
            available.map((img) => (
              <motion.div
                key={img.id}
                className={`picker-item ${selected.includes(img.id) ? 'selected' : ''}`}
                onClick={() => toggle(img.id)}
                whileHover={{ y: -3 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22 }}
              >
                <img src={api.getFileUrl(img.id, true)} alt={img.file_name} loading="lazy" />
                <span className="picker-check">
                  {selected.includes(img.id) && <Check size={13} strokeWidth={1.5} />}
                </span>
                <span className="picker-name">{img.file_name}</span>
              </motion.div>
            ))
          )}
        </div>
      )}

      <div className="picker-bar">
        <span>
          已选 {selected.length} 张{available.length > 0 && `（共 ${available.length} 张可选）`}
        </span>
        {available.length > 0 && (
          <button className="modal-btn" onClick={toggleAll} style={{ height: 34, padding: '0 14px', fontSize: 13 }}>
            {available.every((img) => selected.includes(img.id)) ? '取消全选' : '全选'}
          </button>
        )}
      </div>

      <div className="modal-footer">
        <button className="modal-btn" onClick={onClose} disabled={submitting}>
          取消
        </button>
        <button
          className="modal-btn modal-btn-primary"
          disabled={selected.length === 0 || submitting}
          onClick={() => {
            onConfirm(selected);
            setSelected([]);
          }}
        >
          {submitting && <span className="modal-spinner" />}
          {confirmText}（{selected.length}）
        </button>
      </div>
    </MobileSheet>
  );
};
