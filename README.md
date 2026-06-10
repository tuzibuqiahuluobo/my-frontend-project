# my-frontend-project

**Languages:** [English](README.md) | [中文](README.zh-CN.md)

A Vue 3 frontend for user authentication, personal dashboard, and profile management. Built as part of a full-stack learning project, it connects to a backend API running on `localhost:8080`.

**Repository:** [github.com/tuzibuqiahuluobo/my-frontend-project](https://github.com/tuzibuqiahuluobo/my-frontend-project)
# my-frontend-project

![build](https://img.shields.io/badge/build-passing-brightgreen) ![node](https://img.shields.io/badge/node-%3E%3D20-blue) ![license](https://img.shields.io/badge/license-UNLICENSED-lightgrey)

Languages: English | 中文

A lightweight Vue 3 frontend providing user authentication, a personal dashboard, and profile editing with avatar cropping. This is a learning/demo frontend intended to be used with a backend API (see API section).

Key facts

- Framework: Vue 3 + Vite
- UI library: Element Plus
- Routing: Vue Router
- Avatar cropping: vue-cropper

AI authorship

- Approximately 70% of this repository's code was produced with AI assistance (for example GitHub Copilot / ChatGPT).

Quick start

Prerequisites

- Node.js >= 20.19.0 (or >= 22.12.0)
- Backend API (recommended) running at `http://localhost:8080`

Install dependencies

```bash
npm install
```

Run locally (development)

```bash
npm run dev
# then open http://localhost:5173
```

Build and preview

```bash
npm run build
npm run preview
```

Project layout

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

Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview build locally

API (expected)

The frontend expects these backend endpoints at `http://localhost:8080`:

- `POST /api/login` — body `{ username, password }` → returns `{ uid, username, avatar }`
- `POST /api/register` — create account
- `POST /api/update` — body `{ uid, username, avatar }` → update profile

Routes overview

- `/login` — login & register
- `/dashboard` — personal center (requires session)
- `/profile` — profile editor (requires session)

Localization

See `README.zh-CN.md` for a Chinese-localized README.

Contributing

If you'd like to contribute, open an issue or PR. Consider adding `CONTRIBUTING.md` and a license if you intend to accept external contributions.

Contact

Open an issue in the repository for questions or requests.

---
_Updated to improve clarity and add AI authorship disclosure._
```json
{
  "uid": 1,
  "username": "new_username",
  "avatar": "base64_image_data"
}
```

## Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Redirects to `/login` | — |
| `/login` | Login / Register | Public |
| `/dashboard` | Personal Center | Requires `localStorage` session |
| `/profile` | Edit Profile | Requires `localStorage` session |

Unauthenticated users accessing `/dashboard` or `/profile` are redirected to `/login`.

## License

This is a learning project. No license file has been added yet.
