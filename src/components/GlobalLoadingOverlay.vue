<script setup>
import { isGlobalLoading } from '../utils/globalLoading'
</script>

<template>
  <div v-if="isGlobalLoading" class="fixed inset-0 z-[55]">
    <div class="absolute inset-0 bg-white/50 backdrop-blur-[1px]" />
    <div class="absolute inset-0 flex items-center justify-center">
      <div class="rounded-2xl border bg-white px-4 py-3 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand" />
          <div class="text-sm font-medium text-gray-800">Working…</div>
        </div>
      </div>
    </div>
  </div>
</template>
