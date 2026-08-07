import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, LogIn, LogOut, User, Settings, KeyRound, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { requestSearch } from '../../config/navigation';
import { BrandLogo } from '../common/BrandLogo';
import './mobiletopbar.css';

/** 滚动触发「加深态」的阈值 */
const SCROLL_THRESHOLD = 24;

/**
 * 移动端顶部导航：品牌 Logo + 全局快捷按钮 + 账户入口
 * 与 PC Header 同一套视觉语言（同 token / 同交互 / 同事件总线）
 */
export const MobileTopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 滚动加深态
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 路由切换后自动收起菜单
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // 菜单：点击外部 / Esc 关闭
  useEffect(() => {
    if (!menuOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // 头像加载失败回退到图标
  useEffect(() => {
    setAvatarError(false);
  }, [user?.id]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
    toast.success('已退出登录');
  };

  // 个人资料 / 修改密码入口（统一收敛到个人中心）
  const goProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  return (
    <header className={`mobile-topbar ${scrolled ? 'scrolled' : ''}`}>
      {/* 品牌区：返回首页 */}
      <motion.button
        type="button"
        className="mtb-logo"
        onClick={() => navigate('/')}
        whileTap={{ scale: 0.94 }}
        aria-label="返回首页"
      >
        <BrandLogo size={26} glow />
        <span className="mtb-logo-text premium-gradient-text">LMage</span>
      </motion.button>

      {/* 右侧快捷按钮区 */}
      <div className="mtb-actions">
        {/* 全局搜索 */}
        <motion.button
          type="button"
          className="mtb-icon-btn"
          aria-label="搜索图片"
          data-tip="搜索"
          onClick={requestSearch}
          whileTap={{ scale: 0.88 }}
        >
          <Search size={14} strokeWidth={1.5} />
        </motion.button>

        {/* 全局亮暗主题切换 */}
        <motion.button
          type="button"
          className="mtb-icon-btn"
          aria-label="切换亮暗主题"
          data-tip={theme === 'dark' ? '切换浅色' : '切换深色'}
          onClick={toggleTheme}
          whileTap={{ scale: 0.88 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              className="theme-icon-wrap"
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              {theme === 'dark' ? (
                <Sun size={14} strokeWidth={1.5} />
              ) : (
                <Moon size={14} strokeWidth={1.5} />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* 账户区：登录用户头像下拉 / 游客登录圆钮 */}
        {user ? (
          <div className="mtb-user" ref={menuRef}>
            <motion.button
              type="button"
              className="mtb-avatar"
              aria-label="账户菜单"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((o) => !o)}
              whileTap={{ scale: 0.9 }}
            >
              <span className="avatar-ring">
                {user.avatar_url && !avatarError ? (
                  <img src={user.avatar_url} alt="用户头像" onError={() => setAvatarError(true)} />
                ) : (
                  <span className="avatar-fallback">
                    <User size={14} strokeWidth={1.8} />
                  </span>
                )}
              </span>
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className="mtb-menu"
                  role="menu"
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="mtb-menu-name">{user.username}</div>
                  <button type="button" className="dropdown-item" role="menuitem" onClick={goProfile}>
                    <Settings size={15} strokeWidth={1.5} />
                    <span>个人资料</span>
                  </button>
                  <button type="button" className="dropdown-item" role="menuitem" onClick={goProfile}>
                    <KeyRound size={15} strokeWidth={1.5} />
                    <span>修改密码</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button type="button" className="dropdown-item danger" role="menuitem" onClick={handleLogout}>
                    <LogOut size={15} strokeWidth={1.5} />
                    <span>退出登录</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.button
            type="button"
            className="mtb-login"
            aria-label="登录 / 注册"
            data-tip="登录 / 注册"
            onClick={() => navigate('/login')}
            whileTap={{ scale: 0.88 }}
          >
            <LogIn size={14} strokeWidth={1.5} />
          </motion.button>
        )}
      </div>
    </header>
  );
};
