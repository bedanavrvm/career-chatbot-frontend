import { getIdToken as firebaseGetIdToken } from 'firebase/auth'

import { auth, authReady, authReadyState, authUser } from './firebase'

export async function getIdTokenForUser(user, forceRefresh = true) {
  if (!user) return ''
  return firebaseGetIdToken(user, forceRefresh)
}

export async function getIdToken(forceRefresh = true) {
  if (!auth.currentUser) return ''
  return getIdTokenForUser(auth.currentUser, forceRefresh)
}

export function waitForAuthReady() {
  return authReady
}

export function useAuth() {
  return {
    user: authUser,
    ready: authReadyState,
    getIdToken,
    waitForAuthReady,
  }
}
