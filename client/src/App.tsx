import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/layout/Header';
import { MobileTopBar } from './components/layout/MobileTopBar';
import { BottomTab } from './components/layout/BottomTab';
import { Loader } from './components/common/Loader';
import { Toaster } from 'sonner';

/* 路由级代码分割：首屏只加载图库，其余页面按需进入 */
const Gallery = lazy(() => import('./pages/gallery/Gallery').then((m) => ({ default: m.Gallery })));
const Login = lazy(() => import('./pages/auth/Login').then((m) => ({ default: m.Login })));
const Manage = lazy(() => import('./pages/manage/Manage').then((m) => ({ default: m.Manage })));
const AlbumDetail = lazy(() =>
  import('./pages/albums/AlbumDetail').then((m) => ({ default: m.AlbumDetail }))
);
const TagDetail = lazy(() => import('./pages/tags/TagDetail').then((m) => ({ default: m.TagDetail })));
const Profile = lazy(() => import('./pages/profile/Profile').then((m) => ({ default: m.Profile })));

import './styles/global.css';
import './components/layout/header.css';
import './components/layout/mobiletopbar.css';
import './components/layout/bottomtab.css';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-subtle)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ⚡ 极致设计：全站面向游客无拦截！
  return (
    <Router>
      <div className="app-bg-grid" />

      {/* PC 端悬浮导航栏 */}
      <Header />
      {/* 移动端顶部导航（≤768px 显示） */}
      <MobileTopBar />

      <main className="app-main-content" style={{ paddingBottom: '32px' }}>
        <Suspense
          fallback={
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12vh' }}>
              <Loader size="md" text="加载中..." />
            </div>
          }
        >
          <Routes>
          {/* 游客直接畅行访问主图库 */}
          <Route path="/" element={<Gallery />} />
          
          {/* 图床管理中心：相册/标签/大盘 多子界面（页面内二级导航） */}
          <Route path="/manage" element={user ? <Manage /> : <Login />} />
          <Route path="/manage/tags" element={user ? <Manage /> : <Login />} />
          <Route path="/manage/stats" element={user ? <Manage /> : <Login />} />
          
          {/* 详情页独立路由 */}
          <Route path="/albums/:albumid" element={user ? <AlbumDetail /> : <Login />} />
          <Route path="/tags/:tagid" element={user ? <TagDetail /> : <Login />} />
          
          {/* 旧列表路由重定向到图床管理中心 */}
          <Route path="/albums" element={user ? <Navigate to="/manage" replace /> : <Login />} />
          <Route path="/tags" element={user ? <Navigate to="/manage/tags" replace /> : <Login />} />
          
          {/* 我的：游客可看（登录引导），登录后完整个人中心 */}
          <Route path="/profile" element={<Profile />} />
          
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </main>

      {/* 移动端底部 Tab 导航 */}
      <BottomTab />

      {/* 高端 Toast 提醒气泡 */}
      <Toaster position="top-center" theme="dark" closeButton />
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};
export default App;
