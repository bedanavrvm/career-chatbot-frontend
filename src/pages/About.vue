<script setup>
</script>

<template>
  <main class="container-page py-12">
    <section class="mb-10">
      <h1 class="text-3xl font-bold text-gray-900">About Career Chatbot</h1>
      <p class="mt-3 text-gray-600 max-w-prose">
        This project provides personalized, explainable career guidance tailored to Kenyan students. It aligns
        your grades, interests (RIASEC), skills, and lifestyle preferences with KUCCPS programs and local context.
      </p>
    </section>

    <section class="grid md:grid-cols-2 gap-6">
      <div class="feature">
        <h2 class="font-semibold text-gray-900 mb-1">What you get</h2>
        <ul class="list-disc ml-5 text-gray-600 text-sm space-y-1">
          <li>Program matches based on your academic profile and constraints</li>
          <li>RIASEC-aligned recommendations with explainable trade-offs</li>
          <li>Local context for Kenyan universities and programs</li>
          <li>Clear next steps to move forward</li>
        </ul>
      </div>
      <div class="feature">
        <h2 class="font-semibold text-gray-900 mb-1">How it works</h2>
        <ul class="list-disc ml-5 text-gray-600 text-sm space-y-1">
          <li>Provide grades, subjects, interests, skills, and preferences</li>
          <li>We analyze using scoring, constraints, and goals</li>
          <li>We present prioritized options with reasons</li>
        </ul>
        <div class="mt-4">
          <RouterLink to="/register" class="btn btn-primary btn-md">Create account</RouterLink>
        </div>
      </div>
    </section>
  </main>
</template>
