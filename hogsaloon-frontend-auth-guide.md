# Hogsaloon — Frontend Auth Code-Along Guide
> **Stack:** Vite · React · TypeScript · React Router · Zustand · Axios  
> **Scope:** Startup profile check, cookie-based auth, protected routing  
> **Time:** ~1 hour

---

## Overview

```
User opens app
  └── AuthGate → GET /profile
        ├── 200 → store user in Zustand → render MainPage
        └── 401 → navigate to /login  → render LoginPage
```

---

## 0 · Prerequisites

| Tool | Check |
|---|---|
| Vite React project generated | `npm run dev` works |
| Tailwind installed | className styles render |
| React Router installed | `react-router-dom` in package.json |

Install the remaining dependencies:

```bash
npm install zustand axios
```

---

## 1 · Target Folder Structure

Your existing files (`Layout.tsx`, `Header.tsx`, `Footer.tsx`, `App.tsx`) stay. Everything new fits around them.

```
src/
├── api/
│   └── axios.ts            ← central Axios instance
├── store/
│   └── authStore.ts        ← Zustand user cache
├── components/
│   └── AuthGate.tsx        ← startup profile check
├── layout/
│   ├── Layout.tsx          ← already exists
│   ├── Header.tsx          ← already exists
│   └── Footer.tsx          ← already exists
├── pages/
│   ├── LoginPage.tsx       ← new (stub for now)
│   └── MainPage.tsx        ← new (stub for now)
└── App.tsx                 ← update routing here
```

---

## 2 · Axios Instance

One central instance with `withCredentials: true`. This ensures the httpOnly cookie the backend sets is automatically attached to every request — you never touch it manually.

📄 `src/api/axios.ts`
```ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true, // sends the httpOnly cookie on every request
});

export default api;
```

> **Never** use `localStorage` to store the JWT. The backend manages the cookie — the frontend just needs `withCredentials: true`.

---

## 3 · Zustand Auth Store

This is your in-memory user cache. The `User` type mirrors the backend schema exactly. `isLoading` starts as `true` because on startup we don't yet know if the user is authenticated — this prevents the login page from flashing before the check completes.

📄 `src/store/authStore.ts`
```ts
import { create } from 'zustand';

export interface User {
  _id: string;
  email: string;
  username: string;
  imageUrl: string | null;
  interests: string[];
  languages: string[];
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (v) => set({ isLoading: v }),
}));
```

**Why Zustand and not React context?**  
No providers to wrap, no re-render cascades. Any component anywhere calls `useAuthStore((s) => s.user)` and gets the cached user.

---

## 4 · AuthGate Component

`AuthGate` wraps the whole app and fires the profile check once on mount. It's the single place that decides whether the user is in or out.

📄 `src/components/AuthGate.tsx`
```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

interface Props {
  children: React.ReactNode;
}

export function AuthGate({ children }: Props) {
  const { setUser, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/auth/profile')
      .then((res) => {
        setUser(res.data);           // 200 — store the user
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navigate('/login', { replace: true }); // 401 — go to login
        }
      })
      .finally(() => {
        setLoading(false);           // either way, stop the loading state
      });
  }, []);

  return <>{children}</>;
}
```

**Key points:**
- `replace: true` means the login page won't be in the browser history — hitting Back won't return to a broken state.
- `.finally()` always runs, so `isLoading` becomes `false` whether the request succeeded or failed.
- Any network error other than 401 (e.g. server is down) will also hit `.finally()` and stop loading, but won't redirect — handle that case later if needed.

---

## 5 · Page Stubs

These are minimal placeholders. You'll build them out in the next phase.

📄 `src/pages/LoginPage.tsx`
```tsx
export function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-bold">Login</h1>
      {/* login form goes here */}
    </div>
  );
}
```

📄 `src/pages/MainPage.tsx`
```tsx
import { useAuthStore } from '../store/authStore';

export function MainPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex flex-1 items-center justify-center">
      <h1 className="text-2xl font-bold">
        Welcome, {user?.username} 🐷
      </h1>
    </div>
  );
}
```

> `flex-1` on both pages works because your existing `Layout.tsx` already has `<main className="flex-1 flex flex-col">` — pages fill the available space automatically.

---

## 6 · Update App.tsx

Replace the existing `App.tsx` entirely. The key changes:
- Wrap everything in `AuthGate`
- Add the loading spinner before rendering routes
- Add `/login` and `/` routes

📄 `src/App.tsx`
```tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Layout } from './layout/Layout';
import { AuthGate } from './components/AuthGate';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';

function AppRoutes() {
  const isLoading = useAuthStore((s) => s.isLoading);

  // Hold rendering until the profile check resolves.
  // Prevents the login page flashing for authenticated users.
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public route — no Layout chrome */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes — wrapped in Layout */}
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        {/* add more protected routes here */}
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthGate>
        <AppRoutes />
      </AuthGate>
    </Router>
  );
}

export default App;
```

**Why `AuthGate` wraps `AppRoutes` and not the other way around?**  
`AuthGate` calls `useNavigate()`, which requires being inside `<Router>`. And `AppRoutes` reads `isLoading` from the store, which `AuthGate` sets — so the order is: Router → AuthGate (fires request) → AppRoutes (reads result).

---

## 7 · Backend CORS Check

Before testing, make sure your NestJS backend accepts requests from the Vite dev server with credentials. Without this the cookie will never be sent.

📄 `src/main.ts` **(backend)**
```ts
app.enableCors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true,               // required for cookie to be sent cross-origin
});
```

---

## 8 · Testing the Flow

Start both servers:

```bash
# terminal 1 — backend
npm run start:dev

# terminal 2 — frontend
npm run dev
```

**Test case 1 — unauthenticated:**
1. Open `http://localhost:5173` in a fresh browser (no cookie).
2. You should see the loading spinner briefly, then be redirected to `/login`.

**Test case 2 — authenticated:**
1. Use cURL or Postman to call `POST /auth/login` — this sets the cookie.
2. Reload `http://localhost:5173`.
3. You should see the loading spinner, then `Welcome, alice 🐷` on the main page.

**Test case 3 — DevTools check:**
1. Open DevTools → Application → Cookies → `localhost`.
2. You should see the JWT cookie with `HttpOnly` checked and `SameSite` set.
3. JavaScript `document.cookie` should **not** show it — that's the point of httpOnly.

---

## 9 · Complete Flow Diagram

```
Browser                   AuthGate              Backend
   |                          |                     |
   |-- app loads -----------> |                     |
   |                          |-- GET /auth/profile >|
   |                          |                     |-- check cookie
   |                          |                     |
   |                          |<-- 200 + user data--|  (cookie valid)
   |                          |-- setUser(data)     |
   |                          |-- setLoading(false) |
   |<-- render MainPage ------|                     |
   |                                                |
   |         OR                                     |
   |                                                |
   |                          |<-- 401 -------------|  (no/expired cookie)
   |                          |-- navigate(/login)  |
   |                          |-- setLoading(false) |
   |<-- render LoginPage -----|                     |
```

---

## 10 · What's Next

| Phase | Feature | Key tasks |
|---|---|---|
| Next | Login form | `POST /auth/login`, set cookie, redirect to `/` |
| Next | Register form | `POST /auth/register`, auto-login on success |
| Later | Logout | `POST /auth/logout`, clear cookie, `setUser(null)`, redirect to `/login` |
| Later | Matchmaking UI | Queue button, Socket.IO connection, accept/skip screen |

> **Tip:** Build the login form next — once a user can log in from the browser, you can test the full cookie flow end to end without cURL.
