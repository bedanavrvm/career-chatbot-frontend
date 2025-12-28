<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import AppSidebar from './components/AppSidebar.vue'
import { auth } from './lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'

const route = useRoute()

const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

const isAuthenticated = ref(false)
onAuthStateChanged(auth, (u) => {
  isAuthenticated.value = !!u
  if (!isAuthenticated.value) sidebarOpen.value = false
})

const showSidebar = ref(false)

watch(
  () => [route.name, route.path, isAuthenticated.value],
  () => {
    const isHome = route.name === 'home' || route.path === '/'
    showSidebar.value = isAuthenticated.value && !isHome
    if (!showSidebar.value) sidebarOpen.value = false
  },
  { immediate: true }
)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  }
)
</script>

<template>
  <NavBar :showSidebarToggle="showSidebar" @toggle-sidebar="sidebarOpen = true" />
  <div class="flex min-h-[calc(100vh-4rem)]">
    <AppSidebar
      v-if="showSidebar"
      :open="sidebarOpen"
      :collapsed="sidebarCollapsed"
      @close="sidebarOpen = false"
      @toggle-collapsed="sidebarCollapsed = !sidebarCollapsed"
    />
    <div class="min-w-0 flex-1 overflow-x-hidden">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
</style>
