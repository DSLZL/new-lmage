# LMage Pro 前端（client）

基于 React 19 + TypeScript + Vite 构建的图床前端单页应用，面向 `new-lmage` 仓库中基于 Telegram 的图床服务，提供图库浏览、上传、相册、标签、数据大盘与账号体系等完整 Web 界面。

## 技术栈

| 类别 | 选型 | 版本 | 用途 |
| --- | --- | --- | --- |
| UI 框架 | react / react-dom | ^19.2.8 | 组件化页面渲染 |
| 构建工具 | vite | ^8.2.0 | 开发服务器与生产构建 |
| 语言 | typescript | ~6.0.2 | 全量类型约束（`tsc -b` 类型检查） |
| 路由 | react-router-dom | ^7.18.2 | 多页面路由（BrowserRouter） |
| 动效 | framer-motion | ^13.0.0 | 弹簧/渐变动画、AnimatePresence 过渡 |
| 图标 | lucide-react | ^1.30.0 | 线性图标库 |
| 提示 | sonner | ^2.0.7 | Toast 通知（Toaster） |
| 上传 | react-dropzone | ^20.0.0 | 拖拽/点击文件选择 |
| 开发依赖 | @vitejs/plugin-react / oxlint / @types/react 等 | — | 编译插件、Lint 与类型声明 |

## 功能特性

- 游客免登录：图库 `/` 面向游客直接开放，未登录用户访问相册、标签、大盘时就地渲染登录页（见 `App.tsx` 路由守卫），不强制注册即可浏览上传内容。
- 拖拽上传：`UploadZone` 支持图片 / 视频 / 音频多选上传，单文件上限 20MB，逐张中转并展示内联进度条，拒绝原因（超限、类型不符）以 Toast 提示。
- 防抖搜索：输入 300ms 防抖后触发 `searchImages`，搜索态展示「搜索「关键词」共 N 张」，可一键清除。
- 瀑布流图库：`masonry-grid` 参差布局 + 懒加载缩略图 + 入场动画，分页「加载更多」按 id 去重追加。
- 批量操作：图库批量移入回收站、相册内批量加图/移出、标签批量打标/解绑，均带二次确认弹层。
- 外链一键复制：光箱内提供原始直链、Markdown、HTML、BBCode 四种格式，一键复制到剪贴板。
- 相册体系：创建（可选提取码设私密相册）、提取码解锁查看、解散（仅解除归属不删图）。
- 标签体系：预设色板 + 自定义颜色，标签 chip 运行时着色，支持批量打标与解绑。
- 数据大盘：托管图片 / 空间占用 / 相册 / 标签四张数据卡（数字滚动动画）、SVG 环形空间使用率进度、个人资料与密码修改。
- 亮暗主题：青蓝色系设计 Token，手动切换并持久化，首屏无闪烁。
- 响应式移动端：PC 悬浮顶栏、移动端顶栏 + 悬浮底部 Tab（中央上传 FAB），同一套视觉 Token 与交互语言。

## 目录结构

