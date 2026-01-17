import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

/**
 * MainLayout - 主布局组件
 * 模拟物理手账本的感觉：方格纸背景 + 白纸内容区
 */
const MainLayout = () => {
  return (
    <div className="min-h-screen relative">
      {/* 主容器 - 桌面视图使用左右布局 */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:gap-8 md:p-6 lg:p-8 relative">

        {/* 侧边栏 - 笔记本书脊 */}
        <Sidebar />

        {/* 主内容区域 */}
        <main className="flex-1 flex flex-col min-w-0 pb-24 md:pb-0">

          {/* 顶部粘性区域 - Header */}
          <div className="sticky top-0 z-30 px-4 md:px-0 py-3 md:py-0 md:mb-6">
            {/* 半透明背景模拟纸张叠加效果 */}
            <div className="absolute inset-0 md:hidden bg-gradient-to-b from-[#f8f8f6] via-[#f8f8f6] to-transparent" />
            <div className="relative">
              <Header />
            </div>
          </div>

          {/* 白纸内容区 - 主要的"纸张"效果 */}
          <div className="mx-4 md:mx-0 relative group">

            {/* 纸张装饰 - 胶带 */}
            <div className="tape-top hidden md:block animate-tape-stick" />
            <div className="tape-top-left hidden lg:block opacity-70" style={{ transform: 'rotate(-12deg)' }} />
            <div className="tape-top-right hidden lg:block opacity-60" style={{ transform: 'rotate(8deg)' }} />

            {/* 纸张本体 */}
            <article
              className="
                paper-sheet rounded-sm
                p-5 md:p-8 lg:p-10
                min-h-[75vh] md:min-h-[80vh]
                md:rotate-slight-1
                transition-all duration-500 ease-out
                md:hover:rotate-0 md:hover:shadow-sketch-lg
                origin-top-left
              "
            >
              {/* 纸张内边线装饰 */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {/* 左侧红线（像真正的笔记本） */}
              <div className="hidden md:block absolute top-0 bottom-0 left-16 w-px bg-red-200/40" />

              {/* 订书钉装饰 */}
              <div className="staple-top hidden md:block" />

              {/* 页面内容 */}
              <div className="relative z-10 min-h-full">
                <Outlet />
              </div>

              {/* 纸张卷边效果 */}
              <div className="page-curl" />
            </article>

            {/* 纸张阴影层 - 模拟多层纸 */}
            <div
              className="
                hidden md:block absolute inset-0 bg-white rounded-sm -z-10
                transform translate-x-1 translate-y-1 rotate-slight-2
                opacity-60 shadow-sketch
              "
            />
            <div
              className="
                hidden lg:block absolute inset-0 bg-white rounded-sm -z-20
                transform translate-x-2 translate-y-2 -rotate-slight-1
                opacity-30 shadow-sketch
              "
            />
          </div>

          {/* 页脚 - 手写风格 */}
          <footer className="mt-8 md:mt-12 mb-6 px-4 md:px-0">
            <div className="text-center">
              {/* 分隔线 */}
              <div className="divider-dashed max-w-xs mx-auto mb-4" />

              <p className="text-pencil-light text-lg rotate-slight-n1 inline-block">
                <span className="highlight-yellow">Doodle Diary</span>
                <span className="mx-2">·</span>
                <span className="text-base">记录生活的小碎片</span>
              </p>

              <p className="text-gray-400 text-sm mt-2 rotate-slight-1">
                Handcrafted with ♡ by 老王 © 2026
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* 全局装饰 - 散落的装饰元素 */}
      <div className="fixed bottom-8 left-8 hidden xl:block pointer-events-none opacity-20 rotate-12">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
          <path d="M12 2L2 22h20L12 2zM12 8v6M12 18h.01" />
        </svg>
      </div>
    </div>
  );
};

export default MainLayout;
