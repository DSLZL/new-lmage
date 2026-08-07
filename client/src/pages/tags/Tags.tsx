import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import type { Tag } from '../../services/api';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { MobileSheet } from '../../components/common/MobileSheet';
import { FadeInUp } from '../../components/common/FadeInUp';
import { Check, Palette, Plus, Tag as TagIcon } from 'lucide-react';
import { toast } from 'sonner';
import '../../components/common/modals.css';
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

const pageMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: 'easeOut' as const } },
};

/* ---------- 页面主组件 ---------- */

/** 标签列表页（/tags）：彩色标签云，点击标签跳转独立详情路由 */
export const Tags: React.FC = () => {
  const navigate = useNavigate();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // 创建标签模态
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

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

  /** 创建标签（色板 + 自定义颜色） */
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '创建标签失败');
    } finally {
      setCreating(false);
    }
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
    <motion.div className="tags-container" {...pageMotion}>
      {/* 操作栏（保留新建标签核心操作，标题交给二级导航） */}
      <div className="tags-toolbar">
        <span className="tags-count">{tags.length > 0 ? `共 ${tags.length} 个标签` : ''}</span>
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

      {/* 标签云 */}
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
        <div className="tag-cloud">
          {tags.map((tag, i) => (
            <FadeInUp key={tag.id} delay={Math.min(i * 0.04, 0.4)}>
              <motion.button
                className={`tag-chip ${tag.color ? '' : 'tag-chip-gradient'}`}
                style={chipStyle(tag.color)}
                whileHover={{ y: -4, scale: 1.05 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => navigate(`/tags/${tag.id}`)}
              >
                <TagIcon size={14} strokeWidth={1.5} className="tag-chip-icon" />
                {tag.name}
              </motion.button>
            </FadeInUp>
          ))}
        </div>
      )}

      {/* ===== 创建标签底部弹层（移动端），桌面自动居中 ===== */}
      <MobileSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="创建新标签"
      >
        <form className="tag-create-sheet" onSubmit={handleCreateTag}>
          <div className="modal-field">
            <label className="modal-label">标签名称</label>
            <input
              className="modal-input"
              placeholder="例如：风景、壁纸、素材"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              maxLength={20}
              autoFocus
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
              <Palette size={14} strokeWidth={1.5} className="tag-custom-icon" />
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
        </form>
      </MobileSheet>
    </motion.div>
  );
};
