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
  <h1>PaintRooms</h1>
  <form @submit.prevent="entrar">
    <input v-model="username" placeholder="Tu nombre" maxlength="30" />
    <input v-model="roomName" placeholder="Nombre de la sala" maxlength="30" />
    <button>Entrar</button>
  </form>
  <p v-if="error">{{ error }}</p>
</template>