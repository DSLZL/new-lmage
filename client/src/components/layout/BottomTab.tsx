import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { TAB_ITEMS } from '../../config/navigation';
import './bottomtab.css';

/**
 * 移动端底部 Tab 导航：灵动岛聚合式设计 (Dynamic Island)
 * 数据源 TAB_ITEMS（config/navigation）
 */
export const BottomTab: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const vibrate = (pattern: number | number[] = 15) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  const handleTabClick = (tab: (typeof TAB_ITEMS)[number]) => {
    if (tab.requiresAuth && !user) {
      vibrate([20, 30, 20]); // 错误/受限的双震动反馈
      toast.info('加入 LMage 即可解锁画廊管理与私有相册', { icon: '✨' });
      navigate('/login');
      return;
    }
    vibrate();
    navigate(tab.path);
  };

  const renderTab = (tab: (typeof TAB_ITEMS)[number]) => {
    const Icon = tab.icon;
    const active =
      location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);

    return (
      <button
        key={tab.id}
        type="button"
        className={`bt-item group ${active ? 'active' : ''}`}
        onClick={() => handleTabClick(tab)}
        aria-current={active ? 'page' : undefined}
      >
        {/* 图标 (附带丝滑跳动) */}
        <motion.span
          className="bt-item-icon-wrap"
          animate={{ y: active ? -1 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <Icon
            size={22}
            strokeWidth={1.8}
            className="bt-item-icon"
            fill={active ? 'currentColor' : 'none'}
          />
        </motion.span>

        {/* 极致小巧加粗的文字 */}
        <span className="bt-item-label">{tab.label}</span>

        {/* 底部跳动的光点游标 */}
        {active && (
          <motion.div
            layoutId="bt-dot-indicator"
            className="bt-dot-indicator"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </button>
    );
  };

  return (
    <nav className="mobile-bottom-tab" aria-label="底部导航">
      <div className="bt-container">
        {TAB_ITEMS.map(renderTab)}
      </div>
    </nav>
  );
};

