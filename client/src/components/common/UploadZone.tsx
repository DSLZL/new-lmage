import React from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { CheckCircle2, Film, Image, Loader2, Music, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
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
  flashKey?: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const REJECT_MESSAGES: Record<string, string> = {
  'file-too-large': '文件超过 20MB 限制',
  'file-invalid-type': '不支持的媒体格式',
  'too-many-files': '单次上传文件过多',
};

/** 极致化拖拽上传区：呼吸虚线 + 拖入缩放发光 + 图标悬浮 + 内联进度 */
export const UploadZone: React.FC<UploadZoneProps> = ({
  onFiles,
  uploading,
  progress,
  zoneRef,
  flashKey = 0,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFiles,
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

  const percent = progress
    ? Math.round((progress.done / Math.max(progress.total, 1)) * 100)
    : 0;

  return (
    <div
      {...getRootProps()}
      ref={zoneRef}
      className={`upload-zone ${isDragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
    >
      <input {...getInputProps()} />
      {flashKey > 0 && <span key={flashKey} className="zone-flash-ring" />}

      <motion.div
        className="upload-icon-wrap"
        animate={{ y: [0, -7, 0] }}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
      >
        {uploading ? (
          <Loader2 size={42} strokeWidth={1.5} className="upload-icon g-spin" />
        ) : (
          <UploadCloud size={42} strokeWidth={1.5} className="upload-icon" />
        )}
      </motion.div>

      <h3 className="upload-title">
        {uploading ? '正在中转归档' : '点击或拖拽文件到这里上传'}
      </h3>
      <p className="upload-desc">
        {uploading && progress
          ? `正在上传：${progress.currentName}`
          : '支持原图 / 视频 / 音频，单文件上限 20MB，可多选批量上传'}
      </p>

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
            <span>{percent}%</span>
          </div>
        </div>
      )}

      {uploading && progress && progress.done === progress.total && (
        <div className="upload-done-hint">
          <CheckCircle2 size={14} strokeWidth={1.5} />
          归档完成，正在刷新图库...
        </div>
      )}
    </div>
  );
};
