import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/layout/Header';
import { MobileTopBar } from './components/layout/MobileTopBar';
import { BottomTab } from './components/layout/BottomTab';
import { Login } from './pages/auth/Login';
import { Gallery } from './pages/gallery/Gallery';
import { Manage } from './pages/manage/Manage';
import { AlbumDetail } from './pages/albums/AlbumDetail';
import { TagDetail } from './pages/tags/TagDetail';
import { Profile } from './pages/profile/Profile';
import { Toaster } from 'sonner';

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
      <div className="app-bg-glow" />

      {/* PC 端悬浮导航栏 */}
      <Header />
      {/* 移动端顶部导航（≤768px 显示） */}
      <MobileTopBar />

      <main className="app-main-content" style={{ paddingBottom: '32px' }}>
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
