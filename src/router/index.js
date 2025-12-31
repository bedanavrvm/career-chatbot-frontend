import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import About from '../pages/About.vue'
import Login from '../pages/auth/Login.vue'
import Register from '../pages/auth/Register.vue'
import { auth, authReady } from '../lib/firebase'
import { getIdToken } from 'firebase/auth'
import { onboardingMe } from '../lib/api'
import Chat from '../pages/Chat.vue'
import Onboarding from '../pages/Onboarding.vue'
import Dashboard from '../pages/Dashboard.vue'
import ProfileSettings from '../pages/ProfileSettings.vue'
import ProgramDetails from '../pages/ProgramDetails.vue'
import ClusterScoreDetails from '../pages/ClusterScoreDetails.vue'
import RiasecDetails from '../pages/RiasecDetails.vue'
import Programs from '../pages/Programs.vue'
import Institutions from '../pages/Institutions.vue'

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
  { path: '/about', name: 'about', component: About },
  { path: '/chat', name: 'chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/programmes', name: 'programs', component: Programs, meta: { requiresAuth: true } },
  { path: '/institutions', name: 'institutions', component: Institutions, meta: { requiresAuth: true } },
  { path: '/programs/:id', name: 'program_details', component: ProgramDetails, meta: { requiresAuth: true } },
  { path: '/onboarding', name: 'onboarding', component: Onboarding, meta: { requiresAuth: true } },
  { path: '/dashboard', name: 'dashboard', component: Dashboard, meta: { requiresAuth: true } },
  { path: '/dashboard/cluster-score', name: 'cluster_score_details', component: ClusterScoreDetails, meta: { requiresAuth: true } },
  { path: '/dashboard/riasec', name: 'riasec_details', component: RiasecDetails, meta: { requiresAuth: true } },
  { path: '/settings/profile', name: 'profile_settings', component: ProfileSettings, meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

let onboardingCache = { uid: '', status: '', checkedAt: 0 }

async function getOnboardingStatus() {
  const u = auth.currentUser
  if (!u) return ''
  const now = Date.now()
  if (onboardingCache.uid === u.uid && onboardingCache.status === 'complete' && now - onboardingCache.checkedAt < 60_000) {
    return onboardingCache.status
  }

  const key = `onboarding_status:${u.uid}`
  try {
    const cached = localStorage.getItem(key)
    if (cached === 'complete') {
      onboardingCache = { uid: u.uid, status: 'complete', checkedAt: now }
      return 'complete'
    }
  } catch {}

  const token = await getIdToken(u, true)
  const data = await onboardingMe(token)
  const status = String(data?.status || '')
  onboardingCache = { uid: u.uid, status, checkedAt: now }
  if (status === 'complete') {
    try { localStorage.setItem(key, 'complete') } catch {}
  }
  return status
}

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
    const isOnboarding = to.name === 'onboarding' || to.path === '/onboarding'
    const isAuthPage = to.name === 'login' || to.name === 'register'
    if (user && !isOnboarding && !isAuthPage) {
      try {
        const status = await getOnboardingStatus()
        if (status !== 'complete') {
          next({ path: '/onboarding' })
          return
        }
      } catch {
        next({ path: '/onboarding' })
        return
      }
    }
    next()
  }
})

export default router
