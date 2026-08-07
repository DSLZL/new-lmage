import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, LoaderCircle, Lock, LogIn, Mail, ShieldCheck, User, UserPlus } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import './auth.css';

type Mode = 'login' | 'register';

interface FieldErrors {
  username?: string;
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 校验规则：空值、用户名长度、密码长度、邮箱格式 */
const validate = (mode: Mode, username: string, email: string, password: string): FieldErrors => {
  const errors: FieldErrors = {};
  const name = username.trim();
  if (!name) {
    errors.username = '请输入用户名或昵称';
  } else if (name.length < 2) {
    errors.username = '用户名至少需要 2 个字符';
  }
  if (mode === 'register') {
    const mail = email.trim();
    if (!mail) {
      errors.email = '请输入邮箱地址';
    } else if (!EMAIL_RE.test(mail)) {
      errors.email = '邮箱格式不正确';
    }
  }
  if (!password) {
    errors.password = '请输入密码';
  } else if (password.length < 6) {
    errors.password = '密码长度至少需要 6 位';
  }
  return errors;
};

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const switchMode = (m: Mode) => {
    if (m === mode || loading) return;
    setMode(m);
    setErrors({});
    setShowPassword(false);
  };

  /** 输入时即时清除对应字段的错误 */
  const clearError = (key: keyof FieldErrors) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate(mode, username, email, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setShake(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: username.trim(),
        password,
        ...(mode === 'register' ? { email: email.trim() } : {}),
      };
      const res = mode === 'register' ? await api.register(payload) : await api.login(payload);
      login(res.token, res.user);
      toast.success(mode === 'register' ? `欢迎加入，${res.user.username}！` : `欢迎回来，${res.user.username}！`);
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.error(err?.message || '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const subtitle = mode === 'register' ? '创建账号，解锁相册、标签与数据大盘' : '极致性能的 Telegram 备份图床';

  return (
    <div className="auth-container">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 120, damping: 16 }}
      >
        <div className={`auth-glass${shake ? ' shake' : ''}`} onAnimationEnd={() => setShake(false)}>
          {/* 品牌头部 */}
          <div className="auth-brand">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.1 }}
            >
              <BrandLogo size={56} glow />
            </motion.div>
            <h1 className="auth-title premium-gradient-text">LMage Pro</h1>
            <p className="auth-subtitle">{subtitle}</p>
          </div>

          {/* 登录 / 注册 模式切换滑块 */}
          <div className="auth-mode-switch" role="tablist" aria-label="账号模式切换">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`auth-mode-btn${mode === m ? ' active' : ''}`}
                onClick={() => switchMode(m)}
                disabled={loading}
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="auth-mode-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="auth-mode-label">
                  {m === 'login' ? <LogIn size={15} strokeWidth={1.5} /> : <UserPlus size={15} strokeWidth={1.5} />}
                  {m === 'login' ? '登录' : '注册'}
                </span>
              </button>
            ))}
          </div>

          {/* 表单主体：切换模式时左右滑入滑出 */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.form
              key={mode}
              className="auth-form"
              onSubmit={handleSubmit}
              noValidate
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.26, ease: 'easeOut' }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="auth-username">
                  用户名 / 昵称
                </label>
                <div className={`input-wrapper${errors.username ? ' has-error' : ''}`}>
                  <User size={16} strokeWidth={1.5} className="input-icon" />
                  <input
                    id="auth-username"
                    type="text"
                    className="form-input"
                    placeholder="用于登录的用户名"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      clearError('username');
                    }}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                <AnimatePresence>
                  {errors.username && (
                    <motion.span
                      className="field-error"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {errors.username}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="auth-email">
                    邮箱地址
                  </label>
                  <div className={`input-wrapper${errors.email ? ' has-error' : ''}`}>
                    <Mail size={16} strokeWidth={1.5} className="input-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      className="form-input"
                      placeholder="用于找回与通知的邮箱"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError('email');
                      }}
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                  <AnimatePresence>
                    {errors.email && (
                      <motion.span
                        className="field-error"
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {errors.email}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="auth-password">
                  {mode === 'register' ? '设置密码，至少 6 位' : '安全密码'}
                </label>
                <div className={`input-wrapper${errors.password ? ' has-error' : ''}`}>
                  <Lock size={16} strokeWidth={1.5} className="input-icon" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input form-input-password"
                    placeholder={mode === 'register' ? '设置你的登录密码' : '输入你的登录密码'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError('password');
                    }}
                    disabled={loading}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={loading}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.password && (
                    <motion.span
                      className="field-error"
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {errors.password}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                type="submit"
                className="submit-btn"
                disabled={loading}
                whileTap={{ scale: 0.985 }}
              >
                {loading ? (
                  <>
                    <LoaderCircle size={17} strokeWidth={1.5} className="btn-spinner" />
                    {mode === 'register' ? '注册中，请稍候' : '登录中，请稍候'}
                  </>
                ) : (
                  <>
                    <ShieldCheck size={17} strokeWidth={1.5} />
                    {mode === 'register' ? '创建账号' : '安全登录'}
                  </>
                )}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          {/* 游客入口提示 */}
          <p className="auth-guest-hint">
            游客可先浏览图库
            <Link to="/" className="auth-guest-link">
              前往首页
              <ArrowRight size={13} strokeWidth={1.5} />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
