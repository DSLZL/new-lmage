import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FolderHeart, FolderPlus, LoaderCircle, Lock, Plus, X } from 'lucide-react';
import { api } from '../../services/api';
import type { Album } from '../../services/api';
import { toast } from 'sonner';
import { MobileSheet } from './MobileSheet';
import { CreateAlbumModal } from './CreateAlbumModal';
import './AlbumSelectModal.css';

interface AlbumSelectModalProps {
  open: boolean;
  /** 待归档的图片 id 集合（批量或单图统一为数组） */
  imageIds: string[];
  /** 当前所在相册 id（单图场景：点击该相册即解除归档） */
  currentAlbumId?: string | null;
  onClose: () => void;
  /** 归档变化后的回调（外部刷新列表状态） */
  onChanged?: () => void;
}

/**
 * AlbumSelectModal — 相册选择器（归档联动）
 *
 * 图片 ↔ 相册深度联通：
 * - 点击相册即把图片加入归档；当前相册再点一次解除归档
 * - 顶部「新建相册」内嵌创建，创建成功后自动归档当前图片
 * - 移动端底部弹层，桌面自动居中
 */
export const AlbumSelectModal: React.FC<AlbumSelectModalProps> = ({
  open,
  imageIds,
  currentAlbumId,
  onClose,
  onChanged,
}) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const count = imageIds.length;

  const load = useCallback(async () => {
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
    if (open) {
      setBusyId(null);
      void load();
    }
  }, [open, load]);

  /** 点击相册：归档（当前相册则解除归档） */
  const handlePick = async (album: Album) => {
    if (busyId || count === 0) return;
    const isCurrent = album.id === currentAlbumId;
    setBusyId(album.id);
    try {
      await api.modifyAlbumImages(album.id, imageIds, isCurrent ? 'remove' : 'add');
      toast.success(
        isCurrent
          ? `已解除归档（${count} 张）`
          : `已归档到「${album.name}」（${count} 张）`
      );
      onChanged?.();
      if (!isCurrent) onClose();
    } catch (err: any) {
      toast.error(err?.message ?? (isCurrent ? '解除归档失败' : '归档失败'));
    } finally {
      setBusyId(null);
    }
  };

  /** 内嵌新建相册：创建成功后自动归档当前图片 */
  const handleCreated = async (albumid: string) => {
    setShowCreate(false);
    if (count > 0) {
      try {
        await api.modifyAlbumImages(albumid, imageIds, 'add');
        toast.success(`已自动归档到新相册（${count} 张）`);
        onChanged?.();
        onClose();
      } catch (err: any) {
        toast.error(err?.message ?? '自动归档失败，可在相册中手动添加');
      }
    }
  };

  return (
    <>
      <MobileSheet
        open={open}
        onClose={onClose}
        title={count > 1 ? `归档 ${count} 张图片` : '归档到相册'}
        maxHeight="78vh"
      >
        <p className="album-select-subtitle">
          {count > 1
            ? `点击相册即可把这 ${count} 张图片归档进去`
            : '点击相册归档这张图片，再点当前相册可解除归档'}
        </p>

        {/* 内嵌新建相册入口（功能联动） */}
        <motion.button
          type="button"
          className="album-select-create"
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
        >
          <span className="album-select-create-icon">
            <FolderPlus size={16} strokeWidth={1.6} />
          </span>
          <span className="album-select-create-text">
            <strong>新建相册</strong>
            <small>创建后自动归档当前图片</small>
          </span>
          <Plus size={16} strokeWidth={1.6} className="album-select-create-plus" />
        </motion.button>

        {loading ? (
          <div className="album-select-empty">
            <LoaderCircle size={16} strokeWidth={1.5} className="album-select-spin" />
            正在载入相册...
          </div>
        ) : albums.length === 0 ? (
          <div className="album-select-empty">
            还没有相册，先新建一本吧
          </div>
        ) : (
          <div className="album-select-list">
            {albums.map((album) => {
              const isCurrent = album.id === currentAlbumId;
              const busy = busyId === album.id;
              return (
                <motion.button
                  key={album.id}
                  type="button"
                  className={`album-select-item${isCurrent ? ' current' : ''}`}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handlePick(album)}
                  disabled={busy}
                >
                  {album.cover_url ? (
                    <img src={album.cover_url} alt="" className="album-select-cover" loading="lazy" />
                  ) : (
                    <span className="album-select-cover album-select-cover-fallback">
                      <FolderHeart size={18} strokeWidth={1.5} />
                    </span>
                  )}
                  <span className="album-select-name">
                    {album.name}
                    {album.has_password && <Lock size={11} strokeWidth={1.8} className="album-select-lock" />}
                  </span>
                  {busy ? (
                    <LoaderCircle size={15} strokeWidth={1.5} className="album-select-spin" />
                  ) : isCurrent ? (
                    <span className="album-select-current-tag">
                      <X size={12} strokeWidth={2} />
                      解除
                    </span>
                  ) : (
                    <span className="album-select-go">归档</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </MobileSheet>

      {/* 内嵌创建相册（联动：创建成功自动归档） */}
      <CreateAlbumModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />
    </>
  );
};
