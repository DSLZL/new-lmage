import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../services/api';
import type { QuotaStats } from '../../services/api';
import { CountUp } from '../../components/common/CountUp';
import { formatBytes } from '../../components/common/format';
import { Database, FolderOpen, Gauge, HardDrive, Images, RotateCcw, Tag } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import './statsview.css';

type LoadStatus = 'loading' | 'ready' | 'error';

/** 环形配色阈值：>100% 红 / >90% 琥珀 / 默认青蓝渐变 */
type ArcTone = 'grad' | 'amber' | 'red';
const arcToneOf = (pct: number): ArcTone => (pct > 100 ? 'red' : pct > 90 ? 'amber' : 'grad');
const GRADIENT_ID: Record<ArcTone, string> = { grad: 'statsArcGrad', amber: 'statsArcAmber', red: 'statsArcRed' };

const pageMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.36, ease: 'easeOut' as const } },
};

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const, delay } },
});

/* ---------- 加载骨架 ---------- */

const StatsSkeleton: React.FC = () => (
  <div className="stats-skeleton" aria-hidden>
    <div className="stats-cards">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="stats-skel-card" />
      ))}
    </div>
    <div className="stats-overview">
      <div className="stats-skel-panel">
        <div className="stats-skel-ring" />
      </div>
      <div className="stats-skel-panel">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="stats-skel-line" />
        ))}
      </div>
    </div>
  </div>
);

/* ---------- 空态 / 错误态（共用布局） ---------- */

interface StatsStateProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  actionLabel: string;
  onAction: () => void;
}

const StatsState: React.FC<StatsStateProps> = ({ icon, title, desc, actionLabel, onAction }) => (
  <motion.div className="stats-state" {...pageMotion}>
    <div className="stats-state-icon">{icon}</div>
    <h3 className="stats-state-title">{title}</h3>
    <p className="stats-state-desc">{desc}</p>
    <motion.button
      type="button"
      className="stats-state-btn"
      onClick={onAction}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
    >
      {actionLabel === '重新加载' && <RotateCcw size={15} strokeWidth={1.6} />}
      {actionLabel}
    </motion.button>
  </motion.div>
);

/* ---------- 手绘环形空间使用率 ---------- */

interface QuotaRingProps {
  rawPct: number;
  visualPct: number;
  tone: ArcTone;
}

const QuotaRing: React.FC<QuotaRingProps> = ({ rawPct, visualPct, tone }) => (
  <div className="stats-ring-wrap">
    <svg className="stats-ring" viewBox="0 0 200 200" role="img" aria-label={`空间使用率 ${rawPct.toFixed(1)}%`}>
      <defs>
        <linearGradient id="statsArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-light)" />
          <stop offset="100%" stopColor="var(--accent-blue)" />
        </linearGradient>
        <linearGradient id="statsArcAmber" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="statsArcRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      {/* 手绘点状轨道 + 外圈细描边装饰 */}
      <circle cx="100" cy="100" r="84" fill="none" stroke="var(--border-subtle)" strokeWidth="10" strokeDasharray="0.5 6.6" strokeLinecap="round" />
      <circle cx="100" cy="100" r="92" fill="none" stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" opacity="0.55" />
      {/* 使用率弧线：pathLength 从 0 画到目标占比，起点 12 点方向 */}
      <motion.circle
        cx="100"
        cy="100"
        r="84"
        fill="none"
        stroke={`url(#${GRADIENT_ID[tone]})`}
        strokeWidth="10"
        strokeLinecap="round"
        transform="rotate(-90 100 100)"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: visualPct / 100 }}
        transition={{ duration: 1.1, ease: 'easeOut', delay: 0.2 }}
      />
    </svg>
    <div className="stats-ring-center">
      <CountUp
        value={Math.min(rawPct, 999.9)}
        decimals={1}
        format={(v) => `${v.toFixed(1)}%`}
        className="stats-ring-pct"
      />
      <span className="stats-ring-label">{rawPct > 100 ? '超出配额' : '配额已用'}</span>
    </div>
  </div>
);

/* ---------- 四张数据卡 ---------- */

interface StatCardDef {
  key: string;
  icon: LucideIcon;
  label: string;
  value: number;
  note: string;
  format?: (v: number) => string;
}

