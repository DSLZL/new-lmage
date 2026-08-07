import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Search, LogIn, LogOut, User, Settings, KeyRound, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NAV_GROUPS, requestSearch } from '../../config/navigation';
import { BrandLogo } from '../common/BrandLogo';

/** 滚动触发「加深态」的阈值 */
const SCROLL_THRESHOLD = 24;

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 滚动增强：越过阈值后 header 进入毛玻璃加深态
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 路由切换后自动收起下拉
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // 下拉菜单：点击外部 / Esc 关闭
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

  // 头像加载失败时回退到图标
  useEffect(() => {
    setAvatarError(false);
  }, [user?.id]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
    toast.success('已退出登录');
  };

  // 个人资料 / 修改密码入口（对应页面由业务侧提供）
  const handlePending = (feature: string) => {
    setMenuOpen(false);
    toast.info(`${feature}功能即将上线`);
  };

  return (
    <header className={`pc-header ${scrolled ? 'scrolled' : ''}`}>
      {/* ============ 品牌区 ============ */}
      <motion.div
        className="header-logo"
        onClick={() => navigate('/')}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        aria-label="返回首页"
      >
        <BrandLogo size={28} glow />
        <span className="logo-text premium-gradient-text">LMage Pro</span>
      </motion.div>

      {/* ============ 中央分组导航 ============ */}
      <nav className="header-nav" aria-label="主导航">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="nav-group">
            <span className="nav-group-label">{group.label}</span>
            <div className="nav-group-items">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-pill ${active ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active-pill"
                        className="nav-pill-active-bg"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      fill={active ? 'currentColor' : 'none'}
                      className="nav-pill-icon"
                    />
                    <span className="nav-pill-text">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ============ 右侧快捷操作区 ============ */}
      <div className="header-actions">
        {/* 全局搜索快捷按钮 */}
        <motion.button
          type="button"
          className="icon-btn"
          aria-label="搜索图片"
          data-tip="搜索"
          onClick={requestSearch}
          whileTap={{ scale: 0.88 }}
        >
          <Search size={18} strokeWidth={1.5} />
        </motion.button>

        {/* 全局亮暗主题切换 */}
        <motion.button
          type="button"
          className="icon-btn"
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
                <Sun size={18} strokeWidth={1.5} />
              ) : (
                <Moon size={18} strokeWidth={1.5} />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* 用户区：登录用户头像下拉 / 游客登录圆钮 */}
        {user ? (
          <div className="user-menu" ref={menuRef}>
            <motion.button
              type="button"
              className={`user-trigger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen((o) => !o)}
              whileTap={{ scale: 0.96 }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="avatar-ring">
                {user.avatar_url && !avatarError ? (
                  <img src={user.avatar_url} alt="用户头像" onError={() => setAvatarError(true)} />
                ) : (
                  <span className="avatar-fallback">
                    <User size={15} strokeWidth={1.8} />
                  </span>
                )}
              </span>
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className="user-dropdown"
                  role="menu"
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <div className="dropdown-header">
                    <div className="dropdown-name">{user.username}</div>
                    <div className="dropdown-mail">{user.email}</div>
                  </div>
                  <button
                    type="button"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => handlePending('个人资料')}
                  >
                    <Settings size={16} strokeWidth={1.5} />
                    <span>个人资料</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={() => handlePending('修改密码')}
                  >
                    <KeyRound size={16} strokeWidth={1.5} />
                    <span>修改密码</span>
                  </button>
                  <div className="dropdown-divider" />
                  <button type="button" className="dropdown-item danger" role="menuitem" onClick={handleLogout}>
                    <LogOut size={16} strokeWidth={1.5} />
                    <span>退出登录</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* 游客登录圆钮（icon-only） */
          <Link to="/login" className="login-cta" aria-label="登录 / 注册" data-tip="登录 / 注册">
            <LogIn size={18} strokeWidth={1.5} />
          </Link>
        )}
      </div>
    </header>
  );
};
