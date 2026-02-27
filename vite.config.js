import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/tests/**/*.test.{js,ts}'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
})

