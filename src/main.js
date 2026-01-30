import { createApp } from 'vue'
import './style.css'
import './styles/design.css'
import App from './App.vue'
import router from './router'

// Debug: Log API base URL
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)

createApp(App).use(router).mount('#app')
