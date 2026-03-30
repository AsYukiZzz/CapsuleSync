# CapsuleSync - 文件版本控制与审计系统

CapsuleSync 是一个基于 Cloudflare 生态（Pages, D1, KV, R2）构建的轻量级、高安全性的文件版本控制与审计系统。该系统强制要求版本留痕，提供任意两版本的文本 Diff 功能，并对用户操作进行严格审计。

## 🌟 核心功能

- **强制版本控制**：上传文件或在线保存编辑时，强制生成新版本，历史版本不可篡改（Immutable）。
- **文件在线编辑**：支持针对 `json`、`txt`、`md` 等纯文本格式的在线预览与编辑。
- **文本 Diff 对比**：内置类 Git 的文本对比功能，随时选取同一文件的任意两个历史版本查看修改细节。
- **完整操作审计**：记录从登录/登出、文件访问、版本创建、Diff 查看等所有核心操作，提供独立的审计日志页面，并支持导出。
- **无服务器架构**：基于 Cloudflare Pages Functions 实现 API 路由，完全 Serverless。
- **自动文件校验**：文件上传时，服务端（Functions）会即时计算并记录 SHA-256 哈希值，确保文件完整性。

## 🏗 技术栈

- **前端**：React 18, TypeScript, Vite, TailwindCSS 3, React Router DOM, Zustand (状态管理)
- **后端/API**：Cloudflare Pages Functions
- **数据库**：Cloudflare D1 (SQLite) - `capsulesync_db`
- **对象存储**：Cloudflare R2 - `capsulesync-assets`
- **动态配置**：Cloudflare KV - `capsulesync_config`

---

## 🚀 部署指南

### 准备工作

1. 确保已安装 Node.js (建议 v18+)
2. 确保已安装 Wrangler CLI (`npm install -g wrangler`)
3. 登录 Cloudflare 账号：`wrangler login`

### 1. 创建 Cloudflare 资源

在 Cloudflare 控制台或使用命令行创建所需资源：

**创建 D1 数据库**
```bash
wrangler d1 create capsulesync_db
```
*记录输出的 `database_id`，稍后将填入 `wrangler.toml`*

**创建 R2 存储桶**
```bash
wrangler r2 bucket create capsulesync-assets
```

**创建 KV 命名空间**
```bash
wrangler kv:namespace create capsulesync_config
```
*记录输出的 `id`，稍后将填入 `wrangler.toml`*

### 2. 配置项目

修改项目根目录的 `wrangler.toml` 文件，填入你刚刚创建的资源 ID：

```toml
name = "capsulesync"
compatibility_date = "2024-03-20"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "capsulesync_db"
database_id = "<你的-d1-database-id>"

[[kv_namespaces]]
binding = "CONFIG"
id = "<你的-kv-namespace-id>"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "capsulesync-assets"
```

### 3. 初始化数据库表结构

将 `migrations/0001_init.sql` 中的表结构应用到你的 D1 数据库：

**线上环境部署表结构：**
```bash
wrangler d1 execute capsulesync_db --remote --file=./migrations/0001_init.sql
```

**本地开发环境部署表结构：**
```bash
wrangler d1 execute capsulesync_db --local --file=./migrations/0001_init.sql
```

### 4. 设置环境变量 (JWT 密钥)

系统需要一个 `AUTH_SECRET` 用于签发 JWT Token。

**线上环境设置：**
```bash
echo "your-super-secret-key-change-me" | wrangler pages secret put AUTH_SECRET
```

**本地环境设置：**
在项目根目录创建 `.dev.vars` 文件：
```env
AUTH_SECRET="local-dev-secret-key-change-me"
```

---

## 💻 线下本地开发 (Local Development)

由于项目依赖 Cloudflare Functions 和绑定资源，普通的 `npm run dev`（仅启动 Vite）无法提供完整的后端 API 支持。请使用 Wrangler 启动本地模拟环境。

1. 安装依赖：
   ```bash
   npm install
   ```

2. 构建前端静态文件（Wrangler Pages Dev 需要先有 dist 目录或代理前端）：
   ```bash
   npm run build
   ```

3. 启动全栈本地开发服务器：
   ```bash
   npm run preview
   # 这会执行：wrangler pages dev dist --compatibility-date=2024-03-20
   ```

   *或者，如果你希望同时热更新前端和后端，可以在两个终端中运行：*
   终端 1: `npm run dev` (启动 Vite 在 5173)
   终端 2: `wrangler pages dev --proxy 5173` (Wrangler 代理前端并提供 Functions API)

4. 访问 `http://localhost:8788` 进行开发测试。本地的 D1、KV 和 R2 数据会保存在 `.wrangler` 目录下。

---

## ☁️ 线上生产部署 (Production Deployment)

### 方式一：使用 Wrangler CLI 直接部署 (推荐)

1. 构建生产版本：
   ```bash
   npm run build
   ```

2. 部署到 Cloudflare Pages：
   ```bash
   npm run deploy
   # 这会执行：wrangler pages deploy dist
   ```

3. 部署完成后，在 Cloudflare 控制台的 Pages 项目设置中，确保已正确绑定 D1 (`DB`)、KV (`CONFIG`) 和 R2 (`BUCKET`)。

### 方式二：通过 GitHub 持续集成部署

1. 将代码推送到 GitHub 仓库。
2. 在 Cloudflare 控制台 -> Pages -> Connect to Git。
3. 选择该仓库，构建设置如下：
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 在 **Environment variables** 中添加 `AUTH_SECRET`。
5. 在 **Functions -> Bindings** 中，手动添加：
   - D1 绑定：名称 `DB`，选择 `capsulesync_db`
   - KV 绑定：名称 `CONFIG`，选择 `capsulesync_config`
   - R2 绑定：名称 `BUCKET`，选择 `capsulesync-assets`
6. 保存并部署。

---

## 📚 目录结构说明

```
├── functions/             # Cloudflare Pages Functions 后端 API
│   ├── api/
│   │   └── [[path]].ts    # 核心 API 路由与业务逻辑处理
│   └── _middleware.ts     # (可选) 全局中间件
├── migrations/            # D1 数据库 SQL 迁移脚本
├── src/                   # React 前端代码
│   ├── components/        # 可复用 UI 组件 (Button, Modal 等)
│   ├── pages/             # 页面组件 (Login, Dashboard, DocDetail, Audit)
│   ├── stores/            # Zustand 状态管理 (authStore)
│   └── utils/             # 工具函数 (API 请求封装等)
├── public/                # 静态资源 (包括 SPA 路由所需的 _redirects)
├── wrangler.toml          # Cloudflare 资源绑定与配置
└── README.md              # 项目文档
```

## 🔒 默认用户系统说明

本项目目前内置了简单的邮箱+密码注册/登录系统（JWT 鉴权）。
- 用户注册后默认为 `user` 角色。
- 若需提升为管理员 (`admin`) 角色，需直接在 D1 数据库中执行 SQL 修改：
  ```sql
  UPDATE users SET role = 'admin' WHERE email = 'xxx@xxx.com';
  ```
  *(本地使用 `wrangler d1 execute capsulesync_db --local --command="..."`)*
  管理员角色可以查看所有用户的操作审计记录。
