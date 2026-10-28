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

    const color = colors[room.users.size % colors.length];
    console.log("Salas: ", rooms.size, "| Sala Actual: ", roomName, "| Usuarios: ", room.users.size, "| Color asignado: ", color);
    
    room.users.set(socket.id, { username, color });
    socket.join(roomName);
    socket.data.roomName = roomName;
    socket.data.username = username;

    const dataCallback = Array.from(room.users.values());

    io.to(roomName).emit("room_users", dataCallback)

    callback({ 
      ok: true,
      usuarios: dataCallback,
      color: color,
      trazos: room.trazos
    });
  });
  socket.on("disconnect", () => {
    const socket = socket.id;
  });
});

console.log("Servidor escuchando en el puerto 3000");

