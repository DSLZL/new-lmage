import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/layout/Header';
import { MobileTopBar } from './components/layout/MobileTopBar';
import { BottomTab } from './components/layout/BottomTab';
import { Login } from './pages/auth/Login';
import { Gallery } from './pages/gallery/Gallery';
import { Albums } from './pages/albums/Albums';
import { Tags } from './pages/tags/Tags';
import { Stats } from './pages/stats/Stats';
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
          
          {/* 敏感操作：未登录时就地渲染登录页，登录后呈现真实数据 */}
          <Route path="/albums" element={user ? <Albums /> : <Login />} />
          <Route path="/tags" element={user ? <Tags /> : <Login />} />
          <Route path="/stats" element={user ? <Stats /> : <Login />} />
          
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
