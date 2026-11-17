<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { socket } from "../socket.js";
import { estado } from "../estado.js";

const router = useRouter();
const username = ref("");
const roomName = ref("");
const error = ref("");

function entrar() {
  socket.emit( "join_room", { roomName: roomName.value, username: username.value },
    (res) => {
      if (res.ok) {
        estado.trazos = res.trazos;
        estado.listo = true;
        router.push({ name: "room", params: {roomName: roomName.value} })  
      } else {
        error.value = res.error;
      }
    }
  );
}
</script>

<template>
  <section class="bloc heroi">
    <div>
      <p class="etiqueta">Pizarra multijugador · por salas</p>
      <h1 class="titular"><span>Dibuja con otros.</span> <span>En directo.</span></h1>
      <p class="entradeta">
        Crea una sala o entra en una que ya exista. Cada trazo aparece al instante en la pantalla
        de todos los que están dentro, con su cursor y su nombre.
      </p>

      <form class="formulario" @submit.prevent="entrar">
        <div class="campos">
          <label>Tu nombre
            <input v-model="username" placeholder="p. ej. Anna" maxlength="30" autocomplete="off" />
          </label>
          <label>Sala
            <input v-model="roomName" placeholder="p. ej. clase-daw" maxlength="30" autocomplete="off" />
          </label>
        </div>
        <button type="submit">Entrar en la sala</button>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </form>
    </div>

    <!-- Demostración: una pizarra con trazos de dos personas -->
    <div class="llum" aria-hidden="true">
      <div class="finestra">
        <div class="finestra__barra">
          <span class="finestra__punts"><span></span><span></span><span></span></span>
          <span class="finestra__adreca">paintrooms / sala / clase-daw</span>
        </div>
        <div class="finestra__cos">
          <svg class="demo" viewBox="0 0 800 500">
            <rect width="800" height="500" fill="#fff" />
            <path d="M90 360 C 150 200, 230 150, 300 230 S 420 380, 500 260" fill="none" stroke="#4363d8" stroke-width="9" stroke-linecap="round" />
            <path d="M120 120 l 70 0 M155 85 l 0 70" stroke="#e4486f" stroke-width="7" stroke-linecap="round" />
            <circle cx="620" cy="170" r="70" fill="none" stroke="#ff5100" stroke-width="6" />
            <path d="M560 400 Q 640 330 720 400" fill="none" stroke="#206301" stroke-width="5" stroke-linecap="round" />
            <g transform="translate(500 260)">
              <rect x="-6" y="-6" width="12" height="12" fill="#4363d8" stroke="#fff" stroke-width="2" />
              <text x="14" y="5" fill="#2f4cb0" font-size="18" font-weight="600" font-family="Host Grotesk Variable, sans-serif">Anna</text>
            </g>
            <g transform="translate(690 120)">
              <rect x="-6" y="-6" width="12" height="12" fill="#ff5100" stroke="#fff" stroke-width="2" />
              <text x="14" y="5" fill="#b33a00" font-size="18" font-weight="600" font-family="Host Grotesk Variable, sans-serif">Marc</text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.heroi { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: clamp(2.5rem, 6vw, 6rem); align-items: center; }
.formulario { margin-top: 2.5rem; max-width: 32rem; }
.campos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.campos label { display: flex; flex-direction: column; gap: 0.4rem; }
.campos input { margin: 0; }
.formulario button { width: 100%; margin: 0.75rem 0 0; padding-block: 0.9rem; }
.error { margin: 0.75rem 0 0; color: #ff8a92; font-size: 0.9375rem; }
.demo { display: block; width: 100%; height: auto; }
@media (max-width: 900px) { .heroi { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 520px) { .campos { grid-template-columns: 1fr; } }
</style>