```
client/
├── index.html                  # HTML 入口：预置主题脚本（防首屏闪烁）+ #root 挂载点
├── vite.config.ts              # Vite 配置（@vitejs/plugin-react）
├── tsconfig.json               # TS 工程引用（app / node 两个子工程）
├── tsconfig.app.json           # 应用侧 TS 配置（bundler 模式、jsx react-jsx）
├── package.json                # 依赖清单与脚本（dev / build / lint / preview）
├── .oxlintrc.json              # oxlint 规则（react / typescript / oxc 插件）
├── public/
│   ├── favicon.svg             # 站点图标（index.html 引用）
│   └── icons.svg
└── src/
    ├── main.tsx                # 应用入口：StrictMode + createRoot 渲染 App
    ├── App.tsx                 # 顶层组合：ThemeProvider → AuthProvider → Router，
    │                           #   组装 Header / MobileTopBar / BottomTab / Toaster 与全部路由
    ├── index.css / App.css     # 占位样式（实际样式按组件就近维护）
    ├── styles/
    │   ├── variables.css       # 设计 Token：亮暗双模 CSS 变量（青蓝色系、毛玻璃、圆角、动效）
    │   └── global.css          # 全局重置、宋体字体栈、圆点网格背景、渐变文字工具类
    ├── config/
    │   └── navigation.ts       # 大一统导航数据源（NAV_GROUPS / TAB_ITEMS）+ 事件总线（UPLOAD_EVENT / SEARCH_EVENT）
    ├── context/
    │   ├── ThemeContext.tsx    # 亮暗主题：localStorage 持久化、首次跟随系统、useTheme
    │   └── AuthContext.tsx     # 登录态：token 持久化、启动时令牌校验、useAuth
    ├── services/
    │   └── api.ts              # 强类型后端 API 封装（BASE_URL 双环境、Bearer 注入、getFileUrl 直链）
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx         # PC 悬浮顶栏：品牌 + 分组导航 + 搜索/主题/账户
    │   │   ├── MobileTopBar.tsx   # 移动端顶栏：品牌 + 搜索/主题/账户入口
    │   │   └── BottomTab.tsx      # 移动端悬浮底部 Tab：图库|相册 + 中央上传 FAB + 标签|大盘
    │   └── common/
    │       ├── BrandLogo.tsx        # 品牌 SVG（画框+山峦+旭日，CSS 变量着色，亮暗自适应）
    │       ├── UploadZone.tsx       # 拖拽上传区（react-dropzone、拒绝提示、内联进度）
    │       ├── ImageLightbox.tsx    # 大图光箱：详情属性 + 四种外链格式一键复制 + 物理删除入口
    │       ├── GallerySkeleton.tsx  # 瀑布流 shimmer 骨架屏（确定性高度序列）
    │       ├── GalleryEmpty.tsx     # 图库手绘插画空状态（画框+山峦+旭日）
    │       ├── CreateAlbumModal.tsx # 创建相册模态（名称 / 描述 / 可选提取码）
    │       ├── TagSelectModal.tsx   # 标签多选面板（批量打标 / 解绑共用）
    │       ├── ImagePickerModal.tsx # 图库选图器（相册批量加图，可搜索、可排除已选）
    │       ├── ConfirmDialog.tsx    # 通用二次确认弹层（danger / loading 态）
    │       ├── EmptyState.tsx       # 相册 / 标签页插画空状态
    │       ├── GlassCard.tsx        # 毛玻璃卡片容器（glass token + hover 发光）
    │       ├── CountUp.tsx          # 数字滚动增长组件（大盘数据卡）
    │       ├── Loader.tsx           # 通用加载指示器（旋转 + 呼吸文字）
    │       └── format.ts            # formatBytes（B/KB/MB/GB）/ formatNumber（千分位）
    └── pages/
        ├── gallery/Gallery.tsx    # 图库：上传 / 防抖搜索 / 瀑布流 / 批量回收站 / 物理删除 / 光箱
        ├── albums/Albums.tsx      # 相册：列表与详情双视图、创建、提取码解锁、批量加图移出、解散
        ├── tags/Tags.tsx          # 标签：彩色标签云、创建（色板+自定义）、批量打标解绑
        ├── stats/Stats.tsx        # 大盘：数据卡、SVG 环形进度、资料修改、密码重设
        └── auth/Login.tsx         # 登录 / 注册双模切换（客户端校验 + 错误抖动反馈）
```

## 设计系统

设计体系由 `src/styles/variables.css` 的 CSS 变量驱动，组件内不写死颜色，全部引用 Token。

### Token 分层

- 亮暗双模：浅色 Token 定义在 `:root`，深色由 `:root[data-theme='dark']` 整体覆盖；切换主题只需改 `html` 上的 `data-theme` 属性。
- 品牌色（青蓝系）：`--accent`（浅色 #0891b2 / 深色 #22d3ee）、`--accent-light`、`--accent-blue`，以及 `--accent-gradient`（135deg 青到蓝的渐变）与 `--accent-glow` 发光阴影；深色模式下青色发光更强。
- 背景与文本：`--bg-main` / `--bg-surface` / `--text-main` / `--text-muted`，深色模式整体反转。
- 毛玻璃：`--glass-bg` / `--glass-blur`（blur(20px)）/ `--glass-border` / `--glass-shadow`。
- 圆角与动效：`--radius-premium`（16px）、`--radius-round`（9999px）、`--transition-smooth` / `--transition-fast`（统一 cubic-bezier 曲线）。
- 导航专属：`--nav-height`（64px）、`--nav-pill-active`（渐变胶囊）、`--fab-bg` / `--fab-shadow`（FAB 按钮）等，Header / MobileTopBar / BottomTab 共用。

### 主题切换机制

- `src/context/ThemeContext.tsx`：`resolveInitialTheme` 优先读取 `localStorage` 的 `lmage_theme`，无记录时通过 `matchMedia('(prefers-color-scheme: dark)')` 跟随系统；`toggleTheme` 切换后写入 `html[data-theme]` 并持久化。
- `index.html`：渲染前内联脚本先按上述规则预置 `data-theme`，避免首屏白闪（FOUC）。
- 组件内通过 `useTheme()` 读取主题与切换函数，Header 与 MobileTopBar 的主题按钮用太阳/月亮图标旋转过渡：

```tsx
import { useTheme } from '../../context/ThemeContext';

const { theme, toggleTheme } = useTheme();

<button aria-label="切换亮暗主题" onClick={toggleTheme}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</button>
```

### 在页面中使用 Token

CSS 中直接引用变量，深色模式无需任何额外代码即自动适配（以 `GlassCard` 的实际实现为例）：

```css
.card {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-premium);
  box-shadow: var(--glass-shadow);
}
```

品牌渐变文字使用全局工具类 `.premium-gradient-text`（`background-clip: text`），正文排版由 `global.css` 统一指定宋体字体栈（`'Noto Serif SC', 'SimSun', 'Songti SC', 'STSong', serif`）。

