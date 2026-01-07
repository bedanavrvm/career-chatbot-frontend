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

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

const _authUser = ref(auth.currentUser)
export const authUser = readonly(_authUser)

const _authReadyState = ref(false)
export const authReadyState = readonly(_authReadyState)

// Promise that resolves on first auth state emission
let _resolveAuthReady
export const authReady = new Promise((resolve) => {
  _resolveAuthReady = resolve
});

onAuthStateChanged(auth, (u) => {
  _authUser.value = u
  if (!_authReadyState.value) {
    _authReadyState.value = true
  }
  if (_resolveAuthReady) {
    _resolveAuthReady()
    _resolveAuthReady = null
  }
});
