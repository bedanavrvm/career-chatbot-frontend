import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import About from '../pages/About.vue'
import Login from '../pages/auth/Login.vue'
import Register from '../pages/auth/Register.vue'
import { auth, authReady } from '../lib/firebase'
import Chat from '../pages/Chat.vue'
import Onboarding from '../pages/Onboarding.vue'
import Dashboard from '../pages/Dashboard.vue'
import ProfileSettings from '../pages/ProfileSettings.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
  { path: '/about', name: 'about', component: About },
  { path: '/chat', name: 'chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/onboarding', name: 'onboarding', component: Onboarding, meta: { requiresAuth: true } },
  { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/settings/profile', name: 'profile_settings', component: ProfileSettings, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let initialAuthChecked = false
router.beforeEach(async (to, from, next) => {
  // Ensure we wait for the first auth state resolution to avoid flicker/loops
  if (!initialAuthChecked) {
    await authReady
    initialAuthChecked = true
  }
  const requiresAuth = to.meta?.requiresAuth
  const user = auth.currentUser
  if (requiresAuth && !user) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
