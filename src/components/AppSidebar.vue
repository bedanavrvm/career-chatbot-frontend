<script setup>
import { ref, computed } from 'vue'
import { MessageCircle, LayoutDashboard, User, UserPlus, ChevronLeft, ChevronRight, X, GraduationCap, Building2, Gauge, Brain } from 'lucide-vue-next'
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
  return props.collapsed ? 'md:w-16' : 'md:w-64'
})

const navItems = computed(() => {
  if (!currentUser.value) {
    return []
  }

  return [
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
    <div v-if="open" class="fixed inset-0 top-16 bg-black/30 z-20 md:hidden" @click="close"></div>

    <aside
      :class="[
        'z-30 shrink-0',
        'bg-white/90 backdrop-blur border-r',
        'fixed top-16 left-0 bottom-0 md:sticky md:top-16',
        'h-[calc(100vh-4rem)]',
        'w-72',
        sidebarWidthClass,
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        'transition-transform md:transition-[width] duration-200',
      ]"
    >
      <nav :class="[collapsed ? 'px-1 py-0' : 'px-2 py-0', 'h-full overflow-y-auto']">
        <div class="md:hidden py-1">
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            title="Close sidebar"
            aria-label="Close sidebar"
            @click="close"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <button
          class="hidden md:inline-flex w-full items-center gap-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand/20"
          type="button"
          :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :class="collapsed ? 'justify-center px-2 py-2.5' : 'justify-start px-3 py-2.5'"
          @click="toggleCollapsed"
        >
          <ChevronRight v-if="collapsed" class="h-4 w-4 shrink-0" />
          <ChevronLeft v-else class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed" class="truncate">Collapse</span>
        </button>

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