## 导航体系

导航数据由 `src/config/navigation.ts` 大一统维护，三端导航组件只做消费，一处修改全站同步：

- `NAV_GROUPS`：PC 端 Header 的分组导航，含「浏览」（图库 `/`、相册 `/albums`）与「工具」（标签 `/tags`、大盘 `/stats`）两组；`NavItem.requiresAuth` 标记需要登录的页。
- `TAB_ITEMS`：移动端底部 Tab 的精简扁平列表（图库 / 相册 / 标签 / 大盘）。
- 事件总线：`UPLOAD_EVENT = 'app:open-upload'` 与 `SEARCH_EVENT = 'app:open-search'`，配合 `requestUpload()` / `requestSearch()` 触发函数，实现跨组件联动。

### 职责划分

- `Header`（PC，≥768px）：悬浮顶栏，滚动超过 24px 进入毛玻璃加深态；中央按 `NAV_GROUPS` 渲染分组胶囊导航（framer-motion `layoutId` 滑动指示）；右侧依次为全局搜索（`requestSearch`）、主题切换、账户区（登录用户头像下拉：个人资料/修改密码占位提示、退出登录；游客显示登录圆钮）。
- `MobileTopBar`（移动端，≤768px）：品牌 Logo + 搜索 / 主题 / 账户入口，交互与 Token 与 PC Header 完全一致，账户入口从这里进入（底部 Tab 不再承载）。
- `BottomTab`（移动端悬浮底部）：对称五段布局「图库 | 相册 ⚡ FAB ⚡ 标签 | 大盘」，`TAB_ITEMS` 前两项与后两项分别渲染左右两组，中央凸起 FAB 触发 `requestUpload`（点击带震动反馈）；活动项有弹簧滑动指示器。

### 事件总线用法

页面在挂载时监听事件，实现「Header/BottomTab 按钮 → 页面上传区/搜索框」联动（以 Gallery 为例）：

```tsx
import { UPLOAD_EVENT, SEARCH_EVENT } from '../../config/navigation';

useEffect(() => {
  const onUploadEvent = () => scrollToUpload();   // 平滑滚动到上传区并重放闪环动画
  const onSearchEvent = () => searchRef.current?.focus();
  window.addEventListener(UPLOAD_EVENT, onUploadEvent);
  window.addEventListener(SEARCH_EVENT, onSearchEvent);
  return () => {
    window.removeEventListener(UPLOAD_EVENT, onUploadEvent);
    window.removeEventListener(SEARCH_EVENT, onSearchEvent);
  };
}, []);
```

路由守卫在 `App.tsx`：`/albums`、`/tags`、`/stats` 未登录时就地渲染 `Login` 页，登录后自动呈现真实数据；`/login` 已登录时重定向回 `/`，未知路径统一回 `/`。

## 开发指南

前置要求：Node.js（建议 20+）与 npm。

```bash
# 1. 安装依赖（在 client 目录下）
npm install

# 2. 启动开发服务器（Vite HMR）
npm run dev

# 3. 类型检查 + 生产构建（tsc -b && vite build，产物输出到 dist/）
npm run build

# 4. 代码检查（oxlint，规则见 .oxlintrc.json）
npm run lint

# 5. 本地预览生产构建产物
npm run preview
```

## API 对接

所有后端请求统一收敛在 `src/services/api.ts`，页面不直接使用 `fetch`。

### BASE_URL 逻辑

```ts
const BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8787'
    : window.location.origin;
```

本地开发时请求 `http://127.0.0.1:8787`（本地后端服务地址），生产环境自动退化为与页面同源（`window.location.origin`），无需配置代理或环境变量。

### 封装要点

- `getHeaders(isMultipart)`：自动从 `localStorage` 的 `tg_image_token` 注入 `Authorization: Bearer <token>`；非 multipart 请求自动附加 `Content-Type: application/json`。
- `request<T>`：基于 `fetch` 的泛型封装，非 2xx 响应抛出 `Error`（响应体文本作为错误信息）。
- 接口方法按业务域分组：鉴权（`register` / `login` / `getCurrentUser` / `updateProfile` / `changePassword`）、图片网关（`uploadFile` 以 FormData 提交 `/upload`、`getImages` 分页、`searchImages`、`batchDeleteImages` 移入回收站、`getImageDetail`、`deleteImagePhysically` 物理删除）、相册（`getAlbums` / `createAlbum` / `getAlbumDetail` 支持 `?password=` 提取码 / `modifyAlbumImages` 批量 `add`/`remove` / `deleteAlbum`）、标签（`getTags` / `createTag` / `batchTagImages` / `getTagImages`）、统计（`getStats` 返回 `QuotaStats`）。
- `getFileUrl(id, isThumb)`：生成文件直链，`isThumb` 时追加 `?size=thumb` 取缩略图；图库缩略图与光箱大图均通过它取址。
