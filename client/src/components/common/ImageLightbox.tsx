import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  FileType,
  FolderHeart,
  HardDrive,
  Share2,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Album, Image, Tag } from '../../services/api';
import { formatBytes, formatNumber } from './format';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { AlbumSelectModal } from './AlbumSelectModal';
import { MobileSheet } from './MobileSheet';
import './galleryLightbox.css';

interface ImageLightboxProps {
  image: Image | null;
  onClose: () => void;
  onRequestDelete: (image: Image) => void;
  /** 归档 / 标签变化后的回调（外部刷新列表状态） */
  onChanged?: () => void;
}

type LinkFormat = 'raw' | 'md' | 'html' | 'bb';

const LINK_FORMATS: { key: LinkFormat; label: string }[] = [
  { key: 'raw', label: '直链' },
  { key: 'md', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'bb', label: 'BBCode' },
];

/**
 * ImageLightbox — 影集详情光箱（极致移动端排版 + 全功能联动）
 *
 * 联动网络：
 * - 相册：展示所在相册，一键归档 / 更换 / 解除
 * - 标签：展示当前标签，内嵌编辑器同步增删
 * - 外链：折叠式分享面板，四种格式一键复制
 */
export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  image,
  onClose,
  onRequestDelete,
  onChanged,
}) => {
  const { user } = useAuth();
  const loggedIn = !!user;

  // 外链折叠面板
  const [linksOpen, setLinksOpen] = useState(false);
  const [format, setFormat] = useState<LinkFormat>('raw');
  const [copied, setCopied] = useState(false);

  // 联动数据：相册 / 全部标签 / 当前图标签
  const [albums, setAlbums] = useState<Album[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [imageTags, setImageTags] = useState<Tag[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState<Set<string>>(new Set());
  const [tagSaving, setTagSaving] = useState(false);

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

  // 打开时并行拉取联动数据（游客跳过：联动区仅登录用户可见）
  useEffect(() => {
    if (!image || !loggedIn) {
      setAlbums([]);
      setAllTags([]);
      setImageTags([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const [albumsRes, tagsRes, imgTagsRes] = await Promise.all([
          api.getAlbums().catch(() => null),
          api.getTags().catch(() => null),
          api.getImageTags(image.id).catch(() => null),
        ]);
        if (cancelled) return;
        setAlbums(albumsRes?.albums ?? []);
        setAllTags(tagsRes?.tags ?? []);
        setImageTags(imgTagsRes?.tags ?? []);
      } catch {
        /* 联动数据加载失败静默，不阻塞看图 */
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [image, loggedIn]);

  // 打开时重置折叠状态
  useEffect(() => {
    setLinksOpen(false);
    setFormat('raw');
    setCopied(false);
    setPickerOpen(false);
    setTagEditorOpen(false);
  }, [image?.id]);

  const currentAlbum = image?.album_id
    ? albums.find((a) => a.id === image.album_id)
    : undefined;

  /* ---------- 外链 ---------- */

  const rawUrl = image ? api.getFileUrl(image.id) : '';
  const linkValue = image
    ? {
        raw: rawUrl,
        md: `![${image.file_name}](${rawUrl})`,
        html: `<img src="${rawUrl}" alt="${image.file_name}" />`,
        bb: `[img]${rawUrl}[/img]`,
      }[format]
    : '';

  const copyLink = async () => {
    if (!linkValue) return;
    try {
      await navigator.clipboard.writeText(linkValue);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('复制失败，请手动选择复制');
    }
  };

  /* ---------- 标签同步编辑 ---------- */

  const openTagEditor = () => {
    setTagDraft(new Set(imageTags.map((t) => t.id)));
    setTagEditorOpen(true);
  };

  const saveTags = async () => {
    if (!image || tagSaving) return;
    const existing = new Set(imageTags.map((t) => t.id));
    const toAdd = [...tagDraft].filter((id) => !existing.has(id));
    const toRemove = [...existing].filter((id) => !tagDraft.has(id));
    if (toAdd.length === 0 && toRemove.length === 0) {
      setTagEditorOpen(false);
      return;
    }
    setTagSaving(true);
    try {
      if (toAdd.length > 0) await api.batchTagImages([image.id], toAdd, 'add');
      if (toRemove.length > 0) await api.batchTagImages([image.id], toRemove, 'remove');
      toast.success('标签已同步');
      const res = await api.getImageTags(image.id);
      setImageTags(res.tags);
      setTagEditorOpen(false);
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message ?? '标签同步失败');
    } finally {
      setTagSaving(false);
    }
  };

  /* ---------- 归档变化 ---------- */

  const handleAlbumChanged = useCallback(() => {
    onChanged?.();
    // 重新拉取相册列表以同步「所在相册」展示
    api
      .getAlbums()
      .then((res) => setAlbums(res.albums))
      .catch(() => undefined);
  }, [onChanged]);

  /* ---------- 渲染 ---------- */

  return (
    <>
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
              {/* 预览区 */}
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
                <button className="lightbox-float-close" onClick={onClose} aria-label="关闭预览">
                  <X size={19} strokeWidth={1.5} />
                </button>
              </div>

              {/* 信息区 */}
              <div className="lightbox-info">
                {/* 头部：文件名 + 格式徽标 */}
                <div className="lightbox-head">
                  <div className="lightbox-title-wrap">
                    <h3 className="lightbox-title">{image.file_name}</h3>
                    <span className="lightbox-mime">
                      {image.file_name.split('.').pop()?.toUpperCase() ?? '未知'}
                    </span>
                  </div>
                  <button className="lightbox-close" onClick={onClose} aria-label="关闭预览">
                    <X size={14} strokeWidth={1.5} />
                  </button>
                </div>

                {/* 元数据 2x2 */}
                <div className="lightbox-stats">
                  <div className="lightbox-stat">
                    <HardDrive size={15} strokeWidth={1.5} />
                    <span className="lightbox-stat-label">大小</span>
                    <span className="lightbox-stat-value">{formatBytes(image.file_size)}</span>
                  </div>
                  <div className="lightbox-stat">
                    <Eye size={15} strokeWidth={1.5} />
                    <span className="lightbox-stat-label">访问</span>
                    <span className="lightbox-stat-value">{formatNumber(image.views + 1)}</span>
                  </div>
                  <div className="lightbox-stat">
                    <Calendar size={15} strokeWidth={1.5} />
                    <span className="lightbox-stat-label">上传</span>
                    <span className="lightbox-stat-value">
                      {new Date(image.uploaded_at).toLocaleDateString('zh-CN')}
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

                {/* 联动区：相册 + 标签（登录用户） */}
                {loggedIn && (
                  <div className="lightbox-rel">
                    <button
                      type="button"
                      className="lightbox-rel-row"
                      onClick={() => setPickerOpen(true)}
                    >
                      <span className="lightbox-rel-icon">
                        <FolderHeart size={15} strokeWidth={1.5} />
                      </span>
                      <span className="lightbox-rel-body">
                        <span className="lightbox-rel-label">所在相册</span>
                        <span className="lightbox-rel-value">
                          {currentAlbum?.name ?? '未归档'}
                        </span>
                      </span>
                      <span className="lightbox-rel-action">
                        {currentAlbum ? '更换' : '归档'}
                        <ChevronDown size={13} strokeWidth={1.8} className="lightbox-rel-chev" />
                      </span>
                    </button>

                    <div className="lightbox-rel-tags">
                      <span className="lightbox-rel-icon">
                        <TagIcon size={15} strokeWidth={1.5} />
                      </span>
                      <div className="lightbox-rel-body">
                        {imageTags.length === 0 ? (
                          <span className="lightbox-rel-empty">暂无标签</span>
                        ) : (
                          <div className="lightbox-tag-wrap">
                            {imageTags.map((t) => (
                              <span key={t.id} className="lightbox-tag-chip">
                                <span
                                  className="lightbox-tag-dot"
                                  style={{ backgroundColor: t.color || 'var(--accent)' }}
                                />
                                {t.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="lightbox-tag-add"
                        onClick={openTagEditor}
                      >
                        添加
                      </button>
                    </div>
                  </div>
                )}

                {/* 折叠式外链分享面板 */}
                <div className={`lightbox-links${linksOpen ? ' open' : ''}`}>
                  <button
                    type="button"
                    className="lightbox-links-toggle"
                    onClick={() => setLinksOpen((o) => !o)}
                    aria-expanded={linksOpen}
                  >
                    <span className="lightbox-links-toggle-l">
                      <Share2 size={15} strokeWidth={1.5} />
                      复制外链
                    </span>
                    <ChevronDown size={15} strokeWidth={1.5} className="lightbox-links-chev" />
                  </button>
                  <AnimatePresence initial={false}>
                    {linksOpen && (
                      <motion.div
                        className="lightbox-links-body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: 'easeInOut' }}
                      >
                        <div className="link-format-tabs" role="tablist">
                          {LINK_FORMATS.map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              role="tab"
                              aria-selected={format === f.key}
                              className={`link-format-tab${format === f.key ? ' active' : ''}`}
                              onClick={() => {
                                setFormat(f.key);
                                setCopied(false);
                              }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                        <div className="link-copy-row">
                          <input
                            readOnly
                            value={linkValue}
                            className="link-copy-input"
                            onFocus={(e) => e.currentTarget.select()}
                          />
                          <motion.button
                            className={`link-copy-btn${copied ? ' copied' : ''}`}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => void copyLink()}
                          >
                            {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.8} />}
                            {copied ? '已复制' : '复制'}
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 危险操作 */}
                <button className="lightbox-delete" onClick={() => onRequestDelete(image)}>
                  <Trash2 size={14} strokeWidth={1.5} />
                  永久删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 相册选择器（联动：归档 / 更换 / 内嵌新建） */}
      <AlbumSelectModal
        open={pickerOpen}
        imageIds={image ? [image.id] : []}
        currentAlbumId={image?.album_id ?? null}
        onClose={() => setPickerOpen(false)}
        onChanged={handleAlbumChanged}
      />

      {/* 标签同步编辑器 */}
      <MobileSheet open={tagEditorOpen} onClose={() => setTagEditorOpen(false)} title="同步图片标签">
        <div className="lightbox-tag-editor">
          {allTags.length === 0 ? (
            <div className="lightbox-tag-editor-empty">
              还没有任何标签，先到标签页创建一个吧
            </div>
          ) : (
            <div className="lightbox-tag-editor-grid">
              {allTags.map((t) => {
                const checked = tagDraft.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`lightbox-tag-option${checked ? ' checked' : ''}`}
                    onClick={() =>
                      setTagDraft((prev) => {
                        const next = new Set(prev);
                        if (next.has(t.id)) next.delete(t.id);
                        else next.add(t.id);
                        return next;
                      })
                    }
                  >
                    <span
                      className="lightbox-tag-dot"
                      style={{ backgroundColor: t.color || 'var(--accent)' }}
                    />
                    {t.name}
                    {checked && <Check size={13} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          )}
          <div className="modal-footer">
            <button
              type="button"
              className="modal-btn"
              onClick={() => setTagEditorOpen(false)}
              disabled={tagSaving}
            >
              取消
            </button>
            <button
              type="button"
              className="modal-btn modal-btn-primary"
              onClick={() => void saveTags()}
              disabled={tagSaving}
            >
              {tagSaving && <span className="modal-spinner" />}
              保存标签
            </button>
          </div>
        </div>
      </MobileSheet>
    </>
  );
};
