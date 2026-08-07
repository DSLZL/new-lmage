import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { TAB_ITEMS, requestUpload } from '../../config/navigation';
import './bottomtab.css';

/**
 * 移动端底部 Tab 导航：图库|相册 ⚡ FAB ⚡ 标签|大盘 对称五段
 * 账户入口已上移至 MobileTopBar，此处只保留页面导航与上传主操作
 */
export const BottomTab: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 按主次切分左右两组：左（图库、相册）+ 右（标签、大盘）
  const leftGroup = TAB_ITEMS.slice(0, 2);
  const rightGroup = TAB_ITEMS.slice(2);

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  const handleTabClick = (path: string) => {
    vibrate();
    navigate(path);
  };

  const renderTab = (tab: (typeof TAB_ITEMS)[number]) => {
    const Icon = tab.icon;
    const active = location.pathname === tab.path;
    return (
      <button
        key={tab.id}
        type="button"
        className={`bt-item ${active ? 'active' : ''}`}
        onClick={() => handleTabClick(tab.path)}
      >
        <span className="bt-item-icon-wrap">
          {active && (
            <motion.span
              layoutId="tab-indicator"
              className="bt-indicator"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <Icon size={20} strokeWidth={1.5} fill={active ? 'currentColor' : 'none'} className="bt-item-icon" />
        </span>
        <span className={`bt-item-label ${active ? 'premium-gradient-text' : ''}`}>{tab.label}</span>
      </button>
    );
  };

  return (
    <div className="mobile-bottom-tab">
      {/* 左组：图库 / 相册 */}
      <div className="bt-group">{leftGroup.map(renderTab)}</div>

      {/* 中央凸起上传 FAB */}
      <div className="bt-fab-zone">
        <motion.button
          type="button"
          className="bt-fab"
          aria-label="上传图片"
          onClick={requestUpload}
          whileTap={{ scale: 0.9 }}
        >
          <UploadCloud size={22} strokeWidth={1.8} />
        </motion.button>
      </div>

      {/* 右组：标签 / 大盘 */}
      <div className="bt-group">{rightGroup.map(renderTab)}</div>
    </div>
  );
};
