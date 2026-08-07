// 大一统导航数据源：Header / BottomTab 共用，一处修改全站同步
import type { LucideIcon } from 'lucide-react';
import { Image, LayoutGrid, User } from 'lucide-react';

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
    id: 'main',
    label: '浏览',
    items: [
      { id: 'gallery', path: '/', label: '图库', icon: Image },
      { id: 'manage', path: '/manage', label: '画廊', icon: LayoutGrid, requiresAuth: true },
    ],
  },
  {
    id: 'personal',
    label: '个人',
    items: [{ id: 'profile', path: '/profile', label: '我的', icon: User }],
  },
];

/** 底部 Tab（移动端 BottomTab 使用）：图库 | 画廊 | 我的
 * 画廊 = 管理中心（相册 / 标签 / 大盘 多子界面，/manage 二级导航） */
export const TAB_ITEMS: NavItem[] = [
  { id: 'gallery', path: '/', label: '图库', icon: Image },
  { id: 'manage', path: '/manage', label: '画廊', icon: LayoutGrid, requiresAuth: true },
  { id: 'profile', path: '/profile', label: '我的', icon: User },
];

/** 全局快捷动作事件名：Header 搜索按钮 -> 图库搜索框联动 */
export const SEARCH_EVENT = 'app:open-search';

/** 触发全局搜索 */
export function requestSearch() {
  window.dispatchEvent(new CustomEvent(SEARCH_EVENT));
}
