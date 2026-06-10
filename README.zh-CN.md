# my-frontend-project

![build](https://img.shields.io/badge/build-passing-brightgreen) ![node](https://img.shields.io/badge/node-%3E%3D20-blue) ![license](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

语言：中文 / English

基于 Vue 3 的轻量前端，提供用户认证、个人中心与资料编辑（支持头像裁剪）。作为学习/演示用途，需配合后端 API 使用（详见 API 部分）。

核心信息

- 框架：Vue 3 + Vite
- UI：Element Plus
- 路由：Vue Router
- 头像裁剪：vue-cropper

AI 协作声明

- 约 70% 的代码由 AI 协助生成（例如 GitHub Copilot / ChatGPT）。

快速开始

环境要求

- Node.js >= 20.19.0（或 >= 22.12.0）
- 建议后端运行在 `http://localhost:8080`

安装依赖

```bash
npm install
```

开发运行

```bash
npm run dev
# 打开 http://localhost:5173
```

构建与预览

```bash
npm run build
npm run preview
```

目录结构（简）

```
my-frontend-project/
├─ public/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ views/
│  ├─ App.vue
│  ├─ main.js
│  └─ router.js
├─ index.html
├─ vite.config.js
└─ package.json
```

后端接口（前端期望）

前端期望在 `http://localhost:8080` 提供如下接口：

- `POST /api/login` — body `{ username, password }`，返回 `{ uid, username, avatar }`
- `POST /api/register` — 注册
- `POST /api/update` — body `{ uid, username, avatar }`，更新资料

路由概览

- `/login`：登录 / 注册
- `/dashboard`：个人中心（需登录）
- `/profile`：编辑资料（需登录）

贡献与许可

欢迎通过 Issue 或 PR 贡献。若需要接受外部贡献，建议补充 `CONTRIBUTING.md` 与 LICENSE 文件。

更多信息

请在仓库中打开 Issue 以获得帮助或提出建议。

---
_已更新：改进快速上手、增加 AI 协作声明。_
