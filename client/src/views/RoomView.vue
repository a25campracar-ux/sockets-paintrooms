<script setup>
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { socket } from "../socket.js";
import { useRoute, useRouter } from "vue-router";
import { estado } from "../estado.js";

const route = useRoute();
const router = useRouter();
const canvas = ref(null);
const color = ref("#111111");
// Muestras de color (en lugar del selector nativo). El blanco hace de goma.
const colores = [
  { valor: "#111111", nombre: "Negro" },
  { valor: "#e4486f", nombre: "Rosa" },
  { valor: "#ff5100", nombre: "Naranja" },
  { valor: "#f2c200", nombre: "Amarillo" },
  { valor: "#206301", nombre: "Verde" },
  { valor: "#008080", nombre: "Turquesa" },
  { valor: "#4363d8", nombre: "Azul" },
  { valor: "#911eb4", nombre: "Lila" },
  { valor: "#ffffff", nombre: "Goma (blanco)" },
];
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
  <section class="sala">
    <header class="sala__cap">
      <div>
        <p class="etiqueta">Sala</p>
        <h1 class="sala__titol">{{ route.params.roomName }}</h1>
      </div>

      <!-- Herramientas -->
      <div class="eines">
        <fieldset class="mostres">
          <legend class="etiqueta">Color</legend>
          <label v-for="c in colores" :key="c.valor" class="mostra" :title="c.nombre">
            <input type="radio" name="color" :value="c.valor" v-model="color" :aria-label="c.nombre" />
            <span :style="{ background: c.valor }"></span>
          </label>
        </fieldset>
        <label class="gruix">
          <span class="etiqueta">Grosor <span class="xifra">{{ grosor }} px</span></span>
          <input type="range" min="1" max="20" v-model="grosor" />
        </label>
        <button class="secondary outline" @click="pedirLimpiar">Reiniciar lienzo</button>
      </div>
    </header>

    <div class="llum">
      <div class="finestra">
        <div class="finestra__barra" aria-hidden="true">
          <span class="finestra__punts"><span></span><span></span><span></span></span>
          <span class="finestra__adreca">paintrooms / sala / {{ route.params.roomName }}</span>
        </div>
        <div class="finestra__cos lienzo-marco">
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
              <span class="nombre">{{ c.username }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sala { padding-block: clamp(2.5rem, 2rem + 3vw, 5rem) clamp(3rem, 2.5rem + 2vw, 5.3rem); }
.sala__cap { display: flex; flex-wrap: wrap; align-items: end; justify-content: space-between; gap: 1.5rem 3rem; margin-bottom: 2.5rem; }
.sala__titol { font-size: clamp(2.5rem, 2rem + 2.5vw, 3.75rem); line-height: 1; letter-spacing: -0.035em; margin: 0.4rem 0 0; overflow-wrap: anywhere; }

.eines { display: flex; flex-wrap: nowrap; align-items: end; gap: 1.5rem 2rem; }
.eines button { margin: 0; }
.mostres { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; border: 0; }
.mostres legend { width: 100%; margin-bottom: 0.5rem; padding: 0; }
.mostra { position: relative; margin: 0; cursor: pointer; }
.mostra input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.mostra span { display: block; width: 1.9rem; height: 1.9rem; border: 1px solid rgb(255 255 255 / 0.18); }
.mostra input:checked + span { outline: 2px solid var(--text); outline-offset: 2px; }
.mostra input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }

.gruix { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; min-width: 11rem; }
.gruix .xifra { color: var(--text); margin-left: 0.35rem; letter-spacing: 0; text-transform: none; }
/* Control de rango dibujado por el tema (no el nativo) */
.gruix input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 2px; margin: 0.75rem 0; background: var(--linia-forta); }
.gruix input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; background: var(--text); border: 0; border-radius: 0; cursor: pointer; }
.gruix input[type="range"]::-moz-range-thumb { width: 16px; height: 16px; background: var(--text); border: 0; border-radius: 0; cursor: pointer; }
.gruix input[type="range"]:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; }

.lienzo-marco { padding: clamp(0.75rem, 2vw, 1.25rem); background: #0e0e11; }
/* Que la hoja quepa en la pantalla: el ancho sale del alto disponible (proporción 8:5) */
.lienzo { position: relative; max-width: calc((100dvh - 22rem) * 1.6); min-width: min(100%, 36rem); margin-inline: auto; }
/* La hoja es blanca (se dibuja en negro por defecto). Las coordenadas que se envían son relativas (0-1). */
canvas { display: block; width: 100%; height: auto; aspect-ratio: 8 / 5; background: #fff; touch-action: none; cursor: crosshair; }
.cursor { position: absolute; pointer-events: none; display: flex; align-items: center; gap: 6px; transform: translate(-6px, -6px); }
.punto { width: 12px; height: 12px; border: 2px solid #fff; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25); }
.nombre { font-size: 12px; font-weight: 600; color: #fff; padding: 2px 6px; background: rgb(10 10 12 / 0.88); }
@media (max-width: 1100px) { .eines { flex-wrap: wrap; } }
</style>
