import { useEffect, useRef, useState } from 'react';
import type { FC, FormEvent, ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react';
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

/** 校验规则：空值、用户名长度、邮箱格式、密码长度 */
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
      errors.email = '邮箱格式不正确，请检查后重试';
    }
  }
  if (!password) {
    errors.password = '请输入密码';
  } else if (password.length < 6) {
    errors.password = '密码长度至少需要 6 位';
  }
  return errors;
};

/** 密码强度评分：0 - 4 */
const passwordLevel = (pwd: string): number => {
  let score = 0;
  if (pwd.length >= 6) score += 1;
  if (pwd.length >= 10) score += 1;
  if (/[A-Za-z]/.test(pwd) && /\d/.test(pwd)) score += 1;
  if (/[^A-Za-z0-9]/.test(pwd)) score += 1;
  return Math.min(score, 4);
};

const STRENGTH_LABELS = ['', '弱', '一般', '良好', '很强'] as const;
const STRENGTH_COLORS = ['', 'var(--error)', 'var(--warning)', 'var(--success)', 'var(--accent)'] as const;

/** 模式切换时的表单滑动方向（1 向右进，-1 向左进） */
const formVariants: Variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 36 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -36 }),
};

interface FieldProps {
  id: string;
  label: string;
  icon: ReactNode;
  error?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

/** 字段骨架：标签 + 图标输入框 + 内联错误动画 */
const Field: FC<FieldProps> = ({ id, label, icon, error, rightSlot, children }) => (
  <div className="form-group">
    <label className="form-label" htmlFor={id}>
      {label}
    </label>
    <div className={`input-wrapper${error ? ' has-error' : ''}`}>
      <span className="input-icon" aria-hidden="true">
        {icon}
      </span>
      {children}
      {rightSlot}
    </div>
    <AnimatePresence initial={false}>
      {error && (
        <motion.p
          className="field-error"
          role="alert"
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 6 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <AlertCircle size={13} strokeWidth={1.6} className="field-error-icon" />
          <span>{error}</span>
        </motion.p>
      )}
    </AnimatePresence>
  </div>
);

export const Login: FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [shake, setShake] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const busy = loading || done;

  const switchMode = (m: Mode) => {
    if (m === mode || busy) return;
    setDirection(m === 'register' ? 1 : -1);
    setMode(m);
    setErrors({});
    setShowPassword(false);
    setPassword('');
  };

  /** 输入时即时清除对应字段的错误 */
  const clearError = (key: keyof FieldErrors) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
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
      setDone(true);
      timerRef.current = window.setTimeout(() => navigate('/', { replace: true }), 520);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const level = mode === 'register' ? passwordLevel(password) : 0;
  const subtitle = mode === 'register' ? '创建账号，解锁相册、标签与数据大盘' : '极致性能的 Telegram 备份图床';

  return (
    <div className="auth-page">
      {/* 氛围光斑：青蓝双色呼吸浮游 */}
      <div className="auth-orb auth-orb-cyan" aria-hidden="true" />
      <div className="auth-orb auth-orb-blue" aria-hidden="true" />

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 130, damping: 17 }}
      >
        <div className={`auth-glass${shake ? ' shake' : ''}`} onAnimationEnd={() => setShake(false)}>
          {/* 品牌头部 */}
          <header className="auth-brand">
            <motion.div
              className="auth-logo-halo"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.08 }}
            >
              <BrandLogo size={58} glow />
            </motion.div>
            <motion.h1
              className="auth-title premium-gradient-text"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.18 }}
            >
              LMage Pro
            </motion.h1>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={mode}
                className="auth-subtitle"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {subtitle}
              </motion.p>
            </AnimatePresence>
          </header>

          {/* 登录 / 注册 模式切换胶囊 */}
          <div className="auth-mode-switch" role="tablist" aria-label="账号模式切换">
            {(['login', 'register'] as const).map((m) => (
              <motion.button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`auth-mode-btn${mode === m ? ' active' : ''}`}
                onClick={() => switchMode(m)}
                disabled={busy}
                whileTap={{ scale: 0.96 }}
              >
                {mode === m && (
                  <motion.span
                    layoutId="auth-mode-pill"
                    className="auth-mode-pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="auth-mode-label">
                  {m === 'login' ? <LogIn size={15} strokeWidth={1.6} /> : <UserPlus size={15} strokeWidth={1.6} />}
                  {m === 'login' ? '登录' : '注册'}
                </span>
              </motion.button>
            ))}
          </div>

          {/* 表单主体：切换模式时按方向滑入滑出 */}
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.form
              key={mode}
              className="auth-form"
              onSubmit={handleSubmit}
              noValidate
              custom={direction}
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <Field
                id="auth-username"
                label="用户名 / 昵称"
                icon={<User size={14} strokeWidth={1.6} />}
                error={errors.username}
              >
                <input
                  id="auth-username"
                  type="text"
                  className="form-input"
                  placeholder={mode === 'register' ? '起一个响亮的名字（至少 2 个字符）' : '用于登录的用户名'}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearError('username');
                  }}
                  disabled={busy}
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint={mode === 'register' ? 'next' : 'go'}
                />
              </Field>

              {mode === 'register' && (
                <Field
                  id="auth-email"
                  label="邮箱地址"
                  icon={<Mail size={14} strokeWidth={1.6} />}
                  error={errors.email}
                >
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
                    disabled={busy}
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    inputMode="email"
                    enterKeyHint="next"
                  />
                </Field>
              )}

              <Field
                id="auth-password"
                label={mode === 'register' ? '设置密码，至少 6 位' : '安全密码'}
                icon={<Lock size={14} strokeWidth={1.6} />}
                error={errors.password}
                rightSlot={
                  <motion.button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    disabled={busy}
                    whileTap={{ scale: 0.9 }}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff size={17} strokeWidth={1.6} /> : <Eye size={17} strokeWidth={1.6} />}
                  </motion.button>
                }
              >
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
                  disabled={busy}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  enterKeyHint="go"
                />
              </Field>

              {/* 注册模式下的密码强度指示 */}
              {mode === 'register' && password.length > 0 && (
                <motion.div
                  className="strength-meter"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <div className="strength-bars" aria-hidden="true">
                    {[1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`strength-bar${i <= level ? ' active' : ''}`}
                        style={i <= level ? { background: STRENGTH_COLORS[level] } : undefined}
                      />
                    ))}
                  </div>
                  <span className="strength-label" style={{ color: STRENGTH_COLORS[level] }}>
                    密码强度：{STRENGTH_LABELS[level]}
                  </span>
                </motion.div>
              )}

              <motion.button type="submit" className="submit-btn" disabled={busy} whileTap={{ scale: 0.985 }}>
                {done ? (
                  <>
                    <Check size={14} strokeWidth={2} />
                    登录成功，正在跳转
                  </>
                ) : loading ? (
                  <>
                    <LoaderCircle size={14} strokeWidth={1.6} className="btn-spinner" />
                    {mode === 'register' ? '注册中，请稍候' : '登录中，请稍候'}
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} strokeWidth={1.6} />
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
              <ArrowRight size={13} strokeWidth={1.6} />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
