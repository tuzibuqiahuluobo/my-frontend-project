# my-frontend-project

**Languages:** [English](README.md) | [中文](README.zh-CN.md)

A Vue 3 frontend for user authentication, personal dashboard, and profile management. Built as part of a full-stack learning project, it connects to a backend API running on `localhost:8080`.

**Repository:** [github.com/tuzibuqiahuluobo/my-frontend-project](https://github.com/tuzibuqiahuluobo/my-frontend-project)

## Overview

This project is a single-page application (SPA) built with Vue 3 and Vite. It provides login/registration, a personal center dashboard, and a profile editor with avatar cropping. User sessions are persisted in `localStorage` after successful login.

## Features

- **Login & Register** — Toggle between login and registration on a single page, with form validation and loading states
- **Session persistence** — Stores `uid`, `username`, and `avatar` in `localStorage` after login
- **Personal Dashboard** — Displays user info, logout, link to profile settings, and project showcase cards
- **Profile Editor** — Update username, change password (minimum 6 characters), upload and crop avatar (max 2 MB, JPG/PNG)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Vue 3](https://vuejs.org/) |
| Build Tool | [Vite 8](https://vite.dev/) |
| Routing | [Vue Router 5](https://router.vuejs.org/) |
| UI Library | [Element Plus](https://element-plus.org/) |
| Image Cropping | [vue-cropper](https://github.com/xyxiao001/vue-cropper) |

## Prerequisites

- **Node.js** `^20.19.0` or `>=22.12.0`
- **Backend API** running at `http://localhost:8080` (required for login, register, and profile updates)

> **Recommended IDE:** [VS Code](https://code.visualstudio.com/) + [Vue - Official](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Getting Started

### Install dependencies

```sh
npm install
```

### Development (hot-reload)

```sh
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

### Production build

```sh
npm run build
```

### Preview production build

```sh
npm run preview
```

## Project Structure

```
my-frontend-project/
├── public/                 # Static assets
├── src/
│   ├── assets/             # Global styles and images
│   ├── views/
│   │   ├── Login.vue       # Login & registration page
│   │   ├── Dashboard.vue   # Personal center
│   │   └── Profile.vue     # Profile editor (avatar crop, username, password)
│   ├── App.vue             # Root component
│   ├── main.js             # App entry (Vue, Router, Element Plus)
│   └── router.js           # Route definitions
├── index.html
├── vite.config.js
└── package.json
```

## API Integration

The frontend communicates with a backend at `http://localhost:8080`. Ensure the backend is running before using login or profile features.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/login` | Authenticate user; returns `uid`, `avatar`, and message |
| `POST` | `/api/register` | Create a new account |
| `POST` | `/api/update` | Update profile (`uid`, `username`, `avatar`) |

**Request body (login / register):**

```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Request body (update):**

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
