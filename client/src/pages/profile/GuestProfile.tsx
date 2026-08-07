import React from 'react';
import { motion } from 'framer-motion';
import { LogIn, ShieldCheck } from 'lucide-react';
import { FadeInUp } from '../../components/common/FadeInUp';
import './guestprofile.css';

interface GuestProfileProps {
  /** 点击登录 / 注册的跳转回调 */
  onLogin: () => void;
}

/* ==================== 手绘 SVG 插画 ==================== */

/** Hero 主插画：画廊场景（画框 + 山峦 + 旭日 + 飞鸟 + 漂浮图卡 + 星光 + 波浪） */
const GuestHeroArt: React.FC = () => (
  <svg viewBox="0 0 320 200" fill="none" className="guest-hero-svg" aria-hidden>
    {/* 大画框 */}
    <motion.rect
      x="70" y="24" width="180" height="132" rx="16"
      stroke="var(--accent-light)" strokeWidth="2.5"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
    <rect
      x="84" y="38" width="152" height="104" rx="10"
      stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="5 8"
    />
    {/* 框内：远山 + 近山 */}
    <motion.path
      d="M96 122 L128 82 L146 98 L158 88 L186 122"
      stroke="var(--accent)" strokeWidth="2.6" strokeLinejoin="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.9, delay: 0.25, ease: 'easeInOut' }}
    />
    <path
      d="M84 122 L110 94 L136 122"
      stroke="var(--accent-light)" strokeWidth="2" opacity="0.55" strokeLinejoin="round"
    />
    {/* 旭日 + 虚线光晕 */}
    <motion.circle
      cx="178" cy="60" r="10" fill="var(--accent-light)"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.55 }}
    />
    <circle
      cx="178" cy="60" r="14.5"
      stroke="var(--accent-light)" strokeWidth="1.2" strokeDasharray="2.5 5"
      opacity="0.6"
    />
    {/* 飞鸟 */}
    <path d="M116 66 q4.5 -5 9 0 q4.5 -5 9 0" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M140 56 q3.5 -4 7 0 q3.5 -4 7 0" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
    {/* 地平线 */}
    <path d="M84 122 h152" stroke="var(--border-subtle)" strokeWidth="1.2" strokeDasharray="3 6" />

    {/* 左漂浮图卡（画廊缩略图） */}
    <g className="guest-float-card guest-float-card-l">
      <rect x="20" y="104" width="54" height="42" rx="9" fill="var(--bg-surface)" stroke="var(--glass-border)" strokeWidth="1.5" />
      <rect x="26" y="110" width="42" height="18" rx="5" fill="var(--accent-soft)" />
      <path d="M30 132 L38 122 L46 128 L52 118 L56 132" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="60" cy="114" r="2.6" fill="var(--accent-light)" />
    </g>
    {/* 右漂浮图卡 */}
    <g className="guest-float-card guest-float-card-r">
      <rect x="246" y="44" width="54" height="42" rx="9" fill="var(--bg-surface)" stroke="var(--glass-border)" strokeWidth="1.5" />
      <circle cx="273" cy="60" r="7" fill="var(--accent-light)" opacity="0.9" />
      <path d="M254 76 L266 64 L278 72 L290 58 L296 76" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" />
    </g>

    {/* 星光点缀 */}
    <motion.path
      d="M58 36 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 z"
      fill="var(--accent-light)" opacity="0.85"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.85, scale: 1 }}
      transition={{ delay: 0.8, duration: 0.4 }}
    />
    <circle cx="262" cy="112" r="2" fill="var(--accent)" opacity="0.5" />
    <circle cx="96" cy="22" r="1.5" fill="var(--accent-light)" opacity="0.7" />
    <circle cx="226" cy="26" r="2.2" fill="var(--accent-light)" opacity="0.55" />

    {/* 底部波浪 */}
    <path d="M56 168 q11 -7 22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0" stroke="var(--border-subtle)" strokeWidth="2" strokeLinecap="round" />
    <path d="M56 182 q11 -7 22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0" stroke="var(--accent-soft)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/** 手绘权益图标：画廊（画框 + 山 + 日） */
const GalleryArt: React.FC = () => (
  <svg viewBox="0 0 48 48" fill="none" className="guest-perk-svg" aria-hidden>
    <rect x="9" y="10" width="30" height="24" rx="5" stroke="var(--accent-light)" strokeWidth="2" />
    <rect x="13" y="14" width="22" height="16" rx="3.5" stroke="var(--border-subtle)" strokeWidth="1.4" strokeDasharray="2.5 4" />
    <path d="M16 27 L22 19 L26 23 L29 20 L34 27" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="30" cy="17" r="2.4" fill="var(--accent-light)" />
    <path d="M24 38 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8 z" fill="var(--accent-light)" opacity="0.8" />
  </svg>
);

/** 手绘权益图标：相册（文件夹归档） */
const AlbumArt: React.FC = () => (
  <svg viewBox="0 0 48 48" fill="none" className="guest-perk-svg" aria-hidden>
    <path d="M8 17 a4 4 0 0 1 4 -4 h9 l3.5 4.5 H40 a3 3 0 0 1 3 3 V35 a4 4 0 0 1 -4 4 H12 a4 4 0 0 1 -4 -4 z" stroke="var(--accent-light)" strokeWidth="2" strokeLinejoin="round" />
    <path d="M15 25 h18 M15 31 h13" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
    <circle cx="35" cy="21" r="2.2" fill="var(--accent-light)" />
  </svg>
);

