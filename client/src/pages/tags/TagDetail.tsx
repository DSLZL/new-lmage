import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Tag as TagIcon,
  TagPlus,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Image, Tag as TagModel } from '../../services/api';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { ImageLightbox } from '../../components/common/ImageLightbox';
import { TagSelectModal } from '../../components/common/TagSelectModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import './tagdetail.css';

/* ---------- 工具 ---------- */

/** 十六进制颜色转 rgba（用于标签 chip 的柔化底色） */
const hexToRgba = (hex: string, alpha: number): string => {
  const raw = hex.replace('#', '').trim();
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return `rgba(8, 145, 178, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

const gridContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const gridItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

/* ---------- 页面主组件 ---------- */

/** 标签详情页（/tags/:tagid）：极致图片墙 + 光箱 + 批量打标 / 解绑 */
export const TagDetail: React.FC = () => {
  const { tagid } = useParams<{ tagid: string }>();
  const navigate = useNavigate();

  const [tag, setTag] = useState<TagModel | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [allTags, setAllTags] = useState<TagModel[]>([]);
  const [loading, setLoading] = useState(true);

  // 多选与批量打标 / 解绑
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagSelect, setTagSelect] = useState<{ open: boolean; mode: 'add' | 'remove' }>({
    open: false,
    mode: 'add',
  });
  const [tagging, setTagging] = useState(false);

  // 光箱与永久删除
  const [lightbox, setLightbox] = useState<Image | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Image | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!tagid) return;
    setLoading(true);
    try {
      const [tagRes, imgRes] = await Promise.all([api.getTags(), api.getTagImages(tagid)]);
      setAllTags(tagRes.tags);
      setTag(tagRes.tags.find((t) => t.id === tagid) ?? null);
      setImages(imgRes.images);
    } catch {
      toast.error('加载标签图片失败');
    } finally {
      setLoading(false);
    }
  }, [tagid]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const exitMultiSelect = () => {
    setMultiSelect(false);
    setSelectedIds([]);
  };

  /** 批量打标 / 解绑确认回调 */
  const handleBatchTag = async (tagIds: string[]) => {
    if (tagIds.length === 0 || selectedIds.length === 0 || !tagid) return;
    const { mode } = tagSelect;
    setTagging(true);
    try {
      await api.batchTagImages(selectedIds, tagIds, mode);
      toast.success(
        mode === 'add'
          ? `已为 ${selectedIds.length} 张图片打上 ${tagIds.length} 个标签`
          : `已解绑 ${selectedIds.length} 张图片上的 ${tagIds.length} 个标签`
      );
      setTagSelect({ open: false, mode: 'add' });
      exitMultiSelect();
      const res = await api.getTagImages(tagid);
      setImages(res.images);
    } catch {
      toast.error(mode === 'add' ? '批量打标失败' : '批量解绑失败');
    } finally {
      setTagging(false);
    }
  };

  /** 光箱内永久删除 */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteImagePhysically(deleteTarget.id);
      toast.success('图片已彻底删除');
      setImages((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setLightbox(null);
      setDeleteTarget(null);
    } catch {
      toast.error('删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  };

  /** 标签 chip 的运行时配色（无颜色时走 accent 渐变） */
  const chipStyle = (color?: string): React.CSSProperties | undefined =>
    color
      ? {
          background: hexToRgba(color, 0.14),
          color,
          borderColor: hexToRgba(color, 0.45),
        }
      : undefined;

  /* ---------- 渲染 ---------- */

  const showEmpty = !loading && !tag;
  const showTagEmpty = !loading && !!tag && images.length === 0;

  return (
    <div className="tag-detail-container">
      {/* 顶部毛玻璃返回栏 */}
      <div className="tag-detail-topbar">
        <div className="tag-detail-topbar-left">
          <motion.button
            type="button"
            className="tag-detail-back"
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/tags')}
            aria-label="返回标签列表"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
          </motion.button>
          <span
            className={`tag-detail-chip ${tag?.color ? '' : 'tag-detail-chip-gradient'}`}
            style={chipStyle(tag?.color)}
          >
            <TagIcon size={13} strokeWidth={1.8} />
            {tag?.name ?? '标签'}
          </span>
          <span className="tag-detail-count">{images.length} 张图片</span>
        </div>
        <motion.button
          type="button"
          className={`tag-detail-select ${multiSelect ? 'active' : ''}`}
          whileTap={{ scale: 0.94 }}
          onClick={() => (multiSelect ? exitMultiSelect() : setMultiSelect(true))}
          aria-pressed={multiSelect}
        >
          {multiSelect ? (
            <X size={15} strokeWidth={1.5} />
          ) : (
            <CheckSquare size={15} strokeWidth={1.5} />
          )}
          {multiSelect ? '退出选择' : '多选'}
        </motion.button>
      </div>

      {/* 加载态 */}
      {loading && <Loader text="正在汇集标签图片..." />}

      {/* 标签不存在 */}
      {showEmpty && (
        <EmptyState
          variant="tag"
          title="标签不存在或已被删除"
          description="返回标签列表，重新挑选一个彩色标签吧"
          actionText="返回标签列表"
          onAction={() => navigate('/tags')}
        />
      )}

      {/* 空状态：手绘 SVG */}
      {showTagEmpty && (
        <EmptyState
          variant="tag"
          title="这个标签下还没有图片"
          description="回到图库为图片批量打上这个标签，或先选中其他图片"
          actionText="返回标签列表"
          onAction={() => navigate('/tags')}
        />
      )}

      {/* 图片网格 */}
      {!loading && tag && images.length > 0 && (
        <motion.div
          className="tag-detail-grid"
          variants={gridContainer}
          initial="hidden"
          animate="visible"
        >
          {images.map((img) => {
            const selected = selectedIds.includes(img.id);
            return (
              <motion.button
                key={img.id}
                type="button"
                className={`tag-detail-item ${selected ? 'is-selected' : ''}`}
                variants={gridItem}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() =>
                  multiSelect ? toggleSelect(img.id) : setLightbox(img)
                }
                aria-label={multiSelect ? `选择图片 ${img.file_name}` : `预览图片 ${img.file_name}`}
              >
                <img
                  src={api.getFileUrl(img.id, true)}
                  alt={img.file_name}
                  loading="lazy"
                  decoding="async"
                  className="tag-detail-img"
                />
                {multiSelect && (
                  <motion.span
                    className="tag-detail-check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  >
                    {selected && <Check size={13} strokeWidth={2.5} />}
                  </motion.span>
                )}
                <span className="tag-detail-name">{img.file_name}</span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* 底部批量操作条 */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            className="tag-batch-bar"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 48 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <span className="tag-batch-count">已选 {selectedIds.length} 张</span>
            <button
              type="button"
              className="tag-batch-btn primary"
              disabled={tagging}
              onClick={() => setTagSelect({ open: true, mode: 'add' })}
            >
              <TagPlus size={15} strokeWidth={1.5} />
              批量打标
            </button>
            <button
              type="button"
              className="tag-batch-btn danger"
              disabled={tagging}
              onClick={() => setTagSelect({ open: true, mode: 'remove' })}
            >
              <Trash2 size={15} strokeWidth={1.5} />
              批量解绑
            </button>
            <button type="button" className="tag-batch-btn" onClick={exitMultiSelect}>
              <X size={15} strokeWidth={1.5} />
              取消选择
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 高级光箱（弹簧入场 / Esc 关闭 / 四格式外链复制） */}
      <ImageLightbox
        image={lightbox}
        onClose={() => setLightbox(null)}
        onRequestDelete={(img) => setDeleteTarget(img)}
      />

      {/* 批量打标 / 解绑面板 */}
      <TagSelectModal
        open={tagSelect.open}
        mode={tagSelect.mode}
        title={tagSelect.mode === 'add' ? '批量打标签' : '批量解绑标签'}
        subtitle={
          tagSelect.mode === 'add'
            ? `为已选 ${selectedIds.length} 张图片打上标签`
            : `为已选 ${selectedIds.length} 张图片解绑标签（默认勾选当前标签）`
        }
        tags={allTags}
        defaultCheckedIds={tagSelect.mode === 'remove' && tag ? [tag.id] : []}
        confirmText={tagSelect.mode === 'add' ? '确认打标' : '确认解绑'}
        onClose={() => setTagSelect({ open: false, mode: 'add' })}
        onConfirm={handleBatchTag}
      />

      {/* 永久删除确认 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="永久删除这张图片？"
        description={`「${deleteTarget?.file_name ?? ''}」将从存储中彻底删除，无法恢复`}
        confirmText="永久删除"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
