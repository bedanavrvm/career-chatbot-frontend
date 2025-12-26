<script setup>
import { ref, computed } from 'vue'
import { Home, MessageCircle, LayoutDashboard, User, UserPlus, LogIn, Info, ChevronLeft, ChevronRight, X, GraduationCap, Building2, Gauge, Brain } from 'lucide-vue-next'
import { auth } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const props = defineProps({
  open: { type: Boolean, default: false },
  collapsed: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'toggle-collapsed'])

const currentUser = ref(null)

onAuthStateChanged(auth, (u) => {
  currentUser.value = u
})

const sidebarWidthClass = computed(() => {
  return props.collapsed ? 'lg:w-16' : 'lg:w-64'
})

const navItems = computed(() => {
  const base = [
    { label: 'Home', icon: Home, to: { name: 'home' } },
    { label: 'About', icon: Info, to: { name: 'about' } },
  ]

  if (!currentUser.value) {
    return [
      ...base,
      { label: 'Login', icon: LogIn, to: { name: 'login' } },
      { label: 'Register', icon: UserPlus, to: { name: 'register' } },
    ]
  }

  return [
    ...base,
    { label: 'Dashboard', icon: LayoutDashboard, to: { name: 'dashboard' } },
    { label: 'Chat', icon: MessageCircle, to: { name: 'chat' } },
    { label: 'Programmes', icon: GraduationCap, to: { name: 'programs' } },
    { label: 'Institutions', icon: Building2, to: { name: 'institutions' } },
    { label: 'RIASEC', icon: Brain, to: { name: 'riasec_details' } },
    { label: 'Cluster Score', icon: Gauge, to: { name: 'cluster_score_details' } },
    { label: 'Profile', icon: User, to: { name: 'profile_settings' } },
    { label: 'Onboarding', icon: UserPlus, to: { name: 'onboarding' } },
  ]
})

function close () {
  emit('close')
}

function toggleCollapsed () {
  emit('toggle-collapsed')
}
</script>

<template>
  <div>
    <div v-if="open" class="fixed inset-0 top-16 bg-black/30 z-20 lg:hidden" @click="close"></div>

    <aside
      :class="[
        'z-30',
        'bg-white/90 backdrop-blur border-r lg:border',
        'fixed top-16 left-0 bottom-0 lg:sticky lg:top-16',
        'h-[calc(100vh-4rem)]',
        'w-72',
        sidebarWidthClass,
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        'transition-transform lg:transition-[width] duration-200',
      ]"
    >
      <div class="p-4 flex items-center justify-between gap-2">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-gray-900 truncate" v-if="!collapsed">Navigate</div>
          <div class="text-xs text-gray-600 truncate" v-if="!collapsed">Quick links</div>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn btn-ghost btn-sm lg:hidden"
            type="button"
            title="Close sidebar"
            aria-label="Close sidebar"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
          <button
            class="btn btn-ghost btn-sm hidden lg:inline-flex"
            type="button"
            :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="toggleCollapsed"
          >
            <ChevronRight v-if="collapsed" class="h-4 w-4" />
            <ChevronLeft v-else class="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav class="px-3 pb-4 space-y-1 overflow-y-auto">
        <RouterLink v-for="it in navItems" :key="it.label" :to="it.to" custom v-slot="{ href, navigate, isActive, isExactActive }">
          <a
            :href="href"
            @click="(e) => { navigate(e); close() }"
            :class="[
              'w-full inline-flex items-center gap-3 rounded-xl text-sm font-medium transition-all focus:outline-none focus:ring-4 focus:ring-brand/20',
              collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
              (isExactActive || isActive) ? 'bg-brand/10 text-brand-dark' : 'text-gray-700 hover:bg-gray-100',
            ]"
            :title="it.label"
            :aria-label="it.label"
          >
            <component :is="it.icon" class="h-4 w-4 shrink-0" />
            <span v-if="!collapsed" class="truncate">{{ it.label }}</span>
          </a>
        </RouterLink>
      </nav>
    </aside>
  </div>
</template>
