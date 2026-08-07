import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Eye,
  ImagePlus,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Image } from '../../services/api';
import { SEARCH_EVENT } from '../../config/navigation';
import { UploadZone } from '../../components/common/UploadZone';
import type { UploadProgress } from '../../components/common/UploadZone';
import { GalleryFilterBar } from '../../components/common/GalleryFilterBar';
import type { GalleryFilter } from '../../components/common/GalleryFilterBar';
import { GallerySkeleton } from '../../components/common/GallerySkeleton';
import { GalleryEmpty } from '../../components/common/GalleryEmpty';
import { ImageLightbox } from '../../components/common/ImageLightbox';
import { ConfirmSheet } from '../../components/common/ConfirmSheet';
import { formatBytes, formatNumber } from '../../components/common/format';
import './gallery.css';
import '../../components/common/galleryList.css';

/** 浏览模式单页条数（配合「加载更多」按钮，大页承载筛选排序） */
const PAGE_SIZE = 32;

/** 删除确认弹层状态：批量回收站 / 单张物理抹除 */
type ConfirmState =
  | { kind: 'batch'; ids: string[] }
  | { kind: 'single'; image: Image }
  | null;

export const Gallery: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [images, setImages] = useState<Image[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // 搜索（300ms 防抖，activeQuery 为实际生效的关键词）
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  // 筛选（客户端对已加载列表排序，不改变分页数据源）
  const [filter, setFilter] = useState<GalleryFilter>('all');

  // 上传
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  // 批量选择 / 光箱 / 确认弹层
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<Image | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // 联动引用
  const zoneRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
    const reqSeq = useRef(0);

  // 客户端排序：最近上传 = uploaded_at 倒序，浏览最多 = views 倒序（仅作用于已加载列表）
  const sortedImages = useMemo(() => {
    if (filter === 'recent') return [...images].sort((a, b) => b.uploaded_at - a.uploaded_at);
    if (filter === 'popular') return [...images].sort((a, b) => b.views - a.views);
    return images;
  }, [images, filter]);

  /* ---------- 数据拉取（seq 竞态护栏，防止慢响应覆盖新结果） ---------- */

  const fetchFirstPage = async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    try {
      const res = await api.getImages(1, PAGE_SIZE);
      if (seq !== reqSeq.current) return;
      setImages(res.images);
      setTotal(res.total);
      setPage(1);
    } catch {
      if (seq !== reqSeq.current) return;
      toast.error('加载图片列表失败');
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };

  const runSearch = async (keyword: string) => {
    const seq = ++reqSeq.current;
    setLoading(true);
    try {
      const res = await api.searchImages(keyword);
      if (seq !== reqSeq.current) return;
      setImages(res.images);
      setTotal(res.images.length);
      setPage(1);
    } catch {
      if (seq !== reqSeq.current) return;
      toast.error('搜索失败');
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || activeQuery) return;
    const seq = ++reqSeq.current;
    setLoadingMore(true);
    try {
      const res = await api.getImages(page + 1, PAGE_SIZE);
      if (seq !== reqSeq.current) return;
      setImages((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...res.images.filter((img) => !seen.has(img.id))];
      });
      setTotal(res.total);
      setPage((p) => p + 1);
    } catch {
      if (seq === reqSeq.current) toast.error('加载更多失败');
    } finally {
      if (seq === reqSeq.current) setLoadingMore(false);
    }
  };

  const refresh = () => {
    if (activeQuery) void runSearch(activeQuery);
    else void fetchFirstPage();
  };

  // 初次加载 + 防抖搜索联动
  useEffect(() => {
    const timer = window.setTimeout(() => setActiveQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (activeQuery) void runSearch(activeQuery);
    else void fetchFirstPage();
    // 仅响应关键词变化，方法本体以最新闭包执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeQuery]);

  /* ---------- 全局事件联动（Header 搜索快捷按钮） ---------- */

  const scrollToUpload = () => {
    zoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  useEffect(() => {
    const onSearchEvent = () => {
      searchRef.current?.focus();
      searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    };
    window.addEventListener(SEARCH_EVENT, onSearchEvent);
    return () => {
      window.removeEventListener(SEARCH_EVENT, onSearchEvent);
    };
  }, []);

  /* ---------- 上传（逐张中转，内联进度，禁止重复提交） ---------- */

  const handleFiles = async (files: File[]) => {
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setProgress({ done: 0, total: files.length, currentName: files[0].name });

    let success = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ done: i, total: files.length, currentName: file.name });
      try {
        await api.uploadFile(file);
        success++;
      } catch (err: any) {
        toast.error(`「${file.name}」上传失败：${err?.message ?? '未知错误'}`);
      }
    }

    setProgress({ done: files.length, total: files.length, currentName: '' });
    if (success > 0) {
      toast.success(
        success === files.length
          ? `成功归档 ${success} 张文件！`
          : `成功归档 ${success} 张，${files.length - success} 张失败`
      );
      refresh();
    } else {
      toast.error('上传全部失败，请稍后重试');
    }
    setUploading(false);
    setProgress(null);
  };

  /* ---------- 批量选择 ---------- */

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);

  /* ---------- 删除（精致确认弹层驱动） ---------- */

  const handleBatchDelete = async () => {
    if (!confirmState || confirmState.kind !== 'batch') return;
    setConfirmBusy(true);
    try {
      const res = await api.batchDeleteImages(confirmState.ids);
      toast.success(res.message || `已将 ${confirmState.ids.length} 张图片移入回收站`);
      setSelectedIds([]);
      setConfirmState(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? '批量删除失败');
    } finally {
      setConfirmBusy(false);
    }
  };

  const handlePhysicalDelete = async () => {
    if (!confirmState || confirmState.kind !== 'single') return;
    setConfirmBusy(true);
    try {
      await api.deleteImagePhysically(confirmState.image.id);
      toast.success('图片已在物理世界彻底抹除销毁');
      setLightboxImage(null);
      setConfirmState(null);
      refresh();
    } catch (err: any) {
      toast.error(err?.message ?? '物理删除失败');
    } finally {
      setConfirmBusy(false);
    }
  };

  const closeLightbox = useCallback(() => setLightboxImage(null), []);

  /* ---------- 渲染 ---------- */

  return (
    <div className="gallery-container">
      {/* 上传区（仅对登录用户展示） */}
      {user && (
        <div className="g-upload-wrap">
          <UploadZone
            onFiles={handleFiles}
            uploading={uploading}
            progress={progress}
            zoneRef={zoneRef}
          />
        </div>
      )}

      {/* 筛选 chips：全部 / 最近上传 / 浏览最多 */}
      <GalleryFilterBar value={filter} onChange={setFilter} />

      {/* 工具栏 */}
      <div className="gallery-toolbar">
        <div className="search-box">
          <Search size={14} strokeWidth={1.5} className="search-icon" />
          <input
            ref={searchRef}
            type="text"
            className="search-input"
            placeholder="搜索图片名称..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')} aria-label="清除搜索">
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>

        <div className="batch-actions">
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                className="gallery-batch-bar"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <span className="select-count">已选 {selectedIds.length} 项</span>
                <motion.button
                  className="action-btn danger-btn"
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setConfirmState({ kind: 'batch', ids: selectedIds })}
                >
                  <Trash2 size={15} strokeWidth={1.5} />
                  移入回收站
                </motion.button>
                <button className="action-btn" onClick={clearSelection}>
                  <X size={15} strokeWidth={1.5} />
                  取消
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button className="action-btn" whileTap={{ scale: 0.96 }} onClick={refresh}>
            <RefreshCw size={15} strokeWidth={1.5} className={loading ? 'g-spin' : ''} />
            刷新
          </motion.button>
        </div>
      </div>

      {/* 计数行 */}
      {!loading && images.length > 0 && (
        <div className="gallery-count">
          {activeQuery ? (
            <span>搜索「<em className="count-query">{activeQuery}</em>」共 {images.length} 张</span>
          ) : (
            <span>共 {formatNumber(total)} 张图片</span>
          )}
        </div>
      )}

      {/* 列表流：骨架屏 / 空状态 / 瀑布流 */}
      {loading ? (
        <GallerySkeleton count={12} />
      ) : images.length === 0 ? (
        <GalleryEmpty
          title={activeQuery ? '没有找到匹配的图片' : (user ? '图库空空如也' : '期待第一幅作品的诞生')}
          description={
            activeQuery
              ? '换个关键词试试，或清除搜索浏览全部图片。'
              : (user ? '把图片拖进上方上传区，瞬间完成中转归档。' : '这座艺术馆还在等待它的第一批展品。')
          }
          actionText={activeQuery ? '清除搜索' : (user ? '去上传第一张图' : '登录开启你的创作')}
          onAction={activeQuery ? () => setQuery('') : (user ? scrollToUpload : () => navigate('/login'))}
        />
      ) : (
        <div className="masonry-grid">
          <AnimatePresence>
            {sortedImages.map((img, i) => {
              const selected = selectedIds.includes(img.id);
              return (
                <motion.div
                  key={img.id}
                  className={`masonry-item ${selected ? 'selected' : ''}`}
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ delay: Math.min(i * 0.02, 0.35), duration: 0.42, ease: 'easeOut' }}
                  onClick={() => setLightboxImage(img)}
                >
                  <img
                    src={api.getFileUrl(img.id, true)}
                    alt={img.file_name}
                    className="masonry-img"
                    loading="lazy"
                    draggable={false}
                  />
                  <button className="card-select" onClick={(e) => toggleSelect(img.id, e)} aria-label={selected ? '取消选择' : '选择图片'}>
                    {selected && <Check size={12} strokeWidth={2.5} />}
                  </button>
                  <div className="masonry-overlay">
                    <p className="masonry-title">{img.file_name}</p>
                    <div className="masonry-meta">
                      <span>{formatBytes(img.file_size)}</span>
                      <span className="masonry-views"><Eye size={11} strokeWidth={1.5} />{formatNumber(img.views)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 加载更多 */}
      {!loading && !activeQuery && images.length > 0 && images.length < total && (
        <div className="load-more-wrap">
          <motion.button
            className="load-more-btn"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <Loader2 size={14} strokeWidth={1.5} className="g-spin" />
            ) : (
              <ImagePlus size={14} strokeWidth={1.5} />
            )}
            {loadingMore ? '正在加载...' : `加载更多（${images.length} / ${formatNumber(total)}）`}
          </motion.button>
        </div>
      )}

      {/* 详情光箱 */}
      <ImageLightbox
        image={lightboxImage}
        onClose={closeLightbox}
        onRequestDelete={(img) => setConfirmState({ kind: 'single', image: img })}
      />

      {/* 删除确认弹层（移动端底部弹层，桌面自动居中） */}
      <ConfirmSheet
        open={confirmState !== null}
        title={
          confirmState?.kind === 'batch'
            ? `将 ${confirmState.ids.length} 张图片移入回收站？`
            : '永久删除这张图片？'
        }
        description={
          confirmState?.kind === 'batch'
            ? '回收站内的图片不再于图库展示，可随时恢复。'
            : '此操作将同步删除 Telegram 频道中的原始消息，且不可恢复。'
        }
        confirmText={confirmState?.kind === 'batch' ? '移入回收站' : '永久删除'}
        tone="danger"
        loading={confirmBusy}
        onConfirm={confirmState?.kind === 'batch' ? handleBatchDelete : handlePhysicalDelete}
        onClose={() => setConfirmState(null)}
      />
    </div>
  );
};