const StatCards: React.FC<{ defs: StatCardDef[] }> = ({ defs }) => (
  <div className="stats-cards">
    {defs.map((def, i) => {
      const Icon = def.icon;
      return (
        <motion.div key={def.key} className="stats-card" {...rise(0.05 * i)}>
          <span className="stats-card-icon">
            <Icon size={14} strokeWidth={1.5} />
          </span>
          <span className="stats-card-label">{def.label}</span>
          <CountUp value={def.value} format={def.format} className="stats-card-value" />
          <span className="stats-card-note">{def.note}</span>
        </motion.div>
      );
    })}
  </div>
);

/* ---------- 大盘主视图 ---------- */

const StatsBoard: React.FC<{ stats: QuotaStats }> = ({ stats }) => {
  const { totalImages, totalSize, totalAlbums, totalTags, quotaLimit, quotaUsedPercentage } = stats;

  const rawPct = Number.isFinite(quotaUsedPercentage) ? quotaUsedPercentage : 0;
  const tone = arcToneOf(rawPct);
  const visualPct = Math.max(0, Math.min(rawPct, 100));
  const remaining = quotaLimit > 0 ? Math.max(quotaLimit - totalSize, 0) : 0;
  const avgSize = totalImages > 0 ? totalSize / totalImages : 0;

  const cardDefs: StatCardDef[] = [
    { key: 'images', icon: Images, label: '图片总数', value: totalImages, note: '已收录影像' },
    { key: 'size', icon: HardDrive, label: '空间占用', value: totalSize, format: (v) => formatBytes(v), note: '累计存储体积' },
    { key: 'albums', icon: FolderOpen, label: '相册归档', value: totalAlbums, note: '主题相册数' },
    { key: 'tags', icon: Tag, label: '标签索引', value: totalTags, note: '彩色标签数' },
  ];

  return (
    <div className="stats-board">
      <StatCards defs={cardDefs} />

      <div className="stats-overview">
        {/* 环形空间使用率 */}
        <motion.div className="stats-ring-card" data-tone={tone} {...rise(0.2)}>
          <h3 className="stats-card-title">空间使用率</h3>
          <QuotaRing rawPct={rawPct} visualPct={visualPct} tone={tone} />
          <p className="stats-ring-note">
            {tone === 'red'
              ? '空间已超限，请及时清理冗余图片'
              : tone === 'amber'
                ? '空间接近上限，注意适时清理'
                : '空间充裕，畅快上传'}
          </p>
        </motion.div>

        {/* 明细行 */}
        <motion.div className="stats-detail-card" {...rise(0.28)}>
          <h3 className="stats-card-title">空间明细</h3>
          <div className="stats-detail-rows">
            <div className="stats-detail-row">
              <span>已用空间</span>
              <b>{formatBytes(totalSize)}</b>
            </div>
            <div className="stats-detail-row">
              <span>剩余空间</span>
              <b>{quotaLimit > 0 ? formatBytes(remaining) : '无限制'}</b>
            </div>
            <div className="stats-detail-row">
              <span>配额上限</span>
              <b>{quotaLimit > 0 ? formatBytes(quotaLimit) : '无限制'}</b>
            </div>
            <div className="stats-detail-row">
              <span>平均单张体积</span>
              <b>{totalImages > 0 ? formatBytes(avgSize) : '—'}</b>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ---------- 大盘页入口 ---------- */

export const StatsView: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [stats, setStats] = useState<QuotaStats | null>(null);

  const fetchStats = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await api.getStats();
      setStats(res.stats);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const isEmpty =
    stats !== null &&
    stats.totalImages === 0 &&
    stats.totalSize === 0 &&
    stats.totalAlbums === 0 &&
    stats.totalTags === 0;

  return (
    <motion.div className="stats-shell" {...pageMotion}>
      {status === 'loading' && <StatsSkeleton />}
      {status === 'error' && (
        <StatsState
          icon={<Database size={30} strokeWidth={1.4} />}
          title="统计加载失败"
          desc="网络开小差了，请检查连接后重试"
          actionLabel="重新加载"
          onAction={fetchStats}
        />
      )}
      {status === 'ready' && stats && isEmpty && (
        <StatsState
          icon={<Gauge size={30} strokeWidth={1.4} />}
          title="数据大盘空空如也"
          desc="还没有图片、相册与标签，先去图库上传你的第一张影像"
          actionLabel="去图库逛逛"
          onAction={() => navigate('/')}
        />
      )}
      {status === 'ready' && stats && !isEmpty && <StatsBoard stats={stats} />}
    </motion.div>
  );
};

