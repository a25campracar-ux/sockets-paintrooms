import { Server } from "socket.io";

const io = new Server(3000, {
  cors: { origin: "http://localhost:5173" }
});

const rooms = new Map();
const colors = ["#e4486f", "#206301", "#4363d8", "#ff5100", "#911eb4", "#008080", "#6dfd68", "#cc0000"]

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("join_room", ({ roomName, username }, callback) => {
    console.log("join_room recibido:", roomName, username);

    if (!rooms.has(roomName)) {
      rooms.set(roomName, { users: new Map(), trazos: [] })
    }

    const room = rooms.get(roomName);

    console.log("Salas: ", rooms.size, "| Sala Actual: ", roomName);
    
    const color = colors(rooms.size);
    console.log(colors);
    

    callback({ ok: true });
});
});

console.log("Servidor escuchando en el puerto 3000");

