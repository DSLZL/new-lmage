import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import './modals.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const cardMotion = {
  initial: { opacity: 0, y: 36, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 30 },
  },
  exit: { opacity: 0, y: 18, scale: 0.96, transition: { duration: 0.16 } },
};

/** 精致二级确认弹层（危险操作 / 通用确认） */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          {...overlayMotion}
          onClick={loading ? undefined : onClose}
        >
          <motion.div
            className="modal-card confirm-card"
            {...cardMotion}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`confirm-icon ${danger ? 'confirm-icon-danger' : ''}`}>
              <AlertTriangle size={22} strokeWidth={1.5} />
            </div>
            <h3 className="modal-title confirm-title">{title}</h3>
            {description && <p className="modal-subtitle confirm-desc">{description}</p>}
            <div className="modal-footer">
              <button className="modal-btn" onClick={onClose} disabled={loading}>
                {cancelText}
              </button>
              <button
                className={`modal-btn ${danger ? 'modal-btn-danger' : 'modal-btn-primary'}`}
                onClick={onConfirm}
                disabled={loading}
              >
                {loading && <span className="modal-spinner" />}
                {confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
