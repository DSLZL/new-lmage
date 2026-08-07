import React, { useState } from 'react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { MobileSheet } from './MobileSheet';
import './modals.css';

interface CreateAlbumModalProps {
  open: boolean;
  onClose: () => void;
  /** 创建成功回调（携带新相册 id，供调用方联动自动归档等） */
  onCreated: (albumid: string) => void;
}

/** 创建相册弹层：名称 + 描述 + 可选提取码（移动端底部弹层，桌面自动居中） */
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
      const res = await api.createAlbum({
        name: formName.trim(),
        description: formDesc.trim() ? formDesc.trim() : undefined,
        password: formPwd.trim() ? formPwd : undefined,
      });
      toast.success('相册创建成功');
      onClose();
      setFormName('');
      setFormDesc('');
      setFormPwd('');
      onCreated(res.albumid);
    } catch (err: any) {
      toast.error(err.message || '创建相册失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MobileSheet open={open} onClose={onClose} title="创建全新相册">
      <form className="create-album-sheet" onSubmit={handleCreate}>
        <div className="modal-field">
          <label className="modal-label">相册名称（必填）</label>
          <input
            className="modal-input"
            placeholder="例如：夏日旅行"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            maxLength={40}
            autoFocus
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
      </form>
    </MobileSheet>
  );
};
