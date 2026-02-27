import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import './styles/design.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
    console.error('[Global UI Error]:', err, info)
}

app.use(createPinia()).use(router).mount('#app')

