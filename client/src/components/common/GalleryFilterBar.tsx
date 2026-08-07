import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Flame, LayoutGrid } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** 图库筛选模式：全部（服务端默认序）/ 最近上传 / 浏览最多 */
export type GalleryFilter = 'all' | 'recent' | 'popular';

interface GalleryFilterBarProps {
  value: GalleryFilter;
  onChange: (filter: GalleryFilter) => void;
}

interface FilterOption {
  value: GalleryFilter;
  label: string;
  icon: LucideIcon;
}

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: '全部', icon: LayoutGrid },
  { value: 'recent', label: '最近上传', icon: Clock },
  { value: 'popular', label: '浏览最多', icon: Flame },
];

/** 筛选 chips：active 渐变高亮 + 滑动胶囊微动画，小屏横向滚动隐藏滚动条 */
export const GalleryFilterBar: React.FC<GalleryFilterBarProps> = ({ value, onChange }) => (
  <div className="g-filter-bar" role="tablist" aria-label="图片排序筛选">
    {FILTER_OPTIONS.map((opt) => {
      const active = opt.value === value;
      const Icon = opt.icon;
      return (
        <motion.button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={active}
          whileTap={{ scale: 0.92 }}
          className={`g-filter-chip${active ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {active && (
            <motion.span
              className="g-filter-pill"
              layoutId="g-filter-active"
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            />
          )}
          <span className="g-filter-chip-inner">
            <Icon size={13} strokeWidth={1.5} />
            {opt.label}
          </span>
        </motion.button>
      );
    })}
  </div>
);
