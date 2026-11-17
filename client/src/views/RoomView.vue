<script setup>
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { socket } from "../socket.js";
import { useRoute, useRouter } from "vue-router";
import { estado } from "../estado.js";

const route = useRoute();
const router = useRouter();
const canvas = ref(null);
const color = ref("#000000");
const grosor = ref(4);

let ctx = null;
let dibujando = false;
let ultimo = null;
const remotos = new Map();
const cursores = reactive({});
let ultimoEnvioCursor = 0;

function posicion(e) {
  const rect = canvas.value.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height,
  };
}

function pintarSegmento(desde, hasta, colorTrazo, anchoTrazo) {
  ctx.strokeStyle = colorTrazo;
  ctx.lineWidth = anchoTrazo;
  ctx.beginPath();
  ctx.moveTo(desde.x * canvas.value.width, desde.y * canvas.value.height);
  ctx.lineTo(hasta.x * canvas.value.width, hasta.y * canvas.value.height);
  ctx.stroke();
}

function enviarCursor(p) {
  const ahora = performance.now();
  if (ahora - ultimoEnvioCursor < 30) return;
  ultimoEnvioCursor = ahora;
  socket.emit("cursor_move", { x: p.x, y: p.y });
}

function empezar(e) {
  dibujando = true;
  const p = posicion(e);
  ultimo = p;
  socket.emit("draw_begin", {
    x: p.x,
    y: p.y,
    color: color.value,
    width: Number(grosor.value),
  });
}

function mover(e) {
  const p = posicion(e);
  enviarCursor(p);
  if (!dibujando) return;
  pintarSegmento(ultimo, p, color.value, Number(grosor.value));
  ultimo = p;
  socket.emit("draw_move", { x: p.x, y: p.y });
}

function terminar() {
  if (!dibujando) return;
  dibujando = false;
  ultimo = null;
  socket.emit("draw_end");
}

function alEmpezarOtro(d) {
  remotos.set(d.id, { x: d.x, y: d.y, color: d.color, width: d.width });
}

function alMoverOtro(d) {
  const r = remotos.get(d.id);
  if (!r) return;
  pintarSegmento(r, d, r.color, r.width);
  r.x = d.x;
  r.y = d.y;
}

function alTerminarOtro(d) {
  remotos.delete(d.id);
}

function alMoverCursor(d) {
  cursores[d.id] = { x: d.x, y: d.y, username: d.username, color: d.color };
}

function alSalirCursor(d) {
  delete cursores[d.id];
}

function salir() {
  terminar();
  socket.emit("cursor_leave")
}

function repintar(trazos) {
  for (const t of trazos) {
    for (let i = 1; i < t.points.length; i++) {
      pintarSegmento(t.points[i - 1], t.points[i], t.color, t.width);
    }
  }
}

function limpiar() {
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
}

function pedirLimpiar() {
  socket.emit("clear_canvas");
}

onMounted(() => {
  if (!estado.listo) {
    router.push({ name: "lobby" });
    return; 
  }
  canvas.value.width = 800;
  canvas.value.height = 500;
  ctx = canvas.value.getContext("2d");
  ctx.lineCap = "round";
  repintar(estado.trazos);

  socket.on("draw_begin", alEmpezarOtro);
  socket.on("draw_move", alMoverOtro);
  socket.on("draw_end", alTerminarOtro);
  socket.on("cursor_move", alMoverCursor);
  socket.on("cursor_leave", alSalirCursor);
  socket.on("clear_canvas", limpiar);
});

onUnmounted(() => {
  socket.off("draw_begin", alEmpezarOtro);
  socket.off("draw_move", alMoverOtro);
  socket.off("draw_end", alTerminarOtro);
  socket.off("cursor_move", alMoverCursor);
  socket.off("cursor_leave", alSalirCursor);
  socket.off("clear_canvas", limpiar);
});
</script>

<template>
  <main class="container">
    <header class="cabecera">
      <h2>🎨 Sala: {{ route.params.roomName }}</h2>
      <div class="herramientas">
        <label>Color <input type="color" v-model="color" /></label>
        <label>Grosor <input type="range" min="1" max="20" v-model="grosor" /></label>
        <button class="secondary outline" @click="pedirLimpiar">Reiniciar lienzo</button>
      </div>
    </header>

    <div class="lienzo">
      <canvas
        ref="canvas"
        @pointerdown="empezar"
        @pointermove="mover"
        @pointerup="terminar"
        @pointerleave="salir"
      ></canvas>

      <div
        v-for="(c, id) in cursores"
        :key="id"
        class="cursor"
        :style="{ left: c.x * 100 + '%', top: c.y * 100 + '%' }"
      >
        <span class="punto" :style="{ background: c.color }"></span>
        <span class="nombre" :style="{ color: c.color }">{{ c.username }}</span>
      </div>
    </div>
  </main>
</template>

<style scoped>
.cabecera { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.5rem 0 1rem; }
.cabecera h2 { margin: 0; }
.herramientas { display: flex; flex-wrap: wrap; align-items: center; gap: 1.25rem; }
.herramientas label { display: flex; align-items: center; gap: .5rem; margin: 0; }
.herramientas input { margin: 0; }
.herramientas input[type="color"] { width: 2.75rem; height: 2.25rem; padding: .15rem; }
.herramientas input[type="range"] { width: 8rem; }
.herramientas button { margin: 0; padding: .4rem .9rem; }

.lienzo { position: relative; }
/* El lienzo es una "hoja" blanca en claro y en oscuro (se dibuja en negro por defecto).
   Se escala con CSS: las coordenadas que se envían son relativas (0-1). */
canvas {
  display: block; width: 100%; height: auto; aspect-ratio: 8 / 5;
  background: #fff; border-radius: var(--pico-border-radius);
  box-shadow: var(--pico-card-box-shadow); touch-action: none; cursor: crosshair;
}
.cursor {
  position: absolute;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 4px;
  transform: translate(-5px, -5px);
}
.punto { width: 10px; height: 10px; border-radius: 50%; border: 1px solid #fff; }
.nombre { font: bold 12px sans-serif; }
</style>