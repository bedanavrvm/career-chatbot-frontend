# Career Chatbot Frontend (Vue 3 + Vite)

## Setup

### Windows (PowerShell)
```
npm install
npm run dev
```

### macOS / Linux
```
npm install
npm run dev
```

## Build
```
npm run build
npm run preview
```

## Environment Variables

Create a `.env` file in `career-chatbot-frontend/`.

Required for Firebase Auth:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Backend API base URL:
- `VITE_API_BASE_URL` (optional; defaults to same-origin)

## Auth State

Auth state is centralized:
- `src/lib/firebase.js` owns the single `onAuthStateChanged` listener and exports reactive `authUser`.
- `src/lib/useAuth.js` provides a composable wrapper (`useAuth()`) used by components and router guards.
