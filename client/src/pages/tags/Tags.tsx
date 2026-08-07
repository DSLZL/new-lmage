import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import type { Image, Tag } from '../../services/api';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { TagSelectModal } from '../../components/common/TagSelectModal';
import {
  ArrowLeft,
  Check,
  Palette,
  Plus,
  Tag as TagIcon,
  TagPlus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import '../../components/common/modals.css';
import '../../components/common/pageActions.css';
import './tags.css';

/* ---------- 常量与工具 ---------- */

/** 预设色板 */
const PRESET_COLORS = [
  '#0891b2',
  '#3b82f6',
  '#10b981',
  '#14b8a6',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#2563eb',
  '#22c55e',
];

/** 十六进制颜色转 rgba（用于标签 chip 的柔化底色） */
const hexToRgba = (hex: string, alpha: number): string => {
  const raw = hex.replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(8, 145, 178, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

const viewMotion = {
  initial: { opacity: 0, x: 44 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.34, ease: 'easeOut' as const } },
  exit: { opacity: 0, x: -36, transition: { duration: 0.2 } },
};

const gridContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' as const } },
};

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalCardMotion = {
  initial: { opacity: 0, y: 36, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 30 },
  },
  exit: { opacity: 0, y: 18, scale: 0.96, transition: { duration: 0.16 } },
};

/* ---------- 页面主组件 ---------- */

