<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <header class="container capcalera">
    <RouterLink class="marca" to="/" aria-label="PaintRooms, inicio">
      <span class="marca__signe" aria-hidden="true"></span>
      PaintRooms
    </RouterLink>
    <p class="capcalera__info">
      <template v-if="route.params.roomName">Sala <strong>{{ route.params.roomName }}</strong></template>
      <template v-else>Pizarra colaborativa en directo</template>
    </p>
  </header>

  <main class="container">
    <RouterView />
  </main>
</template>
