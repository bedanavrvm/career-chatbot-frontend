import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import About from '../pages/About.vue'
import Login from '../pages/auth/Login.vue'
import Register from '../pages/auth/Register.vue'
import { auth, authReady } from '../lib/firebase'
import Chat from '../pages/Chat.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
  { path: '/about', name: 'about', component: About },
  { path: '/chat', name: 'chat', component: Chat },
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
