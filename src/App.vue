<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import AppSidebar from './components/AppSidebar.vue'
import SystemStatusBanner from './components/SystemStatusBanner.vue'
import ConfirmDialogHost from './components/ConfirmDialogHost.vue'
import ToastHost from './components/ToastHost.vue'
import GlobalLoadingOverlay from './components/GlobalLoadingOverlay.vue'

import { useAuth } from './lib/useAuth'

const route = useRoute()

const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

const { user } = useAuth()
const isAuthenticated = computed(() => !!user.value)

const showSidebar = ref(false)
const hideNav = ref(false)

const mainScroller = ref(null)

watch(
  () => [route.name, route.path, isAuthenticated.value],
  () => {
    const isHome = route.name === 'home' || route.path === '/'
    hideNav.value = route.name === 'onboarding' || route.path === '/onboarding'
    showSidebar.value = isAuthenticated.value && !isHome && !hideNav.value
    if (!showSidebar.value) sidebarOpen.value = false
  },
  { immediate: true }
)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
    const el = mainScroller.value
    if (el) el.scrollTop = 0
  }
)
</script>

<template>
  <ConfirmDialogHost />
  <ToastHost />
  <GlobalLoadingOverlay />
  <NavBar :showSidebarToggle="showSidebar" :hideNavLinks="hideNav" @toggle-sidebar="sidebarOpen = true" />
  <div class="flex min-h-0 h-[calc(100dvh-4rem)]">
    <AppSidebar
      v-if="showSidebar"
      :open="sidebarOpen"
      :collapsed="sidebarCollapsed"
      @close="sidebarOpen = false"
      @toggle-collapsed="sidebarCollapsed = !sidebarCollapsed"
    />
    <div ref="mainScroller" class="min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
      <SystemStatusBanner v-if="!hideNav" />
      <div class="min-h-0 flex-1">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
