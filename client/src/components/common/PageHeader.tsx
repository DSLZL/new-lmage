import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './PageHeader.css';

export interface PageHeaderProps {
  /** 页面标题（支持 ReactNode，可内嵌彩色 chip 等） */
  title: React.ReactNode;
  /** 副标题（可选，展示于标题下方，如分类名 / 统计数） */
  subtitle?: React.ReactNode;
  /** 返回回调；不传时自动执行路由后退 navigate(-1)（需处于 Router 内） */
  onBack?: () => void;
  /** 是否显示返回按钮，默认 true */
  showBack?: boolean;
  /** 是否吸顶（sticky），默认 true */
  sticky?: boolean;
  /** 右侧插槽（操作按钮等，任意 ReactNode） */
  children?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * PageHeader — 移动端页面头（毛玻璃 sticky）
 *
 * 结构：返回按钮 + 标题区（标题/副标题）+ 右侧插槽。
 * 毛玻璃吸顶（sticky），≤768px 展示；桌面端自动隐藏（与 MobileTopBar 同规则）。
 *
 * 用法：
 * <PageHeader title="相册详情" subtitle="共 24 张" onBack={() => navigate('/albums')}>
 *   <button onClick={handleEdit}>编辑</button>
 * </PageHeader>
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = true,
  sticky = true,
  children,
  className,
}) => {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(-1));

  return (
    <header
      className={`page-header${sticky ? ' page-header-sticky' : ''}${
        className ? ` ${className}` : ''
      }`}
    >
      {showBack && (
        <button
          type="button"
          className="page-header-back"
          onClick={handleBack}
          aria-label="返回"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
        </button>
      )}
      <div className="page-header-text">
        <h1 className="page-header-title">{title}</h1>
        {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </header>
  );
};
