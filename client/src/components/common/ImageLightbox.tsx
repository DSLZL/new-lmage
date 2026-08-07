import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileType,
  HardDrive,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Image } from '../../services/api';
import { formatBytes, formatNumber } from './format';
import { toast } from 'sonner';
import './galleryLightbox.css';

interface ImageLightboxProps {
  image: Image | null;
  onClose: () => void;
  onRequestDelete: (image: Image) => void;
}

interface LinkGroup {
  key: string;
  label: string;
  value: string;
}

/** 高精度大图详情与外链复制光箱（弹簧入场 / 平滑退出） */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ image, onClose, onRequestDelete }) => {
  const [copied, setCopied] = useState<string | null>(null);

  // Esc 关闭 + 背景滚动锁定
  useEffect(() => {
    if (!image) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [image, onClose]);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success('链接已复制到剪贴板');
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {
      toast.error('复制失败，请手动选择复制');
    }
  };

  const groups: LinkGroup[] = image
    ? (() => {
        const rawUrl = api.getFileUrl(image.id);
        return [
          { key: 'raw', label: '原始直链', value: rawUrl },
          { key: 'md', label: 'Markdown', value: `![${image.file_name}](${rawUrl})` },
          { key: 'html', label: 'HTML', value: `<img src="${rawUrl}" alt="${image.file_name}" />` },
          { key: 'bb', label: 'BBCode（论坛发帖）', value: `[img]${rawUrl}[/img]` },
        ];
      })()
    : [];

  return (
    <AnimatePresence>
      {image && (
        <motion.div
          className="lightbox-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="lightbox-card"
            initial={{ opacity: 0, scale: 0.92, y: 44 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { type: 'spring', stiffness: 300, damping: 26 },
            }}
            exit={{ opacity: 0, scale: 0.94, y: 26, transition: { duration: 0.18 } }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={image.file_name}
          >
            {/* 左：大图预览 */}
            <div className="lightbox-preview">
              <motion.img
                src={api.getFileUrl(image.id)}
                alt={image.file_name}
                className="lightbox-preview-img"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.08 }}
                whileHover={{ scale: 1.025 }}
                draggable={false}
              />
              <a
                className="lightbox-open-link"
                href={api.getFileUrl(image.id)}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={13} strokeWidth={1.5} />
                新窗口打开
              </a>
              {/* 移动端悬浮关闭（全屏态下快速退出，桌面端隐藏） */}
              <button className="lightbox-float-close" onClick={onClose} aria-label="关闭预览">
                <X size={19} strokeWidth={1.5} />
              </button>
            </div>

            {/* 右：属性与外链 */}
            <div className="lightbox-info">
              <div className="lightbox-head">
                <div className="lightbox-title-wrap">
                  <h3 className="lightbox-title">{image.file_name}</h3>
                  <span className="lightbox-mime">{image.mime_type}</span>
                </div>
                <button className="lightbox-close" onClick={onClose} aria-label="关闭预览">
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>

              <div className="lightbox-stats">
                <div className="lightbox-stat">
                  <HardDrive size={15} strokeWidth={1.5} />
                  <span className="lightbox-stat-label">大小</span>
                  <span className="lightbox-stat-value">{formatBytes(image.file_size)}</span>
                </div>
                <div className="lightbox-stat">
                  <Eye size={15} strokeWidth={1.5} />
                  <span className="lightbox-stat-label">访问</span>
                  <span className="lightbox-stat-value">{formatNumber(image.views + 1)} 次</span>
                </div>
                <div className="lightbox-stat">
                  <Calendar size={15} strokeWidth={1.5} />
                  <span className="lightbox-stat-label">上传</span>
                  <span className="lightbox-stat-value">
                    {new Date(image.uploaded_at).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="lightbox-stat">
                  <FileType size={15} strokeWidth={1.5} />
                  <span className="lightbox-stat-label">格式</span>
                  <span className="lightbox-stat-value">
                    {image.file_name.split('.').pop()?.toUpperCase() ?? '未知'}
                  </span>
                </div>
              </div>

              <div className="lightbox-links">
                {groups.map((g) => (
                  <div key={g.key} className="link-group">
                    <span className="link-label">{g.label}</span>
                    <div className="link-input-row">
                      <input
                        readOnly
                        value={g.value}
                        className="link-copy-input"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <motion.button
                        className="copy-mini-btn"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => void copyText(g.value, g.key)}
                        aria-label={`复制${g.label}`}
                      >
                        {copied === g.key ? (
                          <Check size={15} strokeWidth={1.5} />
                        ) : (
                          <Copy size={15} strokeWidth={1.5} />
                        )}
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>

              <button className="lightbox-delete" onClick={() => onRequestDelete(image)}>
                <Trash2 size={15} strokeWidth={1.5} />
                在物理世界永久彻底删除
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
