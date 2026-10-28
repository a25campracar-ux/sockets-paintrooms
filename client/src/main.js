import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const app = createApp(App)
app.use(router)
app.mount('#app')

socket.emit("join_room", { roomName: "test", username: "yo" }, (res) => console.log(res));

socket.on("room_users", (lista) => console.log("room_users:", lista));