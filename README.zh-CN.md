# my-frontend-project

**语言：** [English](README.md) | [中文](README.zh-CN.md)

基于 Vue 3 的用户认证、个人中心与资料管理前端。作为全栈学习项目的一部分，需配合运行在 `localhost:8080` 的后端 API 使用。

**仓库地址：** [github.com/tuzibuqiahuluobo/my-frontend-project](https://github.com/tuzibuqiahuluobo/my-frontend-project)

## 项目简介

本项目是基于 Vue 3 与 Vite 构建的单页应用（SPA），提供登录/注册、个人中心仪表盘，以及支持头像裁剪的资料编辑功能。登录成功后，用户信息会持久化存储在浏览器的 `localStorage` 中。

## 功能特性

- **登录与注册** — 同一页面切换登录/注册模式，含表单校验与加载状态
- **会话持久化** — 登录成功后将 `uid`、`username`、`avatar` 写入 `localStorage`
- **个人中心** — 展示用户信息、退出登录、跳转资料设置，以及创意项目展示卡片
- **资料编辑** — 修改用户名、更改密码（至少 6 位）、上传并裁剪头像（最大 2 MB，支持 JPG/PNG）

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Vue 3](https://vuejs.org/) |
| 构建工具 | [Vite 8](https://vite.dev/) |
| 路由 | [Vue Router 5](https://router.vuejs.org/) |
| UI 组件库 | [Element Plus](https://element-plus.org/) |
| 图片裁剪 | [vue-cropper](https://github.com/xyxiao001/vue-cropper) |

## 环境要求

- **Node.js** `^20.19.0` 或 `>=22.12.0`
- **后端 API** 运行在 `http://localhost:8080`（登录、注册、资料更新均依赖后端）

> **推荐 IDE：** [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 快速开始

### 安装依赖

```sh
npm install
```

### 开发模式（热更新）

```sh
npm run dev
```

开发服务器默认运行在 `http://localhost:5173`。

### 生产构建

```sh
npm run build
```

### 预览生产构建

```sh
npm run preview
```

## 目录结构

```
my-frontend-project/
├── public/                 # 静态资源
├── src/
│   ├── assets/             # 全局样式与图片
│   ├── views/
│   │   ├── Login.vue       # 登录与注册页
│   │   ├── Dashboard.vue   # 个人中心
│   │   └── Profile.vue     # 资料编辑（头像裁剪、用户名、密码）
│   ├── App.vue             # 根组件
│   ├── main.js             # 应用入口（Vue、Router、Element Plus）
│   └── router.js           # 路由配置
├── index.html
├── vite.config.js
└── package.json
```

## 后端接口

前端通过 `http://localhost:8080` 与后端通信。使用登录或资料编辑功能前，请确保后端已启动。

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST` | `/api/login` | 用户登录；返回 `uid`、`avatar` 及提示信息 |
| `POST` | `/api/register` | 注册新账号 |
| `POST` | `/api/update` | 更新资料（`uid`、`username`、`avatar`） |

**请求体（登录 / 注册）：**

```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**请求体（更新资料）：**

```json
{
  "uid": 1,
  "username": "new_username",
  "avatar": "base64_image_data"
}
```

## 路由说明

| 路径 | 页面 | 访问权限 |
|------|------|----------|
| `/` | 重定向至 `/login` | — |
| `/login` | 登录 / 注册 | 公开 |
| `/dashboard` | 个人中心 | 需 `localStorage` 会话 |
| `/profile` | 编辑资料 | 需 `localStorage` 会话 |

未登录用户访问 `/dashboard` 或 `/profile` 时，会自动重定向到 `/login`。

## 许可证

本项目为学习用途，尚未添加 LICENSE 文件。
