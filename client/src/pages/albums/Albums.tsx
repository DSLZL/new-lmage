import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { api } from '../../services/api';
import type { Album } from '../../services/api';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { CreateAlbumModal } from '../../components/common/CreateAlbumModal';
import { Calendar, FolderPlus, Lock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import './albums.css';

/* ---------- 动效变体 ---------- */

const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const gridItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: 'easeOut' } },
};

/** 封面占位插画：画框 + 山峦 + 旭日（随 CSS 变量变色） */
const AlbumCoverArt: React.FC = () => (
  <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="album-cover-art" aria-hidden>
    <rect x="98" y="32" width="126" height="102" rx="14" stroke="var(--accent-light)" strokeWidth="2.2" fill="none" />
    <rect x="114" y="48" width="94" height="74" rx="10" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="5 7" fill="none" />
    <path d="M126 106 L150 74 L164 90 L174 80 L196 106" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="178" cy="58" r="7" fill="var(--accent-light)" />
  </svg>
);

/** 统一格式化创建日期 */
const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });

/* ---------- 页面主组件 ---------- */

export const Albums: React.FC = () => {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  // 创建相册模态
  const [showCreate, setShowCreate] = useState(false);

  // 解散相册确认弹层
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAlbums();
      setAlbums(res.albums);
    } catch {
      toast.error('加载相册列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  // 解散相册（确认弹层驱动，解散后刷新列表）
  const handleDeleteAlbum = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAlbum(deleteTarget.id);
      toast.success('相册已解散，其中的图片仅解除归属');
      setDeleteTarget(null);
      fetchAlbums();
    } catch (err: any) {
      toast.error(err?.message ?? '删除相册失败');
    } finally {
      setDeleting(false);
    }
  };

  /* ---------- 渲染 ---------- */

  return (
    <div className="albums-container">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="albums-toolbar">
          <span className="albums-count">{albums.length > 0 ? `共 ${albums.length} 本相册` : ''}</span>
          <motion.button
            className="albums-header-btn"
            onClick={() => setShowCreate(true)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
          >
            <FolderPlus size={17} strokeWidth={1.5} />
            新建相册
          </motion.button>
        </div>

        {loading ? (
          <Loader text="载入相册中..." />
        ) : albums.length === 0 ? (
          <EmptyState
            variant="album"
            title="还没有任何相册"
            description="创建你的第一本相册，把图库里的图片按主题归档收纳"
            actionText="创建第一个相册"
            onAction={() => setShowCreate(true)}
          />
        ) : (
          <motion.div
            className="album-grid"
            variants={gridContainer}
            initial="hidden"
            animate="visible"
          >
            {albums.map((album) => (
              <motion.div key={album.id} variants={gridItem}>
                <motion.div
                  className="album-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/albums/${album.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/albums/${album.id}`);
                    }
                  }}
                  whileHover={{ y: -6, scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <div className="album-cover">
                    {album.cover_url ? (
                      <img src={album.cover_url} alt={album.name} loading="lazy" />
                    ) : (
                      <AlbumCoverArt />
                    )}
                    {album.has_password && (
                      <span className="album-lock-badge">
                        <Lock size={14} strokeWidth={1.5} />
                      </span>
                    )}
                  </div>
                  <div className="album-card-body">
                    <h3 className="album-card-name">{album.name}</h3>
                    <p className="album-card-desc">{album.description || '暂无描述'}</p>
                    <div className="album-card-meta">
                      <span className="album-meta-chip">
                        <Calendar size={12} strokeWidth={1.5} />
                        {formatDate(album.created_at)}
                      </span>
                      <span
                        className="album-delete-mini"
                        role="button"
                        tabIndex={0}
                        aria-label={`删除相册 ${album.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(album);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation();
                            setDeleteTarget(album);
                          }
                        }}
                      >
                        <Trash2 size={15} strokeWidth={1.5} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ===== 创建相册模态 ===== */}
      <CreateAlbumModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchAlbums}
      />

      {/* ===== 解散相册确认弹层 ===== */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTarget ? `解散相册「${deleteTarget.name}」？` : ''}
        description="相册内的图片不会被删除，只会解除与相册的归属关系，此操作不可撤销。"
        confirmText="确认解散"
        danger
        loading={deleting}
        onConfirm={handleDeleteAlbum}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
};