export const Tags: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // 标签详情视图状态
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [tagImages, setTagImages] = useState<Image[]>([]);
  const [tagImagesLoading, setTagImagesLoading] = useState(false);

  // 创建标签模态
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  // 批量打标 / 解绑
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagSelect, setTagSelect] = useState<{ open: boolean; mode: 'add' | 'remove' }>({
    open: false,
    mode: 'add',
  });
  const [tagging, setTagging] = useState(false);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTags();
      setTags(res.tags);
    } catch {
      toast.error('获取标签列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const loadTagImages = useCallback(async (tagId: string) => {
    setTagImagesLoading(true);
    try {
      const res = await api.getTagImages(tagId);
      setTagImages(res.images);
    } catch {
      toast.error('拉取标签关联图片失败');
    } finally {
      setTagImagesLoading(false);
    }
  }, []);

  // 1) 进入标签详情
  const handleTagClick = (tag: Tag) => {
    setActiveTag(tag);
    setSelectedIds([]);
    loadTagImages(tag.id);
  };

  const handleExitDetail = () => {
    setActiveTag(null);
    setTagImages([]);
    setSelectedIds([]);
  };

  // 2) 创建标签
  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) {
      toast.warning('标签名不能为空');
      return;
    }
    setCreating(true);
    try {
      await api.createTag({ name: newTagName.trim(), color: newTagColor });
      toast.success('标签创建成功');
      setShowCreate(false);
      setNewTagName('');
      fetchTags();
    } catch (err: any) {
      toast.error(err.message || '创建标签失败');
    } finally {
      setCreating(false);
    }
  };

  // 3) 批量打标 / 解绑（标签多选面板确认回调）
  const handleTagImages = async (tagIds: string[]) => {
    if (tagIds.length === 0 || selectedIds.length === 0) return;
    const { mode } = tagSelect;
    setTagging(true);
    try {
      await api.batchTagImages(selectedIds, tagIds, mode);
      if (mode === 'add') {
        toast.success(`已为 ${selectedIds.length} 张图片打上 ${tagIds.length} 个标签`);
      } else {
        toast.success(`已解绑 ${selectedIds.length} 张图片上的 ${tagIds.length} 个标签`);
      }
      setTagSelect({ open: false, mode: 'add' });
      setSelectedIds([]);
      if (activeTag) loadTagImages(activeTag.id);
    } catch (err: any) {
      toast.error(err.message || (mode === 'add' ? '批量打标失败' : '批量解绑失败'));
    } finally {
      setTagging(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** 标签 chip 的运行时配色（无颜色时走 accent 渐变） */
  const chipStyle = (color?: string): React.CSSProperties | undefined =>
    color
      ? ({
          '--chip-bg': hexToRgba(color, 0.13),
          '--chip-color': color,
          '--chip-border': hexToRgba(color, 0.4),
        } as React.CSSProperties)
      : undefined;

  /* ---------- 渲染 ---------- */

  return (
    <div className="tags-container">
      <AnimatePresence mode="wait">
        {activeTag ? (
          /* ===== 标签详情视图 ===== */
          <motion.div key="detail" className="tag-detail" {...viewMotion}>
            <div className="detail-topbar">
              <button className="topbar-btn" onClick={handleExitDetail}>
                <ArrowLeft size={16} strokeWidth={1.5} />
                返回标签列表
              </button>
            </div>

            <div className="tag-detail-head">
              <motion.span
                className={`tag-chip tag-chip-lg ${activeTag.color ? '' : 'tag-chip-gradient'}`}
                style={chipStyle(activeTag.color)}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <TagIcon size={16} strokeWidth={1.5} className="tag-chip-icon" />
                {activeTag.name}
              </motion.span>
              <span className="tag-detail-count">共 {tagImages.length} 张图片绑定此标签</span>
            </div>

            {tagImagesLoading ? (
              <Loader text="正在过滤关联图片..." />
            ) : tagImages.length === 0 ? (
              <EmptyState
                variant="tag"
                title="这个标签下还没有图片"
                description="回到图库为图片批量打上这个标签，或先选中其他图片"
                actionText="返回标签列表"
                onAction={handleExitDetail}
              />
            ) : (
              <motion.div
                className="detail-grid"
                variants={gridContainer}
                initial="hidden"
                animate="visible"
              >
                {tagImages.map((img) => (
                  <motion.div
                    key={img.id}
                    className={`detail-img-item ${selectedIds.includes(img.id) ? 'selected' : ''}`}
                    variants={gridItem}
                    whileHover={{ y: -3 }}
                    onClick={() => toggleSelect(img.id)}
                  >
                    <img src={api.getFileUrl(img.id, true)} alt={img.file_name} loading="lazy" />
                    <span className="detail-img-check">
                      {selectedIds.includes(img.id) && <Check size={13} strokeWidth={1.5} />}
                    </span>
                    <span className="detail-img-name">{img.file_name}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* 批量操作条 */}
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div
                  className="batch-bar"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                >
                  <span className="batch-bar-count">已选 {selectedIds.length} 张</span>
                  <button
                    className="batch-bar-btn primary"
                    onClick={() => setTagSelect({ open: true, mode: 'add' })}
                    disabled={tagging}
                  >
                    <TagPlus size={15} strokeWidth={1.5} />
                    批量打标
                  </button>
                  <button
                    className="batch-bar-btn danger"
                    onClick={() => setTagSelect({ open: true, mode: 'remove' })}
                    disabled={tagging}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                    批量解绑
                  </button>
                  <button className="batch-bar-btn" onClick={() => setSelectedIds([])}>
                    <X size={15} strokeWidth={1.5} />
                    取消选择
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ===== 标签列表视图 ===== */
          <motion.div key="list" {...viewMotion}>
            <div className="tags-header">
              <div>
                <h2 className="tags-title">标签索引大盘</h2>
                <p className="tags-subtitle">用彩色标签快速聚合主题图片，一键批量归拢</p>
              </div>
              <motion.button
                className="tags-header-btn"
                onClick={() => setShowCreate(true)}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                <Plus size={17} strokeWidth={1.5} />
                新建标签
              </motion.button>
            </div>

            {loading ? (
              <Loader text="标签提取中..." />
            ) : tags.length === 0 ? (
              <EmptyState
                variant="tag"
                title="还没有任何标签"
                description="创建你的第一个标签，用颜色标记主题，后续可批量打标归档"
                actionText="创建第一个标签"
                onAction={() => setShowCreate(true)}
              />
            ) : (
              <motion.div
                className="tag-cloud"
                variants={gridContainer}
                initial="hidden"
                animate="visible"
              >
                {tags.map((tag) => (
                  <motion.button
                    key={tag.id}
                    className={`tag-chip ${tag.color ? '' : 'tag-chip-gradient'}`}
                    style={chipStyle(tag.color)}
                    variants={gridItem}
                    whileHover={{ y: -4, scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleTagClick(tag)}
                  >
                    <TagIcon size={14} strokeWidth={1.5} className="tag-chip-icon" />
                    {tag.name}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 创建标签模态 ===== */}
      <AnimatePresence>
        {showCreate && (
          <motion.div className="modal-overlay" {...overlayMotion} onClick={() => setShowCreate(false)}>
            <motion.form
              className="modal-card"
              {...modalCardMotion}
              onSubmit={handleCreateTag}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-head">
                <div>
                  <h3 className="modal-title">创建新标签</h3>
                  <p className="modal-subtitle">为标签挑选一个代表颜色，让分类一目了然</p>
                </div>
                <X size={20} strokeWidth={1.5} className="modal-close" onClick={() => setShowCreate(false)} />
              </div>

              <div className="modal-field">
                <label className="modal-label">标签名称</label>
                <input
                  className="modal-input"
                  placeholder="例如：风景、壁纸、素材"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  maxLength={20}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">代表颜色</label>
                <div className="tag-swatch-row">
                  {PRESET_COLORS.map((color) => (
                    <motion.button
                      key={color}
                      type="button"
                      className={`tag-swatch ${newTagColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewTagColor(color)}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      aria-label={`选择颜色 ${color}`}
                    >
                      {newTagColor === color && (
                        <Check size={13} strokeWidth={1.5} style={{ color: 'var(--tag-swatch-check)' }} />
                      )}
                    </motion.button>
                  ))}
                </div>
                <div className="tag-custom-color">
                  <Palette size={16} strokeWidth={1.5} className="tag-custom-icon" />
                  <input
                    type="color"
                    className="tag-color-input"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    aria-label="自定义颜色"
                  />
                  <span className="tag-color-hex">{newTagColor}</span>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="modal-btn" onClick={() => setShowCreate(false)}>
                  取消
                </button>
                <button type="submit" className="modal-btn modal-btn-primary" disabled={creating}>
                  {creating && <span className="modal-spinner" />}
                  确认创建
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 批量打标 / 解绑面板 ===== */}
      <TagSelectModal
        open={tagSelect.open}
        mode={tagSelect.mode}
        title={tagSelect.mode === 'add' ? '批量打标签' : '批量解绑标签'}
        subtitle={
          tagSelect.mode === 'add'
            ? `为已选 ${selectedIds.length} 张图片打上标签`
            : `为已选 ${selectedIds.length} 张图片解绑标签（默认勾选当前标签）`
        }
        tags={tags}
        defaultCheckedIds={tagSelect.mode === 'remove' && activeTag ? [activeTag.id] : []}
        confirmText={tagSelect.mode === 'add' ? '确认打标' : '确认解绑'}
        onClose={() => setTagSelect({ open: false, mode: 'add' })}
        onConfirm={handleTagImages}
      />
    </div>
  );
};
