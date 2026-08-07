// 大一统导航数据源：Header / BottomTab 共用，一处修改全站同步
import type { LucideIcon } from 'lucide-react';
import { Image, FolderHeart, Tags, BarChart3 } from 'lucide-react';

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  /** 需要登录后才可访问的目标页（游客点击时引导登录） */
  requiresAuth?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

/** 顶部导航分组（PC 端 Header 使用） */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'browse',
    label: '浏览',
    items: [
      { id: 'gallery', path: '/', label: '图库', icon: Image },
      { id: 'albums', path: '/albums', label: '相册', icon: FolderHeart, requiresAuth: true },
    ],
  },
  {
    id: 'tools',
    label: '工具',
    items: [
      { id: 'tags', path: '/tags', label: '标签', icon: Tags, requiresAuth: true },
      { id: 'stats', path: '/stats', label: '大盘', icon: BarChart3, requiresAuth: true },
    ],
  },
];

/** 底部 Tab 精简版（移动端 BottomTab 使用，按主次排序） */
export const TAB_ITEMS: NavItem[] = [
  { id: 'gallery', path: '/', label: '图库', icon: Image },
  { id: 'albums', path: '/albums', label: '相册', icon: FolderHeart, requiresAuth: true },
  { id: 'tags', path: '/tags', label: '标签', icon: Tags, requiresAuth: true },
  { id: 'stats', path: '/stats', label: '大盘', icon: BarChart3, requiresAuth: true },
];

/** 全局快捷动作事件名：Header 上传按钮 -> 页面上传区联动 */
export const UPLOAD_EVENT = 'app:open-upload';
export const SEARCH_EVENT = 'app:open-search';

/** 触发全局上传 */
export function requestUpload() {
  window.dispatchEvent(new CustomEvent(UPLOAD_EVENT));
}

/** 触发全局搜索 */
export function requestSearch() {
  window.dispatchEvent(new CustomEvent(SEARCH_EVENT));
}
