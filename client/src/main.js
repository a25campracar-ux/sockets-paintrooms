import '@picocss/pico'                     // base de estilos
import '@fontsource-variable/host-grotesk' // tipografía (autoalojada)
import './assets/tema.css'                 // tema propio, siempre después de Pico
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
