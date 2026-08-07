import React from 'react';
import './galleryList.css';

/** 瀑布流骨架屏的确定性高度序列（与真实图片的参差节奏呼应） */
const SKELETON_HEIGHTS = [260, 340, 220, 300, 380, 240, 320, 280, 360, 250, 330, 270];

/** 图库 shimmer 骨架屏：加载态替代纯文字转圈 */
export const GallerySkeleton: React.FC<{ count?: number }> = ({ count = 12 }) => (
  <div className="masonry-grid skeleton-grid" aria-hidden>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="skeleton-card"
        style={{ height: SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length] }}
      >
        <span className="skeleton-shimmer" />
      </div>
    ))}
  </div>
);
