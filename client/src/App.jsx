import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts - 保持同步加载（布局是首屏必须的）
import MainLayout from '@/layouts/MainLayout';
import AuthLayout from '@/layouts/AuthLayout';

// Pages - 懒加载（按需加载，减少首屏体积）
const HomePage = lazy(() => import('@/pages/Home'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const FavoritesPage = lazy(() => import('@/pages/Favorites'));
const TagsPage = lazy(() => import('@/pages/Tags'));
const LoginPage = lazy(() => import('@/pages/Login'));
const RegisterPage = lazy(() => import('@/pages/Register'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const HelpPage = lazy(() => import('@/pages/Help'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

// Hooks
import { useAuthStore } from '@/store/authStore';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from '@/components/ScrollToTop';

// 页面加载骨架屏
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="text-2xl font-hand text-pencil animate-pulse">正在翻页...</div>
  </div>
);

function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Main Notebook Layout */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/help" element={<HelpPage />} />

            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
            <Route path="/tags" element={<ProtectedRoute><TagsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Route>

          {/* Sticky Note Auth Layout */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
