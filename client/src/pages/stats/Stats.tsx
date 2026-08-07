import React, { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Database, FolderHeart, HardDrive, HardDriveDownload, Image, Images,
  KeyRound, LoaderCircle, RefreshCw, Tags, User,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '../../services/api';
import type { QuotaStats } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/common/GlassCard';
import { CountUp } from '../../components/common/CountUp';
import { formatBytes, formatNumber } from '../../components/common/format';
import { toast } from 'sonner';
import './stats.css';

/** 配额状态档位 */
type Tone = 'ok' | 'warning' | 'error';

/** 卡片入场动效 */
const fadeUp = { duration: 0.5, ease: 'easeOut' } as const;
const delayed = (delay: number) => ({ delay, ...fadeUp });

/* ==================== 骨架屏 ==================== */
const SkeletonStats: React.FC = () => (
  <div className="stats-skeleton">
    <div className="stats-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton-card skeleton-shimmer">
          <div className="skeleton-icon" />
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-70" />
          <div className="skeleton-line w-55" />
        </div>
      ))}
    </div>
    <div className="skeleton-card skeleton-ring skeleton-shimmer" />
    <div className="management-grid">
      <div className="skeleton-card skeleton-shimmer" />
      <div className="skeleton-card skeleton-shimmer" />
    </div>
  </div>
);

/* ==================== 空间使用率环形图 ==================== */
interface QuotaRingProps {
  percentage: number;
  tone: Tone;
  size?: number;
}

/** 手绘 SVG 环形进度：渐变 arc 随帧滚出，中心大百分比数字 */
const QuotaRing: React.FC<QuotaRingProps> = ({ percentage, tone, size = 190 }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percentage, 0), 100) / 100;
  const display = Math.min(Math.max(percentage, 0), 999.9);
  const center = size / 2;

  return (
    <div className={`quota-ring quota-tone-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="quota-ring-svg">
        <defs>
          <linearGradient id={`quota-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="quota-ring-stop-a" />
            <stop offset="100%" className="quota-ring-stop-b" />
          </linearGradient>
        </defs>
        <circle cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} className="quota-ring-track" />
        <motion.circle
          cx={center} cy={center} r={radius} fill="none" strokeWidth={strokeWidth} strokeLinecap="round"
          stroke={`url(#quota-grad-${uid})`} strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.8, ease: 'easeOut', delay: 0.15 }} transform={`rotate(-90 ${center} ${center})`}
          className="quota-ring-progress"
        />
      </svg>
      <div className="quota-ring-center">
        <div className="quota-ring-num">
          <CountUp value={display} decimals={1} className="quota-ring-pct" />
          <span className="quota-ring-unit">%</span>
        </div>
        <span className="quota-ring-label">已用占比</span>
      </div>
    </div>
  );
};

/* ==================== 配额明细行 ==================== */
interface QuotaRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
}

const QuotaRow: React.FC<QuotaRowProps> = ({ icon: Icon, label, value, tone }) => (
  <div className={`quota-row${tone ? ` quota-row-${tone}` : ''}`}>
    <div className="quota-row-icon"><Icon size={17} strokeWidth={1.5} /></div>
    <div className="quota-row-text">
      <span className="quota-row-label">{label}</span>
      <span className="quota-row-value">{value}</span>
    </div>
  </div>
);

/* ==================== 表单小组件 ==================== */
interface MngFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
}

const MngField: React.FC<MngFieldProps> = ({ label, value, onChange, placeholder, type = 'text', disabled, required }) => (
  <div className="mng-group">
    <label className="mng-label">{label}</label>
    <input type={type} className="mng-input" value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} disabled={disabled} required={required} />
  </div>
);

const MngSubmit: React.FC<{ loading: boolean; danger?: boolean; children: React.ReactNode }> = ({ loading, danger, children }) => (
  <button type="submit" className={`mng-submit${danger ? ' mng-submit-danger' : ''}`} disabled={loading}>
    {loading && <LoaderCircle size={16} strokeWidth={1.5} className="mng-spin" />}
    {children}
  </button>
);

/* ==================== 页面主体 ==================== */
interface StatCardDef {
  key: string;
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  tone: 'accent' | 'blue' | 'success' | 'warning';
  format?: (v: number) => string;
}

