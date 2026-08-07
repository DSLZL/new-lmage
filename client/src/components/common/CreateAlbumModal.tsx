import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import './modals.css';

interface CreateAlbumModalProps {
  open: boolean;
  onClose: () => void;
  /** 创建成功并刷新列表后的回调 */
  onCreated: () => void;
}

const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalCardMotion = {
  initial: { opacity: 0, y: 36, scale: 0.94 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 380, damping: 30 },
  },
  exit: { opacity: 0, y: 18, scale: 0.96, transition: { duration: 0.16 } },
};

/** 创建相册模态：名称 + 描述 + 可选提取码（隐私相册） */
export const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ open, onClose, onCreated }) => {
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPwd, setFormPwd] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.warning('请填写相册名称');
      return;
    }
    setCreating(true);
    try {
      await api.createAlbum({
        name: formName.trim(),
        description: formDesc.trim() ? formDesc.trim() : undefined,
        password: formPwd.trim() ? formPwd : undefined,
      });
      toast.success('相册创建成功');
      onClose();
      setFormName('');
      setFormDesc('');
      setFormPwd('');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || '创建相册失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-overlay" {...overlayMotion} onClick={onClose}>
          <motion.form
            className="modal-card create-album-modal"
            {...modalCardMotion}
            onSubmit={handleCreate}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div>
                <h3 className="modal-title">创建全新相册</h3>
                <p className="modal-subtitle">归档你的影像，可选提取码设为私密相册</p>
              </div>
              <X size={14} strokeWidth={1.5} className="modal-close" onClick={onClose} />
            </div>

            <div className="modal-field">
              <label className="modal-label">相册名称（必填）</label>
              <input
                className="modal-input"
                placeholder="例如：夏日旅行"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                maxLength={40}
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">相册描述</label>
              <textarea
                className="modal-input"
                placeholder="简单描述这本相册的主题..."
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                maxLength={120}
              />
            </div>

            <div className="modal-field">
              <label className="modal-label">访问提取码（选填，设置后他人需密码才能查看）</label>
              <input
                className="modal-input"
                type="password"
                placeholder="留空即为公开相册"
                value={formPwd}
                onChange={(e) => setFormPwd(e.target.value)}
                maxLength={32}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="modal-btn" onClick={onClose}>
                取消
              </button>
              <button type="submit" className="modal-btn modal-btn-primary" disabled={creating}>
                {creating && <span className="modal-spinner" />}
                确定创建
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
