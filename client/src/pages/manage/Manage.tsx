import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChartColumnBig, Images, Tags as TagsIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Albums } from '../albums/Albums';
import { Tags } from '../tags/Tags';
import { StatsView } from './StatsView';
import './manage.css';

type Section = 'albums' | 'tags' | 'stats';

interface ManageTab {
  id: Section;
  path: string;
  label: string;
  icon: LucideIcon;
}

const MANAGE_TABS: ManageTab[] = [
  { id: 'albums', path: '/manage', label: '相册', icon: Images },
  { id: 'tags', path: '/manage/tags', label: '标签', icon: TagsIcon },
  { id: 'stats', path: '/manage/stats', label: '大盘', icon: ChartColumnBig },
];

/** 依 pathname 前缀判定当前子界面（/manage → 相册、/manage/tags → 标签、/manage/stats → 大盘） */
const resolveSection = (pathname: string): Section => {
  if (pathname.startsWith('/manage/stats')) return 'stats';
  if (pathname.startsWith('/manage/tags')) return 'tags';
  return 'albums';
};

/**
 * 图床管理中心壳：二级导航（相册 | 标签 | 大盘）+ 子界面渲染
 * App.tsx 以三个叶子路由分别渲染本组件，故子界面切换以 pathname 判定（行为等价于嵌套 <Routes>）
 */
export const Manage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const section = useMemo(() => resolveSection(location.pathname), [location.pathname]);

  return (
    <div className="manage-shell">
      {/* 二级导航：毛玻璃胶囊，active 由 layoutId 滑动高亮（与 Header 同语言） */}
      <div className="manage-subnav-wrap">
        <nav className="manage-subnav" aria-label="管理中心子界面">
          {MANAGE_TABS.map((tab) => {
            const active = tab.id === section;
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                type="button"
                className={`manage-tab${active ? ' active' : ''}`}
                onClick={() => navigate(tab.path)}
                aria-current={active ? 'page' : undefined}
                whileTap={{ scale: 0.94 }}
              >
                {active && (
                  <motion.span
                    layoutId="manage-tab-pill"
                    className="manage-tab-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon size={15} strokeWidth={1.5} className="manage-tab-icon" />
                <span className="manage-tab-text">{tab.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* 子界面内容：切换时轻微上浮入场 */}
      <motion.div
        key={section}
        className="manage-content"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {section === 'albums' && <Albums />}
        {section === 'tags' && <Tags />}
        {section === 'stats' && <StatsView />}
      </motion.div>
    </div>
  );
};