export const Stats: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState<QuotaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // 个人资料表单
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [profileLoading, setProfileLoading] = useState(false);

  // 修改密码表单
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await api.getStats();
      setStats(res.stats);
    } catch (err: any) {
      setFailed(true);
      toast.error(err?.message || '加载统计大盘失败');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- 派生指标 ---------- */
  const pct = stats?.quotaUsedPercentage ?? 0;
  const tone: Tone = pct > 100 ? 'error' : pct > 90 ? 'warning' : 'ok';
  const remaining = stats ? Math.max(0, stats.quotaLimit - stats.totalSize) : 0;
  const overLimit = stats ? stats.totalSize - stats.quotaLimit : 0;
  const avgSize = stats && stats.totalImages > 0 ? stats.totalSize / stats.totalImages : 0;
  const isEmpty =
    !!stats && stats.totalImages === 0 && stats.totalSize === 0 && stats.totalAlbums === 0 && stats.totalTags === 0;

  const cards = useMemo<StatCardDef[]>(() => {
    if (!stats) return [];
    return [
      { key: 'images', label: '托管图片', value: stats.totalImages, hint: '全部托管影像', icon: Image, tone: 'accent', format: formatNumber },
      { key: 'space', label: '空间总占用', value: stats.totalSize, hint: `占配额 ${pct.toFixed(1)}%`, icon: HardDrive, tone: 'blue', format: (v) => formatBytes(v, 1) },
      { key: 'albums', label: '相册总数', value: stats.totalAlbums, hint: '已建相册分组', icon: FolderHeart, tone: 'success', format: formatNumber },
      { key: 'tags', label: '标签总数', value: stats.totalTags, hint: '内容分类标记', icon: Tags, tone: 'warning', format: formatNumber },
    ];
  }, [stats, pct]);

  /* ---------- 账户管理 ---------- */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim()) {
      toast.warning('用户名与邮箱不能为空');
      return;
    }
    setProfileLoading(true);
    try {
      const res = await api.updateProfile({
        username: username.trim(),
        email: email.trim(),
        bio: bio ? bio : undefined,
        avatar_url: avatarUrl ? avatarUrl : undefined,
      });
      updateUser(res.user);
      toast.success('个人资料更新成功');
      fetchStats();
    } catch (err: any) {
      toast.error(err?.message || '更新资料失败');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.warning('请输入当前密码');
      return;
    }
    if (newPassword.length < 6) {
      toast.warning('新密码长度不能少于 6 位');
      return;
    }
    setPwdLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      toast.success(res.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err?.message || '修改密码失败');
    } finally {
      setPwdLoading(false);
    }
  };

  return (
    <div className="stats-container">
      <div className="stats-header">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <h2 className="stats-title">数据大盘</h2>
          <p className="stats-subtitle">云存储额度与托管内容的全景总览</p>
        </motion.div>
        <motion.button
          type="button" className="mng-refresh" onClick={fetchStats} disabled={loading}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}
        >
          <RefreshCw size={15} strokeWidth={1.5} className={loading ? 'mng-spin' : undefined} />
          刷新数据
        </motion.button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div key="skeleton" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            <SkeletonStats />
          </motion.div>
        ) : failed || !stats ? (
          <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={fadeUp}>
            <GlassCard className="stats-empty" hoverGlow={false}>
              <div className="stats-empty-icon stats-empty-icon-error"><AlertTriangle size={28} strokeWidth={1.5} /></div>
              <div className="stats-empty-text">
                <h3>统计数据加载失败</h3>
                <p>网络开小差了，点击右侧按钮重新拉取大盘数据</p>
              </div>
              <button type="button" className="mng-refresh" onClick={fetchStats}>
                <RefreshCw size={15} strokeWidth={1.5} />
                重新加载
              </button>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div key="content" className="stats-content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={fadeUp}>
            {isEmpty && (
              <GlassCard className="stats-empty" hoverGlow={false}>
                <div className="stats-empty-icon"><Images size={28} strokeWidth={1.5} /></div>
                <div className="stats-empty-text">
                  <h3>还没有任何数据</h3>
                  <p>上传第一张图片后，这里将呈现你的完整托管全景</p>
                </div>
              </GlassCard>
            )}

            {/* 1. 顶部概览：四张数据卡 */}
            <div className="stats-grid">
              {cards.map((c, i) => (
                <motion.div key={c.key} className="stat-card-wrap"
                  initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
                  transition={delayed(0.06 * i)} whileHover={{ y: -5 }}>
                  <GlassCard hoverGlow={false} className="stat-card">
                    <div className={`stat-card-icon stat-tone-${c.tone}`}><c.icon size={22} strokeWidth={1.5} /></div>
                    <div className="stat-card-body">
                      <span className="stat-card-label">{c.label}</span>
                      <CountUp value={c.value} format={c.format} className="stat-card-num" />
                      <span className="stat-card-hint">{c.hint}</span>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            {/* 2. 空间使用率环形图 */}
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={delayed(0.24)}>
              <GlassCard className="quota-card" hoverGlow={false}>
                <div className="quota-head">
                  <div className="quota-title">
                    <div className="quota-title-icon"><Database size={20} strokeWidth={1.5} /></div>
                    <div>
                      <h3>空间使用率</h3>
                      <p>Telegram 冷备归档与免费热缓存配额</p>
                    </div>
                  </div>
                  <span className={`quota-pill quota-pill-${tone}`}>
                    {tone === 'ok' ? '额度使用正常' : tone === 'warning' ? '即将触顶' : '已超额'}
                  </span>
                </div>
                <div className="quota-body">
                  <QuotaRing percentage={pct} tone={tone} />
                  <div className="quota-meta">
                    <QuotaRow icon={HardDrive} label="已用空间" value={formatBytes(stats.totalSize)} />
                    <QuotaRow
                      icon={HardDriveDownload} label="剩余空间"
                      value={overLimit > 0 ? `已超限 ${formatBytes(overLimit)}` : formatBytes(remaining)}
                      tone={overLimit > 0 ? 'error' : tone === 'warning' ? 'warning' : 'ok'}
                    />
                    <QuotaRow icon={Database} label="配额上限" value={formatBytes(stats.quotaLimit)} />
                    <QuotaRow icon={Image} label="平均单张体积" value={avgSize > 0 ? formatBytes(avgSize) : '暂无数据'} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* 3. 账户管理中心 */}
            <motion.div className="management-grid" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={delayed(0.32)}>
              <GlassCard>
                <div className="mng-head">
                  <div className="mng-head-icon"><User size={18} strokeWidth={1.5} /></div>
                  <h3>修改个人资料</h3>
                </div>
                <form onSubmit={handleUpdateProfile} className="mng-form">
                  <MngField label="用户名" value={username} onChange={setUsername} required disabled={profileLoading} />
                  <MngField label="邮箱地址" type="email" value={email} onChange={setEmail} required disabled={profileLoading} />
                  <MngField label="头像直链 URL" value={avatarUrl} onChange={setAvatarUrl} placeholder="https://..." disabled={profileLoading} />
                  <MngField label="个性签名" value={bio} onChange={setBio} placeholder="这个人很懒，什么都没留下" disabled={profileLoading} />
                  <MngSubmit loading={profileLoading}>{profileLoading ? '保存中' : '保存修改'}</MngSubmit>
                </form>
              </GlassCard>

              <GlassCard>
                <div className="mng-head">
                  <div className="mng-head-icon mng-head-icon-danger"><KeyRound size={18} strokeWidth={1.5} /></div>
                  <h3>重设安全密码</h3>
                </div>
                <form onSubmit={handleUpdatePassword} className="mng-form">
                  <MngField label="当前密码" type="password" value={currentPassword} onChange={setCurrentPassword}
                    placeholder="确认你的旧密码" required disabled={pwdLoading} />
                  <MngField label="新设密码，至少 6 位" type="password" value={newPassword} onChange={setNewPassword}
                    placeholder="设置新的登录密码" required disabled={pwdLoading} />
                  <MngSubmit loading={pwdLoading} danger>{pwdLoading ? '提交中' : '提交重设密码'}</MngSubmit>
                </form>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
