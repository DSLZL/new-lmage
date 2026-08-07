import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import type { Album, Image } from '../../services/api';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ImagePickerModal } from '../../components/common/ImagePickerModal';
import { CreateAlbumModal } from '../../components/common/CreateAlbumModal';
import {
  ArrowLeft,
  Calendar,
  Check,
  FolderPlus,
  ImagePlus,
  Images,
  KeyRound,
  Lock,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import '../../components/common/modals.css';
import '../../components/common/pageActions.css';
import './albums.css';

/* ---------- 动效变体 ---------- */

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
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  // 详情视图状态
  const [activeAlbum, setActiveAlbum] = useState<Album | null>(null);
  const [albumImages, setAlbumImages] = useState<Image[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [requiresUnlock, setRequiresUnlock] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // 创建相册模态
  const [showCreate, setShowCreate] = useState(false);

  // 删除确认弹层
  const [deleteTarget, setDeleteTarget] = useState<Album | null>(null);
  const [deleting, setDeleting] = useState(false);

  // 批量加图 / 移出
  const [showPicker, setShowPicker] = useState(false);
  const [addingImages, setAddingImages] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [removing, setRemoving] = useState(false);

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

  const loadAlbumDetail = useCallback(async (id: string, password?: string) => {
    setDetailLoading(true);
    try {
      const res = await api.getAlbumDetail(id, password);
      setAlbumImages(res.images);
      setRequiresUnlock(false);
      setUnlockPassword('');
    } catch (err: any) {
      toast.error(err.message || '提取码错误或无权访问该相册（403）');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // 1) 进入相册详情（加密相册先弹提取码面板）
  const handleEnterAlbum = (album: Album) => {
    setActiveAlbum(album);
    setAlbumImages([]);
    setSelectedIds([]);
    setRequiresUnlock(false);
    if (album.has_password) {
      setRequiresUnlock(true);
      return;
    }
    loadAlbumDetail(album.id);
  };

  const handleExitDetail = () => {
    setActiveAlbum(null);
    setRequiresUnlock(false);
    setUnlockPassword('');
    setSelectedIds([]);
  };

  // 2) 提交提取码解锁
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAlbum || unlocking) return;
    if (!unlockPassword.trim()) {
      toast.warning('请输入相册提取码');
      return;
    }
    setUnlocking(true);
    loadAlbumDetail(activeAlbum.id, unlockPassword).finally(() => setUnlocking(false));
  };

  // 3) 创建相册（由 CreateAlbumModal 组件处理）
  // 4) 解散相册（确认弹层）
  const handleDeleteAlbum = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAlbum(deleteTarget.id);
      toast.success('相册已解散，其中的图片仅解除归属');
      if (activeAlbum?.id === deleteTarget.id) handleExitDetail();
      setDeleteTarget(null);
      fetchAlbums();
    } catch (err: any) {
      toast.error(err.message || '删除相册失败');
    } finally {
      setDeleting(false);
    }
  };

  // 5) 批量移出图片
  const handleRemoveImages = async () => {
    if (!activeAlbum || selectedIds.length === 0) return;
    setRemoving(true);
    try {
      await api.modifyAlbumImages(activeAlbum.id, selectedIds, 'remove');
      toast.success(`已从相册移出 ${selectedIds.length} 张图片`);
      setSelectedIds([]);
      loadAlbumDetail(activeAlbum.id);
    } catch (err: any) {
      toast.error(err.message || '移出图片失败');
    } finally {
      setRemoving(false);
    }
  };

  // 6) 批量加入图片（选择器回调）
  const handleAddImages = async (ids: string[]) => {
    if (!activeAlbum || ids.length === 0) return;
    setAddingImages(true);
    try {
      await api.modifyAlbumImages(activeAlbum.id, ids, 'add');
      toast.success(`已加入 ${ids.length} 张图片到「${activeAlbum.name}」`);
      setShowPicker(false);
      loadAlbumDetail(activeAlbum.id);
    } catch (err: any) {
      toast.error(err.message || '加入图片失败');
    } finally {
      setAddingImages(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /* ---------- 渲染 ---------- */

  return (
    <div className="albums-container">
      <AnimatePresence mode="wait">
        {activeAlbum ? (
          /* ===== 相册详情视图 ===== */
          <motion.div key="detail" className="album-detail" {...viewMotion}>
            <div className="detail-topbar">
              <button className="topbar-btn" onClick={handleExitDetail}>
                <ArrowLeft size={16} strokeWidth={1.5} />
                返回相册列表
              </button>
              <div className="topbar-actions">
                <button className="topbar-btn" onClick={() => setShowPicker(true)}>
                  <ImagePlus size={16} strokeWidth={1.5} />
                  加入图片
                </button>
                <button className="topbar-btn danger" onClick={() => setDeleteTarget(activeAlbum)}>
                  <Trash2 size={16} strokeWidth={1.5} />
                  解散相册
                </button>
              </div>
            </div>

            <div className="detail-head">
              <h2 className="detail-head-title premium-gradient-text">{activeAlbum.name}</h2>
              {activeAlbum.description && (
                <p className="detail-head-desc">{activeAlbum.description}</p>
              )}
              <div className="detail-chips">
                <span className="detail-chip">
                  <Calendar size={12} strokeWidth={1.5} />
                  {formatDate(activeAlbum.created_at)} 创建
                </span>
                <span className="detail-chip">
                  <Images size={12} strokeWidth={1.5} />
                  {albumImages.length} 张图片
                </span>
                {activeAlbum.has_password && (
                  <span className="detail-chip lock">
                    <Lock size={12} strokeWidth={1.5} />
                    密码保护相册
                  </span>
                )}
              </div>
            </div>

            {requiresUnlock ? (
              /* 提取码解锁面板 */
              <motion.form
                className="unlock-panel"
                onSubmit={handleUnlock}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: 'easeOut' }}
              >
                <div className="unlock-icon">
                  <KeyRound size={24} strokeWidth={1.5} />
                </div>
                <h3 className="unlock-title">这是一份加密相册</h3>
                <p className="unlock-desc">输入创建者设置的相册提取码即可打开归档</p>
                <input
                  className="unlock-input"
                  type="password"
                  placeholder="请输入提取码"
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                  autoFocus
                />
                <button className="unlock-btn" type="submit" disabled={unlocking}>
                  {unlocking && <span className="modal-spinner" />}
                  校验并解锁
                </button>
              </motion.form>
            ) : detailLoading ? (
              <Loader text="正在提取相册归档..." />
            ) : albumImages.length === 0 ? (
              <EmptyState
                variant="album"
                title="相册还是空的"
                description="从图库中挑选心仪的图片加入这个相册吧"
                actionText="挑选图片加入"
                onAction={() => setShowPicker(true)}
              />
            ) : (
              <motion.div className="detail-grid" variants={gridContainer} initial="hidden" animate="visible">
                {albumImages.map((img) => (
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
                    className="batch-bar-btn danger"
                    onClick={handleRemoveImages}
                    disabled={removing}
                  >
                    {removing && <span className="modal-spinner" />}
                    <Trash2 size={15} strokeWidth={1.5} />
                    移出相册
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
          /* ===== 相册列表视图 ===== */
          <motion.div key="list" {...viewMotion}>
            <div className="albums-header">
              <div>
                <h2 className="albums-title">我的相册空间</h2>
                <p className="albums-subtitle">把散落的影像归档成册，可按需加密保护</p>
              </div>
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
                      onClick={() => handleEnterAlbum(album)}
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
                            aria-label={`删除相册 ${album.name}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(album);
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
        )}
      </AnimatePresence>

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

      {/* ===== 图库选图加入相册 ===== */}
      <ImagePickerModal
        open={showPicker}
        title="挑选图片加入相册"
        subtitle={activeAlbum ? `加入到「${activeAlbum.name}」` : undefined}
        excludeIds={albumImages.map((img) => img.id)}
        confirmText="加入相册"
        submitting={addingImages}
        onClose={() => setShowPicker(false)}
        onConfirm={handleAddImages}
      />
    </div>
  );
};
