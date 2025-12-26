<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const router = useRouter()
const currentUser = ref(null)

onAuthStateChanged(auth, (u) => {
  currentUser.value = u
})

const userEmail = computed(() => currentUser.value?.email || currentUser.value?.displayName || '')
const appName = computed(() => import.meta.env.VITE_APP_NAME || 'Career Chatbot')

async function logout() {
  await signOut(auth)
  router.push('/login')
}
</script>

<template>
  <header class="glass border-b sticky top-0 z-10">
    <nav class="container-page h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <RouterLink to="/" class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold shadow-soft">AI</div>
          <span class="text-lg font-semibold tracking-tight">{{ appName }}</span>
        </RouterLink>
      </div>
      <div class="flex items-center gap-4">
        <RouterLink to="/" custom v-slot="{ href, navigate, isExactActive }">
          <a :href="href" @click="navigate" :class="['nav-item', isExactActive && 'nav-item--active']">Home</a>
        </RouterLink>
        <RouterLink to="/chat" custom v-slot="{ href, navigate, isActive }">
          <a :href="href" @click="navigate" :class="['nav-item', isActive && 'nav-item--active']">Chat</a>
        </RouterLink>
        <template v-if="currentUser">
          <RouterLink to="/dashboard" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="['nav-item', isActive && 'nav-item--active']">Dashboard</a>
          </RouterLink>
          <RouterLink to="/settings/profile" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="['nav-item', isActive && 'nav-item--active']">Profile</a>
          </RouterLink>
        </template>
        <template v-if="!currentUser">
          <RouterLink to="/register" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="['nav-item', isActive && 'nav-item--active']">Register</a>
          </RouterLink>
          <RouterLink to="/login" custom v-slot="{ href, navigate, isActive }">
            <a :href="href" @click="navigate" :class="['nav-item', isActive && 'nav-item--active']">Login</a>
          </RouterLink>
        </template>
        <template v-else>
          <span class="hidden sm:block text-sm text-gray-600">{{ userEmail }}</span>
          <button @click="logout" class="nav-cta btn btn-primary btn-md">Sign out</button>
        </template>
      </div>
    </nav>
  </header>
</template>

<style scoped>
</style>
