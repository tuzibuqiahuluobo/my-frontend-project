# my-frontend-project

> Languages: [中文](README.zh-CN.md) / English

A Vue 3 frontend for the Go backend. It currently includes login/register, email recovery flows, a welcome page, community posts, Twemoji reactions, post details, personal favorites, profile editing, avatar cropping, and a super-admin dashboard.

## Key Facts

- Framework: Vue 3 + Vite
- UI library: Element Plus
- Router: Vue Router
- API wrapper: `src/api.js`
- Avatar cropping: vue-cropper
- Emoji rendering: `twemoji`

## Quick Start

### Prerequisites

- Node.js >= 20.19.0 or >= 22.12.0
- Backend running at `http://localhost:8080`

### Install

```bash
npm install
```

### Configure Backend URL

By default, the frontend calls:

```text
http://localhost:8080
```

If needed, copy `.env.example` to `.env` and change:

```text
VITE_API_BASE_URL=http://localhost:8080
```

### Run

```bash
npm run dev
# open http://localhost:5173
```

### Build

```bash
npm run build
npm run preview
```

## Current Routes

| Path | Page | Access |
|------|------|--------|
| `/` | Redirects to `/login` | Public |
| `/login` | Login / register | Public |
| `/welcome` | Welcome page | Requires login |
| `/main/community` | Community | Requires login |
| `/main/community/post/:id` | Post detail | Requires login |
| `/main/settings/profile` | Profile settings | Requires login |
| `/main/dashboard` | Personal dashboard, creative space, and favorites | Requires login |
| `/admin` | Super-admin dashboard | Requires login and `role = 2` |

Compatibility note: the old `/main/profile` path redirects to `/main/settings/profile`.

## Authentication Flow

After login, the backend returns a `token`. The frontend stores the user payload in `localStorage` under the `user` key.

`src/api.js` automatically sends:

```text
Authorization: Bearer <token>
```

This keeps page components simpler because they can call `apiRequest()` instead of manually handling the token.

## Backend APIs Used

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/send-code` | Send registration verification code |
| `POST` | `/api/recover-account` | Recover username by email verification code |
| `POST` | `/api/reset-password` | Reset password by email verification code |
| `POST` | `/api/register` | Register |
| `POST` | `/api/login` | Login |
| `POST` | `/api/update` | Update profile |
| `GET` | `/api/posts` | List posts |
| `GET` | `/api/post-detail?id=<id>` | Read one post with comments |
| `POST` | `/api/create-post` | Create post |
| `POST` | `/api/delete-post` | Delete post |
| `POST` | `/api/create-comment` | Create comment |
| `POST` | `/api/delete-comment` | Delete comment |
| `POST` | `/api/toggle-favorite` | Favorite / unfavorite |
| `GET` | `/api/my-favorites` | List current user's favorite posts |
| `GET` | `/api/users` | Admin user list |
| `POST` | `/api/delete-user` | Admin delete user |
| `POST` | `/api/update-admin-profile` | Update super-admin username, password, avatar, or email |

## Project Layout

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

## Development Notes

- The community post editor uses Twemoji for the emoji picker. The picker list is generated from Unicode ranges and filtered by `twemoji-parser`, then paginated in the UI.
- If your terminal says `npm` cannot be found, Node/npm is not available in the current PATH.
- The admin entry is hidden in the login page UI, but real permission is still enforced by the backend through `role = 2`.

## License

This is a learning project. No license file has been added yet.

## AI Attribution

Approximately 70% of this project was written with AI assistance.
