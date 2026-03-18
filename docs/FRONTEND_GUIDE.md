# Frontend Developer Guide (Vue 3 + Vite)

## 1) Local setup

From `career-chatbot-frontend/`:

- Install deps:
  - `npm install`
- Start dev server:
  - `npm run dev`

## 2) Environment variables

Create a `.env` file in `career-chatbot-frontend/`.

### 2.1 Firebase (required)

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Firebase initialization behavior:

- `src/lib/firebase.js` checks that required config is present.
- If missing, it sets `firebaseInitError` and marks auth as “ready” with `null` user.

### 2.2 Backend base URL

- `VITE_API_BASE_URL` (optional)

Behavior:

- `src/lib/api.js` trims trailing slashes.
- If unset, it defaults to same-origin requests.

## 3) Auth integration

### 3.1 Where auth state lives

- `src/lib/firebase.js`
  - Owns the single `onAuthStateChanged` listener.
  - Exports:
    - `authUser` (reactive)
    - `authReady` (promise)
    - `authReadyState` (reactive)

- `src/lib/useAuth.js`
  - Provides:
    - `useAuth()` composable
    - `getIdToken()` helpers

### 3.2 How requests are authenticated

Most backend calls require:

- `Authorization: Bearer <idToken>`

The ID token is obtained from Firebase using `getIdToken()`.

## 4) Routing and guards

Routes are defined in `src/router/index.js`.

Notable routes:

- `/chat` requires auth + onboarding
- `/dashboard` requires auth + onboarding
- `/onboarding` requires auth

Guard behavior:

- Router waits for `authReady` to avoid flicker/loops.
- If a route requires onboarding, the guard checks onboarding status via backend.

## 5) Backend API client

The client lives in `src/lib/api.js`.

Key features:

- A consistent error type (`ApiError`) with:
  - `status`, `data`, `url`, `method`, and normalized `fields` data
- Retries support for transient network/502/503/504 errors
- `formatApiError(err)` helper for UI-friendly messages

## 6) Build and preview

- `npm run build`
- `npm run preview`

## 7) Common integration pitfalls

- If Firebase works but backend calls fail:
  - `VITE_API_BASE_URL` is likely wrong, or backend Firebase Admin credentials are missing.
- If the router keeps redirecting to onboarding:
  - Backend onboarding status endpoints are failing, or profile is incomplete.
