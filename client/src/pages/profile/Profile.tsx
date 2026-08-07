import React, { useCallback, useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarDays, FolderHeart, HardDrive, Image, KeyRound, Link2,
  LoaderCircle, LogOut, Mail, PencilLine, Quote, Tags, User as UserIcon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { QuotaStats, User } from '../../services/api';
import { GlassCard } from '../../components/common/GlassCard';
import { CountUp } from '../../components/common/CountUp';
import { formatBytes, formatNumber } from '../../components/common/format';
import { GuestProfile } from './GuestProfile';
import './profile.css';

/** 个人中心用户：扩展注册时间字段（后端暂未下发，预留展示） */
type ProfileUser = User & { created_at?: number };

/** 统计卡定义 */
type StatKey = 'totalImages' | 'totalSize' | 'totalAlbums' | 'totalTags';

interface StatDef {
  key: StatKey;
  icon: LucideIcon;
  label: string;
  format: (v: number) => string;
}

const STAT_DEFS: StatDef[] = [
  { key: 'totalImages', icon: Image, label: '图片', format: formatNumber },
  { key: 'totalSize', icon: HardDrive, label: '空间', format: (v) => formatBytes(v, 1) },
  { key: 'totalAlbums', icon: FolderHeart, label: '相册', format: formatNumber },
  { key: 'totalTags', icon: Tags, label: '标签', format: formatNumber },
];

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

/* ==================== 空间使用率环形图（手绘 SVG） ==================== */

type RingTone = 'ok' | 'warning' | 'error';

/** 青蓝渐变环形进度：弧线随帧滚出，中心显示已用百分比 */
const SpaceRing: React.FC<{ percentage: number }> = ({ percentage }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const size = 92;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percentage, 0), 100) / 100;
  const display = Math.min(Math.max(percentage, 0), 999.9);
  const tone: RingTone = percentage > 100 ? 'error' : percentage > 90 ? 'warning' : 'ok';
  const center = size / 2;

  return (
    <div className={`profile-ring profile-ring-${tone}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={`profile-ring-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="profile-ring-stop-a" />
            <stop offset="100%" className="profile-ring-stop-b" />
          </linearGradient>
        </defs>
        <circle
          cx={center} cy={center} r={radius} fill="none"
          strokeWidth={strokeWidth} className="profile-ring-track"
        />
        <motion.circle
          cx={center} cy={center} r={radius} fill="none"
          strokeWidth={strokeWidth} strokeLinecap="round"
          stroke={`url(#profile-ring-grad-${uid})`}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.6, ease: 'easeOut', delay: 0.25 }}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="profile-ring-center">
        <span className="profile-ring-num">{display.toFixed(1)}%</span>
      </div>
    </div>
  );
};


/* ==================== 统计单项 ==================== */

const StatItem: React.FC<{ def: StatDef; value?: number; delay?: number }> = ({ def, value, delay = 0 }) => {
  const Icon = def.icon;
  return (
    <motion.div
      className="profile-stat-item"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <div className="profile-stat-icon">
        <Icon size={16} strokeWidth={1.5} />
      </div>
      {value !== undefined ? (
        <CountUp value={value} format={def.format} className="profile-stat-value" />
      ) : (
        <span className="profile-stat-value">-</span>
      )}
      <span className="profile-stat-label">{def.label}</span>
    </motion.div>
  );
};

/* ==================== 页面主体 ==================== */

