<script setup>
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { auth, googleProvider } from '../../lib/firebase'
import { signInWithEmailAndPassword, signInWithPopup, getIdToken } from 'firebase/auth'
import { loginProfile, onboardingMe, formatApiError } from '../../lib/api'
import FormErrors from '../../components/FormErrors.vue'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const errorFields = ref(null)
const emailError = ref('')
const passwordError = ref('')
const showPassword = ref(false)

function redirectTarget() {
  return route.query.redirect || '/dashboard'
}

async function redirectAfterAuth(token) {
  try {
    const data = await onboardingMe(token)
    const status = String(data?.status || '')
    if (status === 'complete') {
      router.replace(redirectTarget())
    } else {
      router.replace('/onboarding')
    }
  } catch {
    router.replace('/onboarding')
  }
}

async function doLogin() {
  error.value = ''
  errorFields.value = null
  emailError.value = /\S+@\S+\.\S+/.test(email.value.trim()) ? '' : 'Enter a valid email'
  passwordError.value = password.value.length >= 6 ? '' : 'Password must be at least 6 characters'
  if (emailError.value || passwordError.value) {
    return
  }
  try {
    loading.value = true
    const cred = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    const token = await getIdToken(cred.user, true)
    await loginProfile(token)
    await redirectAfterAuth(token)
  } catch (e) {
    errorFields.value = e?.fields || e?.data?.fields || null
    error.value = formatApiError(e) || 'Login failed'
  } finally {
    loading.value = false
  }
}

async function loginWithGoogle() {
  error.value = ''
  errorFields.value = null
  try {
    loading.value = true
    const cred = await signInWithPopup(auth, googleProvider)
    const token = await getIdToken(cred.user, true)
    await loginProfile(token)
    await redirectAfterAuth(token)
  } catch (e) {
    errorFields.value = e?.fields || e?.data?.fields || null
    error.value = formatApiError(e) || 'Google sign-in failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-page px-4 py-12">
    <div class="auth-overlay"></div>
    <div class="w-full max-w-md">
      <div class="auth-card">
        <h1 class="text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
        <p class="mt-2 text-sm text-gray-600">Sign in to continue</p>

        <form class="mt-6 space-y-4" @submit.prevent="doLogin">
          <div>
            <label class="label">Email</label>
            <div class="input-group mt-1">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input v-model="email" type="email" required autocomplete="email" :class="['input','input-lg','with-icon-left', { 'input-error': emailError }]" />
            </div>
            <p v-if="emailError" class="error-text">{{ emailError }}</p>
          </div>
          <div>
            <label class="label">Password</label>
            <div class="input-group mt-1">
              <svg class="input-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 10-8 0v4M6 11h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z" />
              </svg>
              <input v-model="password" :type="showPassword ? 'text' : 'password'" required autocomplete="current-password" :class="['input','input-lg','with-icon-left','with-icon-right', { 'input-error': passwordError }]" />
              <button type="button" class="input-action" @click="showPassword = !showPassword">
                <svg v-if="!showPassword" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="h-5 w-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.036 12.322a1.012 1.012 0 010-.644C3.423 7.51 7.36 5 12 5c4.64 0 8.577 2.51 9.964 6.678.07.21.07.434 0 .644C20.577 16.49 16.64 19 12 19c-4.64 0-8.577-2.51-9.964-6.678z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="h-5 w-5">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.32 16.167 7.258 18.678 11.898 18.678c1.786 0 3.477-.373 5.002-1.05M6.228 6.228A10.45 10.45 0 0111.898 5.322c4.64 0 8.577 2.51 9.964 6.678a1.012 1.012 0 010 .644 10.45 10.45 0 01-2.08 3.342M3 3l18 18" />
                </svg>
              </button>
            </div>
            <p v-if="passwordError" class="error-text">{{ passwordError }}</p>
          </div>
          <button :disabled="loading" type="submit" class="btn btn-primary btn-lg w-full disabled:opacity-60">
            {{ loading ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <button @click="loginWithGoogle" :disabled="loading" class="btn btn-outline btn-lg w-full mt-3 disabled:opacity-60">
          Continue with Google
        </button>

        <FormErrors :fields="errorFields" />
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>

        <p class="mt-6 text-sm text-gray-600 text-center">
          Don't have an account?
          <RouterLink to="/register" class="nav-cta">Create one</RouterLink>
        </p>
      </div>
    </div>
  </main>
  
</template>
