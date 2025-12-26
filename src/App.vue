<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import NavBar from './components/NavBar.vue'
import AppSidebar from './components/AppSidebar.vue'

const route = useRoute()

const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  }
)
</script>

<template>
  <NavBar @toggle-sidebar="sidebarOpen = true" />
  <div class="flex min-h-[calc(100vh-4rem)] overflow-x-hidden">
    <AppSidebar
      :open="sidebarOpen"
      :collapsed="sidebarCollapsed"
      @close="sidebarOpen = false"
      @toggle-collapsed="sidebarCollapsed = !sidebarCollapsed"
    />
    <div class="min-w-0 flex-1">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
</style>
