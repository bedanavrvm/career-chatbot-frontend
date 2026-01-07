<script setup>
import { ref, onMounted } from 'vue'
import { useAuth } from '../lib/useAuth'
import { meProfile } from '../lib/api'

const { user, getIdToken, waitForAuthReady } = useAuth()
const profile = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  await waitForAuthReady()
  if (user.value) {
    try {
      const token = await getIdToken(true)
      profile.value = await meProfile(token)
    } catch (e) {
      error.value = e?.message || 'Failed to load profile'
    }
  }
  loading.value = false
})
</script>

<template>
  <main class="min-h-screen">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="container-page py-16">
        <div class="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 class="hero-title">Personalized Career Guidance</h1>
            <p class="hero-subtitle">
              Get data-driven recommendations aligned with your grades, interests, skills, and lifestyle. Built for Kenyan students with KUCCPS alignment and explainable results.
            </p>
            <div class="mt-8 flex gap-3">
              <RouterLink to="/register" class="btn btn-primary btn-lg">Get Started</RouterLink>
              <RouterLink to="/about" class="btn btn-outline btn-lg">Learn More</RouterLink>
            </div>
            <div v-if="loading" class="mt-6 text-gray-500 text-sm">Loading your profile…</div>
            <div v-else-if="user && profile" class="mt-6 card p-4">
              <p class="text-sm text-gray-500">Welcome back</p>
              <h3 class="text-lg font-semibold">{{ profile.display_name || profile.email || 'User' }}</h3>
              <p class="text-sm text-gray-600 mt-1">UID: {{ profile.uid }}</p>
            </div>
            <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
          </div>
          <div>
            <div class="card-elevated p-6">
              <div class="feature-grid text-sm text-gray-600">
                <div class="feature">
                  <p class="font-semibold text-gray-900">Eligibility</p>
                  <p>Cluster rules and subject minima verified.</p>
                </div>
                <div class="feature">
                  <p class="font-semibold text-gray-900">Personalization</p>
                  <p>Interests, skills, lifestyle preferences.</p>
                </div>
                <div class="feature">
                  <p class="font-semibold text-gray-900">Local Data</p>
                  <p>KUCCPS programs, Kenyan context.</p>
                </div>
                <div class="feature">
                  <p class="font-semibold text-gray-900">Explainability</p>
                  <p>Transparent reasons and trade-offs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="container-page py-10">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="feature text-center">
          <div class="text-2xl font-extrabold text-gray-900">20k+</div>
          <div class="text-sm text-gray-600 mt-1">Students guided</div>
        </div>
        <div class="feature text-center">
          <div class="text-2xl font-extrabold text-gray-900">500+</div>
          <div class="text-sm text-gray-600 mt-1">Programs analyzed</div>
        </div>
        <div class="feature text-center">
          <div class="text-2xl font-extrabold text-gray-900">92%</div>
          <div class="text-sm text-gray-600 mt-1">Satisfaction</div>
        </div>
        <div class="feature text-center">
          <div class="text-2xl font-extrabold text-gray-900">24/7</div>
          <div class="text-sm text-gray-600 mt-1">Available</div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="container-page py-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">How it works</h2>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="feature">
          <div class="flex items-center gap-3 mb-2">
            <span class="badge badge-soft">Step 1</span>
            <h3 class="font-semibold text-gray-900">Tell us about you</h3>
          </div>
          <p class="text-gray-600 text-sm">Enter grades, subjects, interests (RIASEC), skills, and lifestyle preferences.</p>
        </div>
        <div class="feature">
          <div class="flex items-center gap-3 mb-2">
            <span class="badge badge-soft">Step 2</span>
            <h3 class="font-semibold text-gray-900">We analyze</h3>
          </div>
          <p class="text-gray-600 text-sm">Our engine aligns KUCCPS programs with your profile, constraints, and priorities.</p>
        </div>
        <div class="feature">
          <div class="flex items-center gap-3 mb-2">
            <span class="badge badge-soft">Step 3</span>
            <h3 class="font-semibold text-gray-900">Get recommendations</h3>
          </div>
          <p class="text-gray-600 text-sm">Receive explainable matches with trade-offs and next steps, updated over time.</p>
        </div>
      </div>
    </section>

    <!-- CTA band -->
    <section class="mt-6">
      <div class="container-page">
        <div class="rounded-2xl bg-gradient-to-r from-brand to-brand-dark p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 class="text-2xl font-bold">Start your journey today</h3>
            <p class="opacity-90">Sign in or create an account to get tailored guidance instantly.</p>
          </div>
          <div class="flex gap-3">
            <RouterLink to="/login" class="btn btn-ghost btn-lg bg-white/10 hover:bg-white/20">Login</RouterLink>
            <RouterLink to="/register" class="btn btn-primary btn-lg">Create account</RouterLink>
          </div>
        </div>
      </div>
    </section>
  </main>
  
</template>
