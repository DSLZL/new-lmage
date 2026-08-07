import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Film,
  Image,
  Loader2,
  LogIn,
  Music,
  ShieldAlert,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './uploadZone.css';

export interface UploadProgress {
  done: number;
  total: number;
  currentName: string;
}

interface UploadZoneProps {
  /** 接收待上传文件（父组件负责逐张中转归档） */
  onFiles: (files: File[]) => void;
  uploading: boolean;
  progress: UploadProgress | null;
  /** 外层滚动定位锚点（Header 上传按钮联动） */
  zoneRef?: React.RefObject<HTMLDivElement | null>;
  /** 高亮闪烁触发器：值变化即重放闪环动画 */
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** 游客限速窗口：后端按「每分钟 5 张」分钟窗口限流，429 后整窗剩余时间均受限 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** 429 判定：后端限速文案固定含「限速」 */
const isRateLimitError = (err: unknown): boolean => {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return message.includes('限速');
};

const REJECT_MESSAGES: Record<string, string> = {
  'file-too-large': '文件超过 20MB 限制',
  'file-invalid-type': '不支持的媒体格式',
  'too-many-files': '单次上传文件过多',
};

/* ---------- 429 限速探测接线 ----------
   上传循环由 Gallery 父组件逐张执行（api.uploadFile 内部消化错误），
   UploadZone 无法经 props 感知 429，因此在本模块加载时对 api.uploadFile
   做一层透传代理：捕获含「限速」的错误后广播给当前上传区实例，
   其余行为（成功计数 / 父级 toast）完全不变。 */
type RateLimitListener = (message: string) => void;
const rateLimitListeners = new Set<RateLimitListener>();

const GUEST_LIMIT_MESSAGE = '游客上传限速：每分钟最多 5 张，登录后不限速';

let rateLimitPatched = false;
if (!rateLimitPatched) {
  rateLimitPatched = true;
  const originalUploadFile = api.uploadFile;
  api.uploadFile = async (file: File, albumid?: string) => {
    try {
      return await originalUploadFile(file, albumid);
    } catch (err: unknown) {
      if (isRateLimitError(err)) {
        const message =
          err instanceof Error && err.message.trim() !== '' ? err.message : GUEST_LIMIT_MESSAGE;
        rateLimitListeners.forEach((listener) => listener(message));
      }
      throw err;
    }
  };
}

/** 极致化拖拽上传区：呼吸虚线 + 拖入缩放发光 + 图标悬浮 + 内联进度 + 游客限速 */
export const UploadZone: React.FC<UploadZoneProps> = ({
  onFiles,
  uploading,
  progress,
  zoneRef,
}) => {
  const { user } = useAuth();
  const isGuest = !user;
  const navigate = useNavigate();

  // 限速态：until 为分钟窗口到期时间戳，message 为后端原文案
  const [rateLimit, setRateLimit] = useState<{ message: string; until: number } | null>(null);
  const [nowTick, setNowTick] = useState(0);
  // 限速窗口内被拦截的投放次数（驱动横幅抖动重放）
  const [blockAttempt, setBlockAttempt] = useState(0);

  // 订阅限速广播（探测接线见文件头）
  useEffect(() => {
    const listener: RateLimitListener = (message) => {
      setRateLimit({ message, until: Date.now() + RATE_LIMIT_WINDOW_MS });
      setNowTick(Date.now());
    };
    rateLimitListeners.add(listener);
    return () => {
      rateLimitListeners.delete(listener);
    };
  }, []);

  // 秒级倒计时，分钟窗口结束自动复位
  useEffect(() => {
    if (!rateLimit) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now >= rateLimit.until) {
        setRateLimit(null);
      } else {
        setNowTick(now);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [rateLimit]);

  const secondsLeft = rateLimit
    ? Math.max(0, Math.ceil((rateLimit.until - nowTick) / 1000))
    : 0;
  const rateLimited = rateLimit !== null && secondsLeft > 0;
  const limitText = secondsLeft >= 60 ? '1 分钟后恢复' : `约 ${secondsLeft} 秒后恢复`;

  const handleDrop = (files: File[]) => {
    // 限速窗口内拦截投放：不触发上传，透传后端文案提示
    if (rateLimit !== null && secondsLeft > 0) {
      setBlockAttempt((n) => n + 1);
      toast.error(rateLimit.message);
      return;
    }
    onFiles(files);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { 'image/*': [], 'video/*': [], 'audio/*': [] },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: uploading,
    onDropRejected: (rejections) => {
      for (const rejection of rejections) {
        const code = rejection.errors[0]?.code ?? '';
        toast.error(`「${rejection.file.name}」${REJECT_MESSAGES[code] ?? '不符合上传要求'}`);
      }
    },
  });

  // 显式解构根处理器：getRootProps 的类型被宽化为完整 HTMLAttributes
  // （含原生 onDrag 等），与 framer-motion 拖拽手势签名冲突，故不整体展开
  const {
    onKeyDown,
    onFocus,
    onBlur,
    onClick,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  } = getRootProps();

  const percent = progress
    ? Math.round((progress.done / Math.max(progress.total, 1)) * 100)
    : 0;

  const zoneClass = [
    'upload-zone',
    isDragActive ? 'drag-active' : '',
    uploading ? 'uploading' : '',
    rateLimited ? 'rate-limited' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      ref={zoneRef}
      className={zoneClass}
      animate={{ scale: isDragActive ? 1.012 : 1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <input {...getInputProps()} />

      <motion.div
        className="upload-icon-wrap"
        animate={{ y: [0, -7, 0] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
      >
        {uploading ? (
          <Loader2 size={42} strokeWidth={1.5} className="upload-icon g-spin" />
        ) : rateLimited ? (
          <ShieldAlert size={42} strokeWidth={1.5} className="upload-icon" />
        ) : (
          <UploadCloud size={42} strokeWidth={1.5} className="upload-icon" />
        )}
      </motion.div>

      <h3 className="upload-title">
        {uploading
          ? '正在中转归档'
          : rateLimited
            ? '已达游客上传上限'
            : '点击或拖拽文件到这里上传'}
      </h3>
      <p className="upload-desc">
        {uploading && progress
          ? `正在上传：${progress.currentName}`
          : isGuest
            ? '游客模式：每 5 分钟限 5 张，单文件上限 20MB'
            : '支持原图 / 视频 / 音频，单文件上限 20MB，可多选批量上传'}
      </p>

      {rateLimited && (
        <div className="upload-limit-wrap" role="status" aria-live="polite">
          <motion.div
            key={blockAttempt}
            className="upload-limit-banner"
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: [0, -6, 6, -3, 3, 0] }}
            transition={{ duration: 0.28 }}
          >
            <ShieldAlert size={14} strokeWidth={1.6} />
            <span>
              已达游客上传上限，{limitText}
              {isGuest ? '，登录后不限速' : ''}
            </span>
          </motion.div>
        </div>
      )}

      {!uploading && (
        <div className="upload-chips">
          <span className="upload-chip">
            <Image size={12} strokeWidth={1.5} />
            图片
          </span>
          <span className="upload-chip">
            <Film size={12} strokeWidth={1.5} />
            视频
          </span>
          <span className="upload-chip">
            <Music size={12} strokeWidth={1.5} />
            音频
          </span>
          {isGuest && (
            <motion.button
              type="button"
              className="upload-guest-chip"
              whileTap={{ scale: 0.94 }}
              onClick={() => navigate('/login')}
            >
              <LogIn size={12} strokeWidth={1.8} />
              登录解锁无限上传
            </motion.button>
          )}
        </div>
      )}

      {uploading && progress && (
        <div className="upload-progress">
          <div className="upload-progress-track">
            <motion.div
              className="upload-progress-bar"
              initial={false}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </div>
          <div className="upload-progress-meta">
            <span>
              已完成 {progress.done} / {progress.total} 个文件
            </span>
            <span className="upload-percent">{percent}%</span>
          </div>
        </div>
      )}

      {uploading && progress && progress.done === progress.total && (
        <div className="upload-done-hint">
          <CheckCircle2 size={14} strokeWidth={1.5} />
          归档完成，正在刷新图库...
        </div>
      )}
    </motion.div>
  );
};
