# my-frontend-project

简介
- 基于 Vue 3 + Vite 的精简前端，搭配 Go 后端。主要面向社区帖子场景，支持用户注册、表情、头像裁剪与简单管理功能。

语言：中文 / [English](README.md)

主要技术栈
- Vue 3, Vite, Element Plus, Vue Router
- 其他：vue-cropper（头像裁剪）、twemoji（表情渲染）

快速开始

环境要求
- Node.js: ^20.19.0 或 >=22.12.0
- 后端 API（默认）：`http://localhost:8080`

安装依赖

```bash
npm install
```

配置环境变量
- 如需修改后端地址，复制并编辑环境文件：

```bash
cp .env.example .env
# 修改 VITE_API_BASE_URL=http://localhost:8080
```

常用脚本
- `npm run dev` — 启动开发服务器（Vite）
- `npm run build` — 生产构建
- `npm run preview` — 本地预览构建结果

运行（开发）

```bash
npm run dev
# 打开 http://localhost:5173
```

目录（重点）

```
.
├─ public/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ utils/                # 如 imageTools.js, twemojiCatalog.js
	│  ├─ views/
│  ├─ api.js
	├─ App.vue
	├─ main.js
	└─ router.js
├─ index.html
├─ vite.config.js
├─ package.json
└─ .env.example
```

后端接口（项目使用）
- 登录/注册：`/api/login`, `/api/register`
- 找回与重置：`/api/send-code`, `/api/recover-account`, `/api/reset-password`
- 帖子与评论：`/api/posts`, `/api/post-detail`, `/api/create-post`, `/api/create-comment`, `/api/delete-post`, `/api/delete-comment`
- 收藏：`/api/toggle-favorite`, `/api/my-favorites`
- 管理：`/api/users`, `/api/delete-user`, `/api/update-admin-profile`

登录态说明
- 登录成功后后端返回 `token`，前端保存在 `localStorage.user`。
- `src/api.js` 会自动在请求头添加 `Authorization: Bearer <token>`。

开发提示
- 表情（Twemoji）数据由 `src/utils/twemojiCatalog.js` 生成并分页展示。
- 管理员入口为登录页的隐藏触发，后端以 `role = 2` 强校验权限。

贡献与许可
- 本项目为学习演示用途，未添加许可证。欢迎 issue 或 PR。

致谢
- 项目部分代码与方案由 AI 协助生成。