/** 手绘权益图标：标签（挂牌便签） */
const TagArt: React.FC = () => (
  <svg viewBox="0 0 48 48" fill="none" className="guest-perk-svg" aria-hidden>
    <path d="M10 14 h22 l8 9 -8 9 H10 a4 4 0 0 1 -4 -4 V18 a4 4 0 0 1 4 -4 z" stroke="var(--accent-light)" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="14" cy="23" r="2.6" stroke="var(--accent)" strokeWidth="1.6" />
    <path d="M20 21 h9 M20 26 h7" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
    <path d="M36 32 q4 2 2.5 6.5 q-2 3.5 -6.5 3" stroke="var(--text-muted)" strokeWidth="1.4" strokeDasharray="2 3.5" strokeLinecap="round" />
  </svg>
);

/** 手绘权益图标：全球分发（地球 + 闪电） */
const BoltArt: React.FC = () => (
  <svg viewBox="0 0 48 48" fill="none" className="guest-perk-svg" aria-hidden>
    <circle cx="24" cy="24" r="16" stroke="var(--accent-light)" strokeWidth="2" />
    <ellipse cx="24" cy="24" rx="7" ry="16" stroke="var(--border-subtle)" strokeWidth="1.4" />
    <path d="M8 24 h32" stroke="var(--border-subtle)" strokeWidth="1.4" />
    <path d="M25 10 L19 26 h6 L22 38 L31 20 h-6 z" fill="var(--accent)" opacity="0.9" />
  </svg>
);

/** 手绘分隔线：两侧虚线 + 中央星形 */
const GuestDivider: React.FC = () => (
  <div className="guest-divider" aria-hidden>
    <svg viewBox="0 0 160 20" fill="none" preserveAspectRatio="none" className="guest-divider-svg">
      <path d="M4 10 h60" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" />
      <path d="M96 10 h60" stroke="var(--border-subtle)" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" />
      <path d="M80 3 l1.6 3.8 3.8 1.6 -3.8 1.6 -1.6 3.8 -1.6 -3.8 -3.8 -1.6 3.8 -1.6 z" fill="var(--accent-light)" opacity="0.9" />
    </svg>
  </div>
);

/* ==================== 页面 ==================== */

const GUEST_PERKS = [
  { key: 'gallery', art: <GalleryArt />, title: '瀑布流画廊', desc: '无限浏览全网佳作' },
  { key: 'album', art: <AlbumArt />, title: '相册归档', desc: '按主题精细收纳' },
  { key: 'tag', art: <TagArt />, title: '标签聚类', desc: '色彩化管理分类' },
  { key: 'bolt', art: <BoltArt />, title: '全球分发', desc: '闪电级边缘加速' },
] as const;

const GUEST_RIGHTS = ['浏览画廊与搜索', '外链复制四格式'];
const MEMBER_RIGHTS = ['全部游客权益', '无限制上传（20MB/张）', '相册归档与管理', '标签批量打标', '永久物理删除'];

/**
 * GuestProfile — 未登录「我的」品牌引导页
 * 手绘 SVG 画廊插画 + 权益卡 + 游客/会员权限对比 + CTA
 */
export const GuestProfile: React.FC<GuestProfileProps> = ({ onLogin }) => {
  return (
    <div className="guest-profile">
      {/* 氛围光晕背景 */}
      <div className="guest-halo" aria-hidden />

      {/* Hero 插画区 */}
      <FadeInUp distance={26} duration={0.6}>
        <div className="guest-hero">
          <GuestHeroArt />
        </div>
      </FadeInUp>

      {/* 标题区 */}
      <FadeInUp delay={0.08} distance={18}>
        <div className="guest-head">
          <h1 className="guest-title">
            欢迎探索 <span className="premium-gradient-text">LMage</span>
          </h1>
          <p className="guest-desc">
            以 Telegram 为底座的全新免费图床与画廊，
            <br />
            上传、归档、打标、外链，一站完成。
          </p>
        </div>
      </FadeInUp>

      <GuestDivider />

      {/* 权益卡 */}
      <div className="guest-perk-grid">
        {GUEST_PERKS.map((perk, i) => (
          <FadeInUp key={perk.key} delay={0.14 + i * 0.08} distance={20}>
            <div className="guest-perk-card">
              <div className="guest-perk-icon">{perk.art}</div>
              <span className="guest-perk-title">{perk.title}</span>
              <span className="guest-perk-desc">{perk.desc}</span>
            </div>
          </FadeInUp>
        ))}
      </div>

      {/* 权限对比卡 */}
      <FadeInUp delay={0.42} distance={20}>
        <div className="guest-compare">
          <div className="guest-compare-col guest-compare-guest">
            <span className="guest-compare-tag">游客</span>
            <ul>
              {GUEST_RIGHTS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <div className="guest-compare-col guest-compare-member">
            <span className="guest-compare-tag">
              <ShieldCheck size={12} strokeWidth={2} />
              注册会员
            </span>
            <ul>
              {MEMBER_RIGHTS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </FadeInUp>

      {/* CTA */}
      <FadeInUp delay={0.52} distance={20}>
        <motion.button
          type="button"
          className="guest-cta"
          onClick={onLogin}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
        >
          <LogIn size={17} strokeWidth={2} />
          立即加入 LMage
          <span className="guest-cta-sparkle" aria-hidden>
            ✦
          </span>
        </motion.button>
        <p className="guest-login-hint">已有账号？点击右上角头像可直接登录</p>
      </FadeInUp>
    </div>
  );
};
