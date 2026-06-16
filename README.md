# my-frontend-project

Small Vue 3 + Vite frontend for a Go backend. Focused on a community/post workflow with user accounts, Twemoji support, avatar cropping and a minimal admin area.

Languages: [中文](README.zh-CN.md) / English

Summary
- Lightweight Vue 3 application using Vite, Element Plus and Vue Router. Built for local development and easy deployment behind an API server.

Highlights
- Pages: login/register, welcome, community feed, post detail, profile, dashboard, admin
- Features: avatar cropping, emoji (Twemoji), favorites, comments, admin user management
- Tech: Vue 3, Vite, Element Plus, vue-cropper, twemoji

Quick start

Prerequisites
- Node.js: ^20.19.0 or >=22.12.0
- A running backend API (default: `http://localhost:8080`)

Install

```bash
npm install
```

Environment
- Copy and edit environment file if you need to change the API base URL:

```bash
cp .env.example .env
# then set VITE_API_BASE_URL=http://localhost:8080 (or your backend URL)
```

Scripts
- `npm run dev` — start dev server (Vite)
- `npm run build` — build for production
- `npm run preview` — locally preview production build

Run (development)

```bash
npm run dev
# open http://localhost:5173
```

Project structure (important files)

```
.
├─ public/                      # static assets
├─ src/
│  ├─ assets/                   # css, images
│  ├─ components/               # reusable components
│  ├─ utils/                    # helpers (imageTools, twemoji catalog...)
│  ├─ views/                    # route views
│  ├─ api.js                    # api wrapper / auth handling
│  ├─ App.vue
│  ├─ main.js                   # app bootstrap (Element Plus, router)
│  └─ router.js
├─ index.html
├─ vite.config.js
├─ package.json
└─ .env.example
```

Backend API (used endpoints)
- Authentication: `/api/login`, `/api/register`
- Account recovery: `/api/send-code`, `/api/recover-account`, `/api/reset-password`
- Posts & comments: `/api/posts`, `/api/post-detail`, `/api/create-post`, `/api/create-comment`, `/api/delete-post`, `/api/delete-comment`
- Favorites: `/api/toggle-favorite`, `/api/my-favorites`
- Admin: `/api/users`, `/api/delete-user`, `/api/update-admin-profile`

How auth works
- After login the backend returns a token. The frontend stores user info (and token) in `localStorage.user`.
- `src/api.js` attaches `Authorization: Bearer <token>` automatically to requests.

Developer notes
- Emoji list and picker are powered by Twemoji; emoji data is generated and filtered in `src/utils/twemojiCatalog.js`.
- Admin entry is a hidden UI trigger; the backend enforces `role = 2` for admin operations.

Contributing
- This project is prepared as a learning/demo repo. Feel free to open issues or PRs for bugs and improvements.

License
- No license file included. Use for learning purposes.

Credits
- Built with assistance from AI (some code generated or suggested).

