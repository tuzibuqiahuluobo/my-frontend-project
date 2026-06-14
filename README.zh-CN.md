# my-frontend-project

> 语言：中文 / [English](README.md)

这是一个基于 Vue 3 的前端项目，配合 Go 后端使用。当前功能包括登录注册、账号/密码找回、欢迎页、社区广场、Twemoji 表情、帖子详情、个人收藏、个人资料修改、头像裁剪和超级管理员后台。

## 核心信息

- 框架：Vue 3 + Vite
- UI：Element Plus
- 路由：Vue Router
- 请求方式：浏览器 `fetch`
- 统一 API 封装：`src/api.js`
- 头像裁剪：vue-cropper
- 表情渲染：`twemoji`

## 快速开始

### 环境要求

- Node.js >= 20.19.0（或 >= 22.12.0）
- 后端运行在 `http://localhost:8080`

### 安装依赖

```bash
npm install
```

### 配置后端地址

项目默认请求：

```text
http://localhost:8080
```

如果后端地址不同，可以复制 `.env.example` 为 `.env`，然后修改：

```text
VITE_API_BASE_URL=http://localhost:8080
```

### 开发运行

```bash
npm run dev
# 打开 http://localhost:5173
```

### 构建与预览

```bash
npm run build
npm run preview
```

## 当前路由

| 路径 | 页面 | 访问要求 |
|------|------|----------|
| `/` | 自动跳转到 `/login` | 无 |
| `/login` | 登录 / 注册 | 未登录也可访问 |
| `/welcome` | 登录后的欢迎页 | 需要登录 |
| `/main/community` | 社区广场 | 需要登录 |
| `/main/community/post/:id` | 帖子详情页 | 需要登录 |
| `/main/settings/profile` | 个人资料设置 | 需要登录 |
| `/main/dashboard` | 个人中心 / 创意空间 / 我的收藏 | 需要登录 |
| `/admin` | 超级管理员后台 | 需要登录且 `role = 2` |

兼容说明：旧路径 `/main/profile` 会自动重定向到 `/main/settings/profile`。

## 前端登录态

登录成功后，后端会返回 `token`。前端会把用户信息和 token 存到 `localStorage` 的 `user` 字段中。

之后调用后端接口时，`src/api.js` 会自动加上请求头：

```text
Authorization: Bearer <token>
```

这意味着页面组件不用每次手动处理 token，只需要调用统一的 `apiRequest()`。

## 后端接口

前端当前使用这些接口：

| 方法 | 路径 | 用途 |
|------|------|------|
| `POST` | `/api/send-code` | 发送注册验证码 |
| `POST` | `/api/recover-account` | 通过邮箱验证码找回账号 |
| `POST` | `/api/reset-password` | 通过邮箱验证码重置密码 |
| `POST` | `/api/register` | 注册 |
| `POST` | `/api/login` | 登录 |
| `POST` | `/api/update` | 修改资料 |
| `GET` | `/api/posts` | 获取帖子 |
| `GET` | `/api/post-detail?id=<id>` | 获取单条帖子详情和评论 |
| `POST` | `/api/create-post` | 发布帖子 |
| `POST` | `/api/delete-post` | 删除帖子 |
| `POST` | `/api/create-comment` | 发表评论 |
| `POST` | `/api/delete-comment` | 删除评论 |
| `POST` | `/api/toggle-favorite` | 收藏 / 取消收藏 |
| `GET` | `/api/my-favorites` | 获取当前用户收藏的帖子 |
| `GET` | `/api/users` | 管理员获取用户列表 |
| `POST` | `/api/delete-user` | 管理员删除用户 |
| `POST` | `/api/update-admin-profile` | 修改超级管理员账号、密码、头像或邮箱 |

## 目录结构

```text
my-frontend/
├─ public/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ utils/
│  ├─ views/
│  ├─ api.js
│  ├─ App.vue
│  ├─ main.js
│  └─ router.js
├─ index.html
├─ vite.config.js
├─ package.json
└─ .env.example
```

## 开发提醒

- 社区发帖框使用 Twemoji 表情选择器；表情列表由 Unicode 范围生成，再通过 `twemoji-parser` 筛选，并在页面中分页展示。
- 如果命令行提示找不到 `npm`，说明当前系统环境没有把 Node/npm 加入 PATH，需要先修复本机 Node 环境。
- 管理员入口是登录页标题连续点击触发的隐藏入口，真正权限仍由后端 `role = 2` 校验。

## 贡献与许可

本项目为学习用途，尚未添加 LICENSE 文件。

## AI 协作声明

约 70% 的代码由 AI 协助生成。

## 线上部署提示

部署到服务器前，请复制并修改线上环境变量模板：

```bash
cp .env.production.example .env.production
```

将其中的 `VITE_API_BASE_URL` 改成你的 HTTPS 域名，例如：

```text
VITE_API_BASE_URL=https://example.com
```

完整的阿里云轻量服务器部署步骤在后端仓库的 `deploy/README.zh-CN.md` 中。
