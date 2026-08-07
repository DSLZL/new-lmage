import React from 'react';
import { AlertTriangle, CircleCheck } from 'lucide-react';
import { MobileSheet } from './MobileSheet';
import './ConfirmSheet.css';

export interface ConfirmSheetProps {
  /** 是否显示弹层 */
  open: boolean;
  /** 确认框标题 */
  title: string;
  /** 说明文字（可选） */
  description?: string;
  /** 确认按钮文案，默认 '确认' */
  confirmText?: string;
  /** 取消按钮文案，默认 '取消' */
  cancelText?: string;
  /** 确认模式：danger 危险操作（红色系）/ normal 常规确认（青蓝系），默认 'normal' */
  tone?: 'danger' | 'normal';
  /** 确认按钮 loading 态（loading 期间禁止任何关闭操作） */
  loading?: boolean;
  /** 确认回调 */
  onConfirm: () => void;
  /** 关闭回调（取消按钮 / 遮罩 / Esc / 下滑手势） */
  onClose: () => void;
}

/**
 * ConfirmSheet — 移动端底部确认弹层
 *
 * 基于 MobileSheet 封装：icon + 标题 + 说明 + 确认/取消按钮。
 * danger 模式为红色危险操作视觉，normal 模式为青蓝常规确认视觉。
 *
 * 用法：
 * <ConfirmSheet
 *   open={open}
 *   title="删除相册"
 *   description="删除后不可恢复，确定继续吗？"
 *   tone="danger"
 *   loading={deleting}
 *   onConfirm={handleDelete}
 *   onClose={() => setOpen(false)}
 * />
 */
export const ConfirmSheet: React.FC<ConfirmSheetProps> = ({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  tone = 'normal',
  loading = false,
  onConfirm,
  onClose,
}) => {
  const isDanger = tone === 'danger';

  return (
    <MobileSheet
      open={open}
      onClose={loading ? () => undefined : onClose}
      ariaLabel={title}
    >
      <div className="confirm-sheet">
        <div
          className={`confirm-sheet-icon ${
            isDanger ? 'confirm-sheet-icon-danger' : 'confirm-sheet-icon-normal'
          }`}
          aria-hidden="true"
        >
          {isDanger ? (
            <AlertTriangle size={26} strokeWidth={1.6} />
          ) : (
            <CircleCheck size={26} strokeWidth={1.6} />
          )}
        </div>
        <h3 className="confirm-sheet-title">{title}</h3>
        {description && <p className="confirm-sheet-desc">{description}</p>}
        <div className="confirm-sheet-actions">
          <button
            type="button"
            className="confirm-sheet-btn confirm-sheet-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-sheet-btn ${
              isDanger ? 'confirm-sheet-btn-danger' : 'confirm-sheet-btn-confirm'
            }`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <span className="confirm-sheet-spinner" aria-hidden="true" />}
            {confirmText}
          </button>
        </div>
      </div>
    </MobileSheet>
  );
};
