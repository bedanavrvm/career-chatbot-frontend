<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, Home, LayoutDashboard, User, UserPlus, LogIn, LogOut } from 'lucide-vue-next'
import { auth } from '../lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const emit = defineEmits(['toggle-sidebar'])

defineProps({
  showSidebarToggle: { type: Boolean, default: true },
  hideNavLinks: { type: Boolean, default: false },
})

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

function toggleSidebar () {
  emit('toggle-sidebar')
}
</script>

<template>
  <header class="glass border-b sticky top-0 z-10">
    <nav class="container-page h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          v-if="showSidebarToggle"
          class="btn btn-ghost btn-sm md:hidden"
          type="button"
          title="Open menu"
          aria-label="Open menu"
          @click="toggleSidebar"
        >
          <Menu class="h-4 w-4" />
        </button>
        <RouterLink v-if="!hideNavLinks" to="/" class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold shadow-soft">AI</div>
          <span class="text-lg font-semibold tracking-tight hidden sm:inline">{{ appName }}</span>
        </RouterLink>
        <div v-else class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-lg bg-brand flex items-center justify-center text-white font-bold shadow-soft">AI</div>
          <span class="text-lg font-semibold tracking-tight hidden sm:inline">{{ appName }}</span>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
        <RouterLink v-if="!hideNavLinks" to="/" custom v-slot="{ href, navigate, isExactActive }">
          <a
            :href="href"
            @click="navigate"
            :class="['nav-item', 'gap-2', isExactActive && 'nav-item--active']"
            title="Home"
            aria-label="Home"
          >
            <Home class="h-4 w-4" />
            <span class="hidden sm:inline">Home</span>
            <span class="sr-only sm:hidden">Home</span>
          </a>
        </RouterLink>
        <template v-if="currentUser && !hideNavLinks">
          <RouterLink to="/dashboard" custom v-slot="{ href, navigate, isActive }">
            <a
              :href="href"
              @click="navigate"
              :class="['nav-item', 'gap-2', isActive && 'nav-item--active']"
              title="Dashboard"
              aria-label="Dashboard"
            >
              <LayoutDashboard class="h-4 w-4" />
              <span class="hidden sm:inline">Dashboard</span>
              <span class="sr-only sm:hidden">Dashboard</span>
            </a>
          </RouterLink>
          <RouterLink to="/settings/profile" custom v-slot="{ href, navigate, isActive }">
            <a
              :href="href"
              @click="navigate"
              :class="['nav-item', 'gap-2', isActive && 'nav-item--active']"
              title="Profile"
              aria-label="Profile"
            >
              <User class="h-4 w-4" />
              <span class="hidden sm:inline">Profile</span>
              <span class="sr-only sm:hidden">Profile</span>
            </a>
          </RouterLink>
        </template>
        <template v-if="!currentUser">
          <RouterLink to="/register" custom v-slot="{ href, navigate, isActive }">
            <a
              :href="href"
              @click="navigate"
              :class="['nav-item', 'gap-2', isActive && 'nav-item--active']"
              title="Register"
              aria-label="Register"
            >
              <UserPlus class="h-4 w-4" />
              <span class="hidden sm:inline">Register</span>
              <span class="sr-only sm:hidden">Register</span>
            </a>
          </RouterLink>
          <RouterLink to="/login" custom v-slot="{ href, navigate, isActive }">
            <a
              :href="href"
              @click="navigate"
              :class="['nav-item', 'gap-2', isActive && 'nav-item--active']"
              title="Login"
              aria-label="Login"
            >
              <LogIn class="h-4 w-4" />
              <span class="hidden sm:inline">Login</span>
              <span class="sr-only sm:hidden">Login</span>
            </a>
          </RouterLink>
        </template>
        <template v-else>
          <span v-if="!hideNavLinks" class="hidden sm:block text-sm text-gray-600">{{ userEmail }}</span>
          <button
            @click="logout"
            class="btn btn-primary btn-sm sm:btn-md gap-2 shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut class="h-4 w-4" />
            <span class="hidden sm:inline">Sign out</span>
            <span class="sr-only sm:hidden">Sign out</span>
          </button>
        </template>
      </div>
    </nav>
  </header>
</template>

<style scoped>
</style>
