# 🖼️ New-Lmage - 基于 Telegram 的现代化图床服务

<div align="center">

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare)
![Telegram](https://img.shields.io/badge/Telegram-Bot-26A5E4?style=for-the-badge&logo=telegram)
![License](https://img.shields.io/badge/License-AGPL--3.0-blue?style=for-the-badge)

**完全免费 · 无限存储 · 全球加速 · 现代化界面**

[在线演示](https://bed.djxs.xyz/) · [快速开始](#-快速开始) · [功能特性](#-功能特性)

</div>

---

## ✨ 功能特性

### 🎯 核心功能

- **📤 智能上传** - 拖拽、粘贴、批量上传，实时进度显示
- **🖼️ 图片管理** - 网格/列表视图，搜索筛选，批量操作
- **🎨 图片编辑** - 滤镜、亮度/对比度/饱和度调整，旋转缩放
- **⭐ 收藏功能** - 快速收藏常用图片
- **🏷️ 标签管理** - 自定义标签，颜色分类
- **👤 用户系统** - JWT 认证，个人资料，使用统计
- **🌓 深色模式** - 自动切换，护眼舒适
- **📱 响应式设计** - 完美适配桌面、平板、手机

### 🚀 技术亮点

- **⚡ 极速加载** - Vite 构建、代码分割、懒加载
- **🎭 精美动画** - Framer Motion 流畅过渡动画
- **🎨 现代 UI** - 玻璃态设计、react-icons 图标库
- **� 安全可靠*** - JWT 认证、密码哈希、CORS 保护
- **💰 完全免费** - 基于 Cloudflare Workers 和 Telegram
- **🌍 全球加速** - Cloudflare 全球 CDN
- **📦 无限存储** - 利用 Telegram 作为图片存储后端

## � 快速开始

### 前置要求

- Node.js 18+
- Cloudflare 账户（免费）
- Telegram Bot Token（免费）

### 部署步骤

```bash
# 1. 克隆仓库
git clone https://github.com/xiyewuqiu/new-lmage.git
cd new-lmage

# 2. 安装依赖
npm install
cd client && npm install && cd ..

# 3. 配置环境变量（编辑 wrangler.toml）
# TG_Bot_Token = "your-bot-token"
# TG_Chat_ID = "your-chat-id"
# JWT_SECRET = "your-secret-key"

# 4. 登录 Cloudflare
npx wrangler login

# 5. 创建 KV 存储
npm run create-kv

# 6. 一键部署
npm run build:deploy
```

## 📦 项目结构

```
new-lmage/
├── src/                      # 后端代码（Cloudflare Workers）
│   ├── functions/
│   │   ├── user/            # 用户认证 API
│   │   ├── file/            # 文件访问
│   │   └── utils/           # 工具函数
│   └── index.js             # 后端主入口
│
├── client/                  # 前端代码（React）
│   ├── src/
│   │   ├── components/      # UI 组件（16个）
│   │   ├── pages/           # 页面组件（10个）
│   │   ├── layouts/         # 布局组件
│   │   ├── store/           # Zustand 状态管理（5个）
│   │   ├── services/        # API 服务
│   │   └── styles/          # 全局样式
│   └── vite.config.js
│
├── public/                  # 静态资源
├── wrangler.toml            # Cloudflare 配置
└── package.json
```

## 🛠️ 技术栈

| 前端 | 后端 |
|------|------|
| React 18.3 | Cloudflare Workers |
| Vite 5 | Hono |
| Zustand | KV Storage |
| React Router 6 | Telegram Bot API |
| Framer Motion | |
| react-icons | |
| Axios | |

## 📝 开发命令

```bash
npm run dev              # 启动后端开发服务器
npm run dev:client       # 启动前端开发服务器
npm run build            # 构建前端
npm run deploy           # 部署到 Cloudflare
npm run build:deploy     # 构建并部署
npm run create-kv        # 创建 KV 命名空间
```

## 🔌 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/user` | GET | 获取当前用户 |
| `/upload` | POST | 上传图片 |
| `/api/images` | GET | 获取图片列表 |
| `/api/images/:id` | DELETE | 删除图片 |
| `/api/favorites` | GET | 获取收藏列表 |
| `/api/favorites/:id` | POST/DELETE | 添加/取消收藏 |
| `/api/tags` | GET/POST | 获取/创建标签 |
| `/file/:id` | GET | 访问图片文件 |

## 📄 许可证

AGPL-3.0-with-Commons-Clause

## 🙏 致谢

- [React](https://react.dev/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Telegram](https://telegram.org/)
- [Hono](https://hono.dev/)
- [Framer Motion](https://www.framer.com/motion/)

---

<div align="center">

**如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！**

Made with ❤️ by [xiyewuqiu](https://github.com/xiyewuqiu)

</div>
