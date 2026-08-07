import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  Check,
  ImagePlus,
  Images,
  KeyRound,
  SquareCheck,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Album, Image } from '../../services/api';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ImagePickerModal } from '../../components/common/ImagePickerModal';
import { ImageLightbox } from '../../components/common/ImageLightbox';
import { formatBytes } from '../../components/common/format';
import '../../components/common/pageActions.css';
import './albumdetail.css';

/* ---------- 类型与工具 ---------- */

/** 删除确认弹层状态：解散相册 / 物理抹除单张图片 */
type ConfirmState = { kind: 'album' } | { kind: 'image'; image: Image } | null;

/** 后端 403 文案稳定包含「密码/提取码」，据此判定加密相册 */
const isPasswordError = (err: unknown): boolean =>
  typeof err === 'object' &&
  err !== null &&
  'message' in err &&
  typeof (err as { message?: unknown }).message === 'string' &&
  /密码|提取码/.test((err as { message: string }).message);

const gridContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
};

const gridItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
};

/* ---------- 页面主组件 ---------- */

/** 相册详情页（独立路由 /albums/:albumid，加密相册自动弹出提取码解锁） */
export const AlbumDetail: React.FC = () => {
  const { albumid } = useParams<{ albumid: string }>();
  const navigate = useNavigate();

  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // 提取码解锁（成功后留存 accessPwd 供后续刷新）
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [accessPwd, setAccessPwd] = useState('');
  const unlockRef = useRef<HTMLInputElement>(null);

  // 光箱 / 多选模式 / 批量移出
  const [lightbox, setLightbox] = useState<Image | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [removing, setRemoving] = useState(false);

  // 加图选择器 / 删除确认
  const [showPicker, setShowPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [busy, setBusy] = useState(false);

  /* ---------- 数据加载（加密相册：失败即弹解锁面板） ---------- */

  const load = useCallback(
    async (pwd?: string) => {
      if (!albumid) return;
      setLoading(true);
      setNotFound(false);
      try {
        const res = await api.getAlbumDetail(albumid, pwd);
        setAlbum(res.album);
        setImages(res.images);
        setLocked(false);
        setPassword('');
        if (pwd) setAccessPwd(pwd);
      } catch (err) {
        if (isPasswordError(err)) {
          setLocked(true);
          setAlbum(null);
          setImages([]);
          // 提交过提取码仍失败：错误提示后解锁面板保持停留
          if (pwd) toast.error('提取码错误，请重新输入');
        } else {
          setNotFound(true);
          toast.error((err as Error)?.message ?? '加载相册失败');
        }
      } finally {
        setLoading(false);
      }
    },
    [albumid]
  );

  useEffect(() => {
    load();
    // 仅响应路由参数变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumid]);

  // 解锁面板弹出后自动聚焦输入框
  useEffect(() => {
    if (locked) unlockRef.current?.focus();
  }, [locked]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unlocking) return;
    if (!password.trim()) {
      toast.warning('请输入相册提取码');
      return;
    }
    setUnlocking(true);
    try {
      await load(password);
    } finally {
      setUnlocking(false);
    }
  };

  /* ---------- 多选与批量移出 ---------- */

  const exitSelectMode = () => {
    setSelecting(false);
    setSelectedIds([]);
  };

  const handleItemClick = (img: Image) => {
    if (selecting) {
      setSelectedIds((prev) =>
        prev.includes(img.id) ? prev.filter((x) => x !== img.id) : [...prev, img.id]
      );
    } else {
      setLightbox(img);
    }
  };

  const handleRemoveSelected = async () => {
    if (!albumid || selectedIds.length === 0) return;
    setRemoving(true);
    try {
      await api.modifyAlbumImages(albumid, selectedIds, 'remove');
      toast.success(`已从相册移出 ${selectedIds.length} 张图片`);
      const removed = new Set(selectedIds);
      setImages((prev) => prev.filter((img) => !removed.has(img.id)));
      exitSelectMode();
    } catch (err) {
      toast.error((err as Error)?.message ?? '移出图片失败');
    } finally {
      setRemoving(false);
    }
  };

  /* ---------- 加图 / 删除 ---------- */

  const handleAddImages = async (ids: string[]) => {
    if (!albumid || ids.length === 0) return;
    setAdding(true);
    try {
      await api.modifyAlbumImages(albumid, ids, 'add');
      toast.success(`已加入 ${ids.length} 张图片到「${album?.name ?? '本相册'}」`);
      setShowPicker(false);
      await load(accessPwd || undefined);
    } catch (err) {
      toast.error((err as Error)?.message ?? '加入图片失败');
    } finally {
      setAdding(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirm || !albumid) return;
    setBusy(true);
    try {
      if (confirm.kind === 'album') {
        await api.deleteAlbum(albumid);
        toast.success('相册已解散，其中的图片仅解除归属');
        navigate('/albums');
      } else {
        await api.deleteImagePhysically(confirm.image.id);
        toast.success('图片已在物理世界彻底抹除');
        setLightbox(null);
        setImages((prev) => prev.filter((img) => img.id !== confirm.image.id));
        setConfirm(null);
      }
    } catch (err) {
      toast.error((err as Error)?.message ?? (confirm.kind === 'album' ? '删除相册失败' : '删除图片失败'));
    } finally {
      setBusy(false);
    }
  };

  /* ---------- 渲染 ---------- */

  return (
    <div className="album-detail-container">
      {/* 顶部毛玻璃返回栏 */}
      <div className="ad-topbar">
        <motion.button
          type="button"
          className="ad-back"
          whileTap={{ scale: 0.88 }}
          onClick={() => navigate('/albums')}
          aria-label="返回相册列表"
        >
          <ArrowLeft size={19} strokeWidth={1.5} />
        </motion.button>
        <div className="ad-heading">
          <h1 className="ad-title">{album?.name ?? '相册详情'}</h1>
          {album?.has_password && (
            <span className="ad-lock-chip">
              <KeyRound size={11} strokeWidth={1.8} />
              加密相册
            </span>
          )}
        </div>
        <div className="ad-actions">
          {album && (
            <>
              <motion.button
                type="button"
                className={`ad-icon-btn ${selecting ? 'active' : ''}`}
                whileTap={{ scale: 0.88 }}
                onClick={() => {
                  setSelecting((s) => !s);
                  setSelectedIds([]);
                }}
                aria-label={selecting ? '退出多选模式' : '进入多选模式'}
                title="多选操作"
              >
                <SquareCheck size={17} strokeWidth={1.5} />
              </motion.button>
              <motion.button
                type="button"
                className="ad-icon-btn"
                whileTap={{ scale: 0.88 }}
                onClick={() => setShowPicker(true)}
                aria-label="加入图片"
                title="加入图片"
              >
                <ImagePlus size={17} strokeWidth={1.5} />
              </motion.button>
              <motion.button
                type="button"
                className="ad-icon-btn danger"
                whileTap={{ scale: 0.88 }}
                onClick={() => setConfirm({ kind: 'album' })}
                aria-label="解散相册"
                title="解散相册"
              >
                <Trash2 size={17} strokeWidth={1.5} />
              </motion.button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <Loader text="正在提取相册归档..." />
      ) : locked ? (
        /* ===== 提取码解锁面板（毛玻璃卡片） ===== */
        <motion.form
          className="ad-unlock-card"
          onSubmit={handleUnlock}
          initial={{ opacity: 0, y: 26, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        >
          <div className="ad-unlock-icon">
            <KeyRound size={26} strokeWidth={1.5} />
          </div>
          <h3 className="ad-unlock-title">这是一份加密相册</h3>
          <p className="ad-unlock-desc">输入创建者设置的相册提取码即可打开归档</p>
          <div className="ad-unlock-field">
            <input
              ref={unlockRef}
              className="ad-unlock-input"
              type="password"
              placeholder="请输入提取码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={32}
              autoComplete="off"
            />
            <button className="ad-unlock-btn" type="submit" disabled={unlocking}>
              {unlocking && <span className="ad-spinner" />}
              校验并解锁
            </button>
          </div>
        </motion.form>
      ) : notFound ? (
        <EmptyState
          variant="album"
          title="相册不存在或无权访问"
          description="它可能已被解散，请返回列表确认后重试"
        />
      ) : album ? (
        <>
          {/* 相册信息区 */}
          <div className="ad-head">
            {album.description && <p className="ad-head-desc">{album.description}</p>}
            <div className="ad-chips">
              <span className="ad-chip">
                <Calendar size={12} strokeWidth={1.5} />
                {new Date(album.created_at).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                创建
              </span>
              <span className="ad-chip">
                <Images size={12} strokeWidth={1.5} />
                {images.length} 张图片
              </span>
              {images.length > 0 && (
                <span className="ad-chip">
                  归档 {formatBytes(images.reduce((sum, img) => sum + img.file_size, 0))}
                </span>
              )}
            </div>
          </div>

          {/* 空状态（手绘插画） */}
          {images.length === 0 ? (
            <EmptyState
              variant="album"
              title="相册还是空的"
              description="从图库中挑选心仪的图片加入这个相册吧"
              actionText="挑选图片加入"
              onAction={() => setShowPicker(true)}
            />
          ) : (
            /* ===== 图片网格（懒加载 + 悬停微缩放） ===== */
            <motion.div
              className="ad-grid"
              variants={gridContainer}
              initial="hidden"
              animate="visible"
            >
              {images.map((img) => {
                const selected = selectedIds.includes(img.id);
                return (
                  <motion.div
                    key={img.id}
                    className={`ad-item ${selecting ? 'selecting' : ''} ${selected ? 'selected' : ''}`}
                    variants={gridItem}
                    whileHover={{ y: selecting ? -2 : -4 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleItemClick(img)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleItemClick(img);
                      }
                    }}
                  >
                    <img src={api.getFileUrl(img.id, true)} alt={img.file_name} loading="lazy" draggable={false} />
                    {selecting && (
                      <span className="ad-check">
                        {selected && <Check size={13} strokeWidth={2.5} />}
                      </span>
                    )}
                    <span className="ad-name">{img.file_name}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </>
      ) : null}

      {/* ===== 批量操作条（多选后浮动） ===== */}
      <AnimatePresence>
        {selecting && selectedIds.length > 0 && (
          <motion.div
            className="batch-bar"
            initial={{ opacity: 0, y: 44 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 44 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <span className="batch-bar-count">已选 {selectedIds.length} 张</span>
            <button
              className="batch-bar-btn danger"
              onClick={handleRemoveSelected}
              disabled={removing}
            >
              {removing && <span className="ad-spinner" />}
              <Trash2 size={15} strokeWidth={1.5} />
              移出相册
            </button>
            <button className="batch-bar-btn" onClick={exitSelectMode}>
              <X size={15} strokeWidth={1.5} />
              取消选择
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 详情光箱（复用图库级组件） ===== */}
      <ImageLightbox
        image={lightbox}
        onClose={() => setLightbox(null)}
        onRequestDelete={(img) => setConfirm({ kind: 'image', image: img })}
      />

      {/* ===== 删除确认弹层 ===== */}
      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'album' ? '解散这本相册？' : '永久删除这张图片？'}
        description={
          confirm?.kind === 'album'
            ? '相册内的图片不会被删除，只会解除与相册的归属关系，此操作不可撤销。'
            : '此操作将同步删除 Telegram 频道中的原始消息，且不可恢复。'
        }
        confirmText={confirm?.kind === 'album' ? '确认解散' : '永久删除'}
        danger
        loading={busy}
        onConfirm={handleConfirm}
        onClose={() => setConfirm(null)}
      />

      {/* ===== 图库选图加入相册 ===== */}
      <ImagePickerModal
        open={showPicker}
        title="挑选图片加入相册"
        subtitle={album ? `加入到「${album.name}」` : undefined}
        excludeIds={images.map((img) => img.id)}
        confirmText="加入相册"
        submitting={adding}
        onClose={() => setShowPicker(false)}
        onConfirm={handleAddImages}
      />
    </div>
  );
};
