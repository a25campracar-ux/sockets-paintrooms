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
  <main class="container lobby">
    <article>
      <hgroup>
        <h1>🎨 PaintRooms</h1>
        <p>Dibuja en tiempo real con quien esté en tu misma sala.</p>
      </hgroup>
      <form @submit.prevent="entrar">
        <input v-model="username" placeholder="Tu nombre" maxlength="30" aria-label="Tu nombre" />
        <input v-model="roomName" placeholder="Nombre de la sala" maxlength="30" aria-label="Nombre de la sala" />
        <button type="submit">Entrar</button>
      </form>
      <p v-if="error" class="error"><small>{{ error }}</small></p>
    </article>
  </main>
</template>

<style scoped>
.lobby { max-width: 30rem; padding-top: 12vh; }
.error { color: var(--pico-del-color); margin: 0; }
</style>
