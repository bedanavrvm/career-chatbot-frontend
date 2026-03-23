<script setup>
const props = defineProps({
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['back', 'submit'])
</script>

<template>
  <section class="mt-4 space-y-4">
    <div class="glass-card-premium p-4">
      <p class="text-xs font-black text-gray-700 uppercase tracking-widest leading-loose">
        Profile complete! Submit to finalize and explore your personalized dashboard.
      </p>
      <div class="mt-4 flex gap-3">
        <button class="btn btn-secondary btn-md h-11 uppercase font-black text-xs tracking-widest" @click="emit('back')">Back</button>
        <button class="btn btn-primary btn-md h-11 grow uppercase font-black text-xs tracking-widest shadow-xl shadow-brand/20" :disabled="loading" @click="emit('submit')">
          {{ loading ? 'Finalizing...' : 'Submit & Discover' }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.glass-card-premium {
  @apply bg-white/70 backdrop-blur-2xl border-2 border-white rounded-[2rem] shadow-lg shadow-slate-200/50;
}
</style>
