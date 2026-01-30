import { readonly, ref } from 'vue'

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const _authUser = ref(null)
export const authUser = readonly(_authUser)

const _authReadyState = ref(false)
export const authReadyState = readonly(_authReadyState)

let _resolveAuthReady
export const authReady = new Promise((resolve) => {
  _resolveAuthReady = resolve
});

function _markAuthReady (u) {
  _authUser.value = u || null
  if (!_authReadyState.value) {
    _authReadyState.value = true
  }
  if (_resolveAuthReady) {
    _resolveAuthReady()
    _resolveAuthReady = null
  }
}

const _hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

export let firebaseInitError = null
export let app = null
export let auth = { currentUser: null }
export let googleProvider = null

if (_hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig)
    auth = getAuth(app)
    googleProvider = new GoogleAuthProvider()
    onAuthStateChanged(auth, (u) => {
      _markAuthReady(u)
    })
  } catch (e) {
    firebaseInitError = e
    _markAuthReady(null)
  }
} else {
  firebaseInitError = new Error('Missing Firebase configuration (VITE_FIREBASE_* env vars)')
  _markAuthReady(null)
}
