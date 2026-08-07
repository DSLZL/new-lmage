# 🖼️ New-Lmage — 基于 Telegram 的免费图床

基于 Cloudflare Workers + D1 + Telegram Bot API 的现代化图床：后端由 **Rust 编译为 WebAssembly** 运行于 Cloudflare Workers（三层整洁架构），前端为 React 单页应用，图片原图与缩略图存储在 Telegram 频道，元数据与用户资产存于 D1 数据库，文件读取经 Cloudflare 全球边缘缓存加速。

<div align="center">

![Rust](https://img.shields.io/badge/Rust-3.0.0-dea584?style=for-the-badge&logo=rust)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-F38020?style=for-the-badge&logo=cloudflare)
![Telegram](https://img.shields.io/badge/Telegram-Bot%20API-26A5E4?style=for-the-badge&logo=telegram)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Vite-3178C6?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-AGPL--3.0--Commons--Clause-blue?style=for-the-badge)

在线演示地址以实际部署为准 · [快速开始](#-快速开始) · [功能特性](#-功能特性) · [API 速查表](#-api-速查表)

</div>

---

## ✨ 功能特性

### 上传与存储

- **游客免登录上传**：`POST /upload` 鉴权可选，未携带 Token 时自动归入匿名账户，登录后同样可上传
- **Telegram 底层存储**：原图通过 `sendDocument` 存入指定 Telegram 频道/群组，D1 仅存元数据，存储空间零成本
- **单文件 20MB 限制**：支持图片（png/jpg/webp/svg/gif）与视频（mp4）、音频（mp3）等类型
- **拖拽上传**：前端基于 `react-dropzone` 的拖拽/点击多文件上传区

### 文件读取与加速

- **流式代理网关**：`GET /file/:filekey` 实时换取 Telegram 物理路径并流式回源
- **Cloudflare 边缘缓存**：命中 `Cache API` 物理缓存直接秒开；未命中时后台异步写入缓存，不阻塞响应；强缓存头 `Cache-Control: public, s-maxage=31536000, max-age=31536000, immutable`
- **缩略图**：`?size=thumb` 直接复用 Telegram 自动生成的缩略图，大幅节省流量
- **状态管理开关（默认关闭）**：纯图床模式下访问路径零 D1 查询；设置 `FILE_STATUS_CHECK=on` 可启用封禁（403）/回收站（404）边缘拦截与点击统计
- **点击统计**：每次成功回源自动累计 `views` 并刷新 `last_accessed_at`

### 图库与资产管理

- **瀑布流图库**：分页加载（`page`/`limit`），悬停查看元数据（文件名、大小、浏览量、上传时间）
- **关键字搜索**：按文件名模糊搜索（`keyword` 或 `q` 参数）
- **批量管理**：多选后批量移入回收站、批量打标/解绑标签
- **物理永久删除**：同时销毁 Telegram 频道中的原始消息并从 D1 抹除记录，支持管理员代删
- **相册**：创建相册（可设置提取码，密码加盐哈希存储）、相册详情按提取码校验、批量加入/移出图片、删除相册自动解除图片归属
- **标签**：自定义标签（可带颜色）、按标签浏览图片
- **统计大盘**：图片总数、总存储占用、相册数、标签数、配额用量（10GB 配额阈值）

### 用户体系与体验

- **注册/登录**：JWT（HS256）认证，Token 有效期 7 天；个人资料修改、密码修改
- **外链一键复制**：光箱中提供 Markdown / HTML / BBCode 三种外链格式复制
- **亮暗主题**：手动切换并持久化到 localStorage（首次访问跟随系统偏好）
- **响应式布局**：桌面 Header 与移动端底部导航（BottomTab）/ 移动顶栏（MobileTopBar）

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────┐
│              React 19 + TypeScript + Vite            │  client/
│       瀑布流图库 / 相册 / 标签 / 统计 / 登录           │  静态资源由 Workers Sites 托管
└─────────────────────────┬───────────────────────────┘
                          │ HTTPS  /api/*  携带 JWT (Authorization: Bearer <token>)
┌─────────────────────────▼───────────────────────────┐
│        Cloudflare Workers（Rust → WebAssembly）      │  src/
│   ┌──────────────┐   ┌──────────────┐   ┌─────────┐ │
│   │  handlers    │──▶│   domain     │──▶│  core   │ │
│   │  HTTP 路由层  │   │ 实体 + D1 CRUD│   │ 通用能力 │ │
│   └──────────────┘   └──────────────┘   └─────────┘ │
└───────────┬─────────────────────────────┬───────────┘
            │                             │
   ┌────────▼────────┐          ┌─────────▼──────────┐
   │  D1 (SQLite)    │          │ Telegram Bot API   │
   │ users / images  │          │ 原图 + 缩略图物理存储 │
   │ albums / tags   │          │ sendDocument →      │
   │ image_tags      │          │ getFile → 流式拉取   │
   └─────────────────┘          └────────────────────┘
            ▲
            └── 文件读取路径 GET /file/:filekey 额外经过 Cloudflare Cache API 全球边缘缓存
```

- **存储策略**：二进制文件全部落在 Telegram（零存储成本、天然异地冗余），D1 仅保存元数据（file_id、message_id、缩略图 file_id、归属、状态、统计）
- **零摩擦自愈**：Worker 每次请求冷启动时自动执行建表语句（`CREATE TABLE IF NOT EXISTS`），无需手工迁移
- **版本**：当前后端为 Rust 重构版 3.0（`/api/health` 返回 `rust-clean-architecture-3.0.0`），取代旧 JS 后端

## 📁 后端目录结构（三层整洁架构）

```
src/
├── lib.rs                    # 121 行 入口：路由挂载、CORS 预检放行、D1 数据表自愈初始化
├── core/                     # 基础设施层：与业务无关的通用能力
│   ├── cors.rs               #   8 行 统一 CORS 响应头（GET/POST/PUT/DELETE/OPTIONS）
│   ├── crypto.rs             #  93 行 密码加盐哈希（SHA-256）、JWT 签发/校验、Bearer 鉴权中间件
│   └── tg.rs                 # 119 行 Telegram Bot API 封装：multipart 上传、getFile 取路径、流式读取、删消息
├── domain/                   # 领域层：实体模型 + D1 数据访问
│   ├── db.rs                 #  73 行 建表 DDL：users / albums / images / tags / image_tags
│   ├── user.rs               # 115 行 用户实体与 CRUD（注册/登录/资料/密码）
│   ├── image.rs              #  89 行 图片实体与 CRUD（回收站/封禁状态/点击统计）
│   ├── album.rs              #  54 行 相册实体与 CRUD（提取码哈希）
│   └── tag.rs                #  49 行 标签实体与 CRUD
└── handlers/                 # 表现层：HTTP 处理器（只做参数解析、鉴权、编排）
    ├── auth.rs               # 212 行 注册 / 登录 / 当前用户 / 资料修改 / 修改密码
    ├── upload.rs             #  85 行 上传（可选鉴权、20MB 限制、TG 中转、写 D1）
    ├── file.rs               # 117 行 流式代理（边缘缓存/缩略图/点击统计）与物理删除
    ├── image.rs              # 136 行 图片分页列表 / 详情 / 搜索 / 批量移入回收站
    ├── album.rs              # 207 行 相册列表 / 创建 / 详情（提取码校验）/ 批量归属 / 删除
    ├── tag.rs                # 140 行 标签列表 / 创建 / 批量打标 / 按标签拉取图片
    └── stats.rs              #  65 行 统计大盘（图片/存储/相册/标签/配额）
```

## 📁 前端目录结构

```
client/
├── src/
│   ├── pages/                # 页面：gallery（瀑布流图库）/ albums / tags / stats / auth（登录）
│   ├── components/
│   │   ├── common/           # 上传区、图片光箱、创建相册弹窗、标签选择、确认框等通用组件
│   │   └── layout/           # Header、BottomTab（移动端底部导航）、MobileTopBar
│   ├── config/               # navigation.ts 导航配置与跨组件事件（搜索、上传）
│   ├── context/              # AuthContext（登录态与 Token）、ThemeContext（亮暗主题）
│   ├── services/             # api.ts 强类型后端对接总线（localhost 自动指向 127.0.0.1:8787）
│   └── styles/               # variables.css（设计变量）、global.css（全局样式）
├── index.html
└── vite.config.ts
```

前端技术栈：React 19、TypeScript、Vite 8、react-router-dom 7、framer-motion（动画）、react-dropzone（拖拽上传）、lucide-react（图标）、sonner（轻提示）、oxlint（代码检查）。详细说明见 [client/README.md](client/README.md)。

## 🔌 API 速查表

除标注外，所有 `/api/*` 接口均需请求头 `Authorization: Bearer <JWT>`（Token 由注册/登录返回，有效期 7 天）。

### 系统

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 无 | 健康检查与版本状态 |

### 文件流网关

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/upload` | 可选 | 上传（multipart 表单字段 `file`，可选 `albumid`；未登录归入 anonymous；单文件 ≤ 20MB），返回 `[{ "src": "/file/xxx" }]` |
| GET | `/file/:filekey` | 无 | 流式读取原图；`?size=thumb` 取缩略图；边缘缓存 + 封禁/回收站拦截 + 点击统计（图床外链自由访问） |
| DELETE | `/api/images/:imageid` | 登录 | 物理永久删除：销毁 TG 频道消息 + 抹除 D1 记录（本人或 admin） |

### 鉴权中心

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/auth/register` | 无 | 注册（username/email/password，密码 ≥ 6 位），返回 Token |
| POST | `/api/auth/login` | 无 | 登录（username/password），返回 Token |
| GET | `/api/auth/user` | 登录 | 获取当前用户信息 |
| PUT | `/api/auth/profile` | 登录 | 修改资料（username/email/bio/avatar_url） |
| PUT | `/api/auth/password` | 登录 | 修改密码（current_password/new_password） |

### 图片管理

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/images` | 登录 | 分页列表（`?page=1&limit=20`），排除回收站 |
| GET | `/api/images/search` | 登录 | 按文件名模糊搜索（`?keyword=` 或 `?q=`） |
| POST | `/api/images/batch/delete` | 登录 | 批量移入回收站（JSON：`file_ids`） |
| GET | `/api/images/:imageid` | 登录 | 单张图片元数据详情（本人或 admin） |

### 相册

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/albums` | 登录 | 相册列表 |
| POST | `/api/albums` | 登录 | 创建相册（JSON：name/description/cover_url/password，password 即提取码） |
| GET | `/api/albums/:albumid` | 登录 | 相册详情与内含图片；非本人访问需 `?password=`（或 `?code=`）提取码 |
| POST | `/api/albums/:albumid/images` | 登录 | 批量加入/移出图片（JSON：`image_ids` + `action` = `add` / `remove`） |
| DELETE | `/api/albums/:albumid` | 登录 | 删除相册（相册内图片自动解除归属） |

### 标签

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/tags` | 登录 | 标签列表 |
| POST | `/api/tags` | 登录 | 创建标签（JSON：name/color，同名标签拒绝） |
| POST | `/api/images/batch/tag` | 登录 | 批量打标/解绑（JSON：`file_ids` + `tags` + `action` = `add` / `remove`） |
| GET | `/api/tags/:tagid/images` | 登录 | 该标签下的全部图片 |

### 统计

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/stats` | 登录 | 统计大盘（totalImages/totalSize/totalAlbums/totalTags/quotaLimit/quotaUsedPercentage） |

## 🚀 快速开始

### 前置要求

- Node.js 18+（含 npm）
- Rust stable 工具链，含 `wasm32-unknown-unknown` 目标（仓库内 `rust-toolchain.toml` 已声明，`rustup target add wasm32-unknown-unknown` 可手动补充）
- Cloudflare 账号（免费版即可）
- 一个 Telegram Bot Token（通过 @BotFather 创建）与一个用于存储的频道/群组 Chat ID

### 本地开发

```bash
# 1. 安装根目录依赖
npm install

# 2. 安装前端依赖
cd client && npm install && cd ..

# 3. 在 wrangler.toml 中填入自己的环境变量与 D1 绑定（见"配置说明"）

# 4. 启动本地 Workers 开发服务器
npx wrangler dev --port 8787
```

前端在 `localhost` 下会自动请求 `http://127.0.0.1:8787`（见 `client/src/services/api.ts`）；如需单独以 Vite HMR 调试前端，可运行 `npm run dev:client`。首次编译需下载 crates 依赖，国内网络可在 `.cargo/config.toml` 中已配置的 `rsproxy.cn` 稀疏镜像源加速。

### 常用脚本（package.json）

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 `wrangler dev` |
| `npm run dev:client` | 前端 Vite 开发服务器 |
| `npm run build` | 构建前端（client 内 npm install + build） |
| `npm run deploy` | `wrangler deploy` 部署 |
| `npm run build:deploy` | 运行根目录 `build-and-deploy.js` 一键构建并部署 |
| `npm run create-kv` | 运行根目录 `create-kv.js`（历史遗留脚本，见下） |
| `npm run setup` | `create-kv` + `build:deploy` 组合（历史遗留） |

### 根目录工具脚本

- `build-and-deploy.js` — 一键脚本：构建 `client` 前端 → 检查 `public/index.html` → 执行 `npx wrangler deploy`。注意其依赖根目录 `public/` 目录，属历史遗留实现，当前项目的正式构建流程以 `wrangler.toml` 的 `[build]` 命令为准
- `deploy-cf.js` — 部署脚本：安装依赖 → 升级 `wrangler@latest` → `npx wrangler deploy`
- `create-kv.js` — 历史遗留脚本：检查 wrangler 登录状态，自动创建 `img_url`、`users` 两个 KV 命名空间并回写 `wrangler.toml`。当前后端已改用 D1 + Cache API，不再需要 KV 绑定，仅保留以备兼容

## ☁️ 部署

### 自动构建（wrangler.toml）

`wrangler.toml` 的 `[build]` 已配置跨平台构建脚本，Worker 部署前会自动执行：

```
node build-platform.js
```

`build-platform.js` 依次完成：检测/自动安装 Rust 工具链（Linux 云端 CI 无 cargo 时自动 `rustup` 安装并注入 PATH）→ 安装并构建前端（`npm --prefix client install && npm run build`，输出到 `client/dist`）→ 安装 `worker-build` → 将 Rust 源码编译为 WASM 输出到 `build/`（`main = "build/index.js"`）。前端静态资源通过 Workers Sites 配置 `[site] bucket = "./client/dist"` 一并托管。

### 方式一：Cloudflare 绑定 GitHub（推荐）

在 Cloudflare 控制台将本仓库与 Worker（或 Pages）绑定，启用 Git 自动构建后，每次推送到仓库即触发上述构建命令并自动部署。首次需在云端完成 D1 绑定与环境变量/Secret 配置（见下）。

### 方式二：本地命令行部署

```bash
npx wrangler login
npx wrangler d1 create image        # 首次创建 D1 数据库，将返回的 database_id 填入 wrangler.toml
npx wrangler deploy
```

### 环境变量与 Secret

| 变量 | 类型 | 说明 |
|------|------|------|
| `TG_Bot_Token` | Secret | Telegram Bot Token，用于上传/读取/删除频道消息 |
| `TG_Chat_ID` | Secret | 存储图片的 Telegram 频道/群组 Chat ID |
| `JWT_SECRET` | Secret | JWT 签名密钥，部署前务必更换为随机强密钥 |

生产环境请使用 `npx wrangler secret put <变量名>` 或 Cloudflare 控制台配置为 Secret，避免明文提交到仓库；本地开发可临时写入 `wrangler.toml` 的 `[vars]` 区。本文档不展示任何真实密钥值。

## ⚙️ 配置说明

### 环境变量

| 变量 | 必填 | 用途 |
|------|------|------|
| `TG_Bot_Token` | 是 | Telegram Bot Token（BotFather 创建），Worker 调用 Bot API 的凭证 |
| `TG_Chat_ID` | 是 | 目标频道/群组的 Chat ID，所有图片经 `sendDocument` 存入此处 |
| `JWT_SECRET` | 是 | JWT（HS256）签名密钥，泄露会导致 Token 可伪造，请使用高强度随机值 |
| `FILE_STATUS_CHECK` | 否 | 状态管理开关：默认关闭（纯图床模式，访问路径零 D1）；设为 `on` 启用封禁/回收站拦截与点击统计 |

### D1 数据库绑定（wrangler.toml）

```toml
[[d1_databases]]
binding = "DB"                 # 代码中通过 env.d1("DB") 访问
database_name = "image"
database_id = "<你的 D1 数据库 ID>"
```

数据表（users / albums / images / tags / image_tags）由 Worker 启动时自动创建，无需手工建表。

### 其他

- `.cargo/config.toml` — 配置了 `rsproxy.cn` 稀疏索引镜像，加速国内 crates 依赖下载
- `rust-toolchain.toml` — 固定 Rust stable 工具链与 `wasm32-unknown-unknown` 编译目标
- `Cargo.toml` — 后端依赖：`worker 0.8`（含 d1 特性）、`serde/serde_json`、`sha2`、`hmac`、`base64`、`uuid`

## 📄 许可证

[AGPL-3.0-with-Commons-Clause](LICENSE)

本项目采用 GNU Affero General Public License v3.0 并附加 Commons Clause 限制：

- 修改或衍生作品必须以相同许可证开源；通过网络提供服务同样视为分发，须开放源码
- **禁止商业售卖**：不得将本软件整体或实质性地用于收费产品/服务；商业使用请联系项目作者获取商业许可

---

<div align="center">

如果这个项目对你有帮助，请给个 ⭐️ Star 支持一下！

</div>