/** 我的：游客登录引导 / 登录后个人中心 */
export const Profile: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<QuotaStats | null>(null);

  // 资料编辑表单
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // 修改密码表单
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [changing, setChanging] = useState(false);

  // 用户数据变化时回填表单
  useEffect(() => {
    if (!user) return;
    setUsername(user.username);
    setEmail(user.email);
    setBio(user.bio ?? '');
    setAvatarUrl(user.avatar_url ?? '');
  }, [user]);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getStats();
      setStats(res.stats);
    } catch {
      // 统计失败不阻塞页面
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSaveProfile = async () => {
    if (!username.trim() || !email.trim()) {
      toast.warning('昵称与邮箱不能为空');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        username: username.trim(),
        email: email.trim(),
        bio: bio.trim() ? bio.trim() : undefined,
        avatar_url: avatarUrl.trim() ? avatarUrl.trim() : undefined,
      });
      updateUser(res.user);
      toast.success(res.message || '个人资料更新成功');
    } catch (err: any) {
      toast.error(err?.message ?? '资料更新失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPwd) {
      toast.warning('请输入当前密码');
      return;
    }
    if (newPwd.length < 6) {
      toast.warning('新密码至少 6 位');
      return;
    }
    setChanging(true);
    try {
      const res = await api.changePassword({ current_password: oldPwd, new_password: newPwd });
      toast.success(res.message || '密码修改成功');
      setOldPwd('');
      setNewPwd('');
    } catch (err: any) {
      toast.error(err?.message ?? '密码修改失败');
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('已退出登录');
  };

  const puser = user as ProfileUser | null;

  /* ---------- 游客态：品牌引导页（手绘 SVG 插画 + 权益 + 权限对比） ---------- */
  if (!puser) {
    return (
      <div className="profile-container">
        <GuestProfile onLogin={() => navigate('/login')} />
      </div>
    );
  }

  /* ---------- 登录态：个人中心 ---------- */
  return (
    <div className="profile-container">
      {/* 1. 用户信息卡 */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <GlassCard className="profile-user-card">
          <div className="profile-avatar-ring">
            {puser.avatar_url ? (
              <img src={puser.avatar_url} alt="头像" />
            ) : (
              <span className="profile-avatar-fallback">
                <UserIcon size={22} strokeWidth={1.8} />
              </span>
            )}
          </div>
          <div className="profile-user-info">
            <h2 className="profile-username">{puser.username}</h2>
            <div className="profile-user-meta">
              <span className="profile-user-meta-item">
                <Mail size={12} strokeWidth={1.6} />
                {puser.email}
              </span>
              {puser.created_at !== undefined && (
                <span className="profile-user-meta-item">
                  <CalendarDays size={12} strokeWidth={1.6} />
                  注册于 {formatDate(puser.created_at)}
                </span>
              )}
            </div>
            {puser.bio && <p className="profile-user-bio">{puser.bio}</p>}
          </div>
        </GlassCard>
      </motion.div>

      {/* 2. 统计概览：四卡 + 空间环形 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
      >
        <GlassCard className="profile-stats-card" hoverGlow={false}>
          <div className="profile-stats-grid">
            {STAT_DEFS.map((def, i) => (
              <StatItem key={def.key} def={def} value={stats?.[def.key]} delay={0.1 + i * 0.06} />
            ))}
          </div>
          {stats && (
            <div className="profile-ring-row">
              <SpaceRing percentage={stats.quotaUsedPercentage} />
              <div className="profile-ring-meta">
                <span className="profile-ring-title">空间使用率</span>
                <span className="profile-ring-line">已用 {formatBytes(stats.totalSize, 1)}</span>
                <span className="profile-ring-line">配额 {formatBytes(stats.quotaLimit, 1)}</span>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* 3. 编辑资料 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
      >
        <GlassCard className="profile-section-card">
          <h3 className="profile-section-title">
            <PencilLine size={15} strokeWidth={1.6} />
            编辑资料
          </h3>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="profile-username">昵称</label>
            <input
              id="profile-username"
              type="text"
              className="profile-input"
              placeholder="你的昵称"
              value={username}
              disabled={savingProfile}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="profile-email">邮箱</label>
            <input
              id="profile-email"
              type="email"
              className="profile-input"
              placeholder="you@example.com"
              value={email}
              disabled={savingProfile}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="profile-avatar">
              <Link2 size={11} strokeWidth={1.8} />
              头像直链
            </label>
            <input
              id="profile-avatar"
              type="url"
              className="profile-input"
              placeholder="https://..."
              value={avatarUrl}
              disabled={savingProfile}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </div>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="profile-bio">
              <Quote size={11} strokeWidth={1.8} />
              个性签名
            </label>
            <textarea
              id="profile-bio"
              className="profile-input profile-textarea"
              rows={2}
              placeholder="这个人很懒，什么都没留下"
              value={bio}
              disabled={savingProfile}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>
          <button type="button" className="profile-submit-btn" disabled={savingProfile} onClick={handleSaveProfile}>
            {savingProfile ? '保存中...' : '保存修改'}
          </button>
        </GlassCard>
      </motion.div>

      {/* 4. 修改密码 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.18 }}
      >
        <GlassCard className="profile-section-card">
          <h3 className="profile-section-title">
            <KeyRound size={15} strokeWidth={1.6} />
            修改密码
          </h3>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="profile-old-pwd">当前密码</label>
            <input
              id="profile-old-pwd"
              type="password"
              className="profile-input"
              placeholder="确认你的旧密码"
              value={oldPwd}
              disabled={changing}
              onChange={(e) => setOldPwd(e.target.value)}
            />
          </div>
          <div className="profile-form-row">
            <label className="profile-label" htmlFor="profile-new-pwd">新密码（至少 6 位）</label>
            <input
              id="profile-new-pwd"
              type="password"
              className="profile-input"
              placeholder="设置新的登录密码"
              value={newPwd}
              disabled={changing}
              onChange={(e) => setNewPwd(e.target.value)}
            />
          </div>
          <button type="button" className="profile-submit-btn" disabled={changing} onClick={handleChangePassword}>
            {changing ? (
              <>
                <LoaderCircle size={15} strokeWidth={1.6} className="profile-spin" />
                提交中
              </>
            ) : (
              '确认修改'
            )}
          </button>
        </GlassCard>
      </motion.div>

      {/* 5. 退出登录 */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
      >
        <motion.button type="button" className="profile-logout-btn" whileTap={{ scale: 0.97 }} onClick={handleLogout}>
          <LogOut size={16} strokeWidth={1.6} />
          退出登录
        </motion.button>
      </motion.div>
    </div>
  );
};
