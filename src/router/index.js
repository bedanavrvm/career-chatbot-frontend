import { createRouter, createWebHistory } from 'vue-router'
import { auth, authReady } from '../lib/firebase'
import { getIdToken } from '../lib/useAuth'
import { onboardingMe, onboardingSave } from '../lib/api'
import { confirmDialog } from '../utils/confirmDialog'
import { getOnboardingStatus, invalidateOnboardingStatusCache, setOnboardingStatusCache } from '../utils/onboardingStatus'

const Home = () => import('../pages/Home.vue')
const About = () => import('../pages/About.vue')
const Login = () => import('../pages/auth/Login.vue')
const Register = () => import('../pages/auth/Register.vue')
const Chat = () => import('../pages/Chat.vue')
const Onboarding = () => import('../pages/Onboarding.vue')
const Dashboard = () => import('../pages/Dashboard.vue')
const ProfileSettings = () => import('../pages/ProfileSettings.vue')
const ProgramDetails = () => import('../pages/ProgramDetails.vue')
const ClusterScoreDetails = () => import('../pages/ClusterScoreDetails.vue')
const RiasecDetails = () => import('../pages/RiasecDetails.vue')
const Programs = () => import('../pages/Programs.vue')
const Institutions = () => import('../pages/Institutions.vue')
const InstitutionDetails = () => import('../pages/InstitutionDetails.vue')

const routes = [
  { path: '/', name: 'home', component: Home },
  { path: '/login', name: 'login', component: Login },
  { path: '/register', name: 'register', component: Register },
  { path: '/about', name: 'about', component: About },
  { path: '/chat', name: 'chat', component: Chat, meta: { requiresAuth: true } },
  { path: '/programmes', name: 'programs', component: Programs, meta: { requiresAuth: true } },
  { path: '/institutions', name: 'institutions', component: Institutions, meta: { requiresAuth: true } },
  { path: '/institutions/:code', name: 'institution_details', component: InstitutionDetails, meta: { requiresAuth: true } },
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
    if (user && isOnboarding && !isAuthPage) {
      try {
        const status = await getOnboardingStatus({ user, getIdToken, onboardingMe })
        const fromOnboarding = from?.name === 'onboarding' || from?.path === '/onboarding'
        if (status === 'complete' && !fromOnboarding) {
          const ok = await confirmDialog({
            title: 'Re-run onboarding?',
            message: 'Re-running onboarding will overwrite your current profile details and answers. You will need to complete the entire onboarding again.',
            confirmText: 'Yes, re-run onboarding',
            cancelText: 'Cancel',
            destructive: true,
          })
          if (!ok) {
            next(false)
            return
          }

          try {
            const token = await getIdToken(true)
            await onboardingSave(token, { status: 'incomplete' })
            invalidateOnboardingStatusCache(user.uid)
            setOnboardingStatusCache(user.uid, 'incomplete')
          } catch {
            invalidateOnboardingStatusCache(user.uid)
          }
        }
      } catch {}
    }
    if (user && !isOnboarding && !isAuthPage) {
      try {
        const status = await getOnboardingStatus({ user, getIdToken, onboardingMe })
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
