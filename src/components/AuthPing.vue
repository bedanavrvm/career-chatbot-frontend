<script setup>
import { ref } from 'vue'
import { auth, googleProvider } from '../lib/firebase'
import { signInWithPopup, signOut, onAuthStateChanged, getIdToken } from 'firebase/auth'
import { securePing } from '../lib/api'

const user = ref(null)
const loading = ref(false)
const error = ref('')
const pingResult = ref(null)

onAuthStateChanged(auth, (u) => {
  user.value = u
})

async function login() {
  error.value = ''
  try {
    await signInWithPopup(auth, googleProvider)
  } catch (e) {
    error.value = e?.message || 'Login failed'
  }
}

async function logout() {
  error.value = ''
  try {
    await signOut(auth)
  } catch (e) {
    error.value = e?.message || 'Logout failed'
  }
}

async function pingBackend() {
  error.value = ''
  pingResult.value = null
  try {
    loading.value = true
    if (!auth.currentUser) {
      throw new Error('Not signed in')
    }
    const token = await getIdToken(auth.currentUser, true)
    const res = await securePing(token)
    pingResult.value = res
  } catch (e) {
    error.value = e?.message || 'Ping failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="card" style="margin-top: 1rem;">
    <h3>Auth & Backend Check</h3>
    <div v-if="!user">
      <button type="button" @click="login">Sign in with Google</button>
    </div>
    <div v-else>
      <p>Signed in as {{ user.email || user.displayName || user.uid }}</p>
      <button type="button" @click="logout">Sign out</button>
      <button type="button" :disabled="loading" @click="pingBackend" style="margin-left: .5rem;">Test secure ping</button>
    </div>
    <p v-if="loading">Calling backend…</p>
    <pre v-if="pingResult">{{ JSON.stringify(pingResult, null, 2) }}</pre>
    <p v-if="error" style="color:#c00">{{ error }}</p>
  </div>
</template>
