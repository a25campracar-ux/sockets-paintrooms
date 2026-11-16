import { Server } from "socket.io";

const io = new Server(3000, {
  cors: { origin: "http://localhost:5173" }
});

const rooms = new Map();
const colors = ["#e4486f", "#206301", "#4363d8", "#ff5100", "#911eb4", "#008080", "#6dfd68", "#cc0000"]

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("join_room", ({ roomName: rawRoom, username: rawUser }, callback) => {
    
    //VALIDACIONES
    if (typeof callback !== "function") return;

    if (typeof rawRoom !== "string" || typeof rawUser !== "string") {
      return callback({ ok: false, error: "Datos no válidos" });
    }

    const roomName = rawRoom.trim();
    const username = rawUser.trim();

    if (roomName.length === 0 || username.length === 0) {
      return callback({ ok: false, error: "La sala y el usuario no pueden estar vacíos" });
    }

    if (roomName.length > 30 || username.length > 30) {
      return callback({ ok: false, error: "Máximo 30 caracteres" });
    }

    // fin validaciones

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

    const listaUsuarios = Array.from(room.users.values());

    io.to(roomName).emit("room_users", listaUsuarios)

    callback({ 
      ok: true,
      usuarios: listaUsuarios,
      color: color,
      trazos: room.trazos
    });
  });

    const esNum = (n) => typeof n === "number" && Number.isFinite(n);

  socket.on("draw_begin", ({ x, y, color, width } = {}) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    const room = rooms.get(roomName);
    if (!room) return;
    if (!esNum(x) || !esNum(y) || !esNum(width) || typeof color !== "string") return;

    const trazo = { color, width, points: [{ x, y }] };
    room.trazos.push(trazo);
    if (room.trazos.length > 500) room.trazos.shift();
    socket.data.trazoActual = trazo;

    socket.to(roomName).emit("draw_begin", { id: socket.id, x, y, color, width });
  });

  socket.on("draw_move", ({ x, y } = {}) => {
    const roomName = socket.data.roomName;
    const trazo = socket.data.trazoActual;
    if (!roomName || !trazo) return;
    if (!esNum(x) || !esNum(y)) return;

    trazo.points.push({ x, y });

    socket.to(roomName).emit("draw_move", { id: socket.id, x, y });
  });

  socket.on("draw_end", () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;

    socket.data.trazoActual = null;

    socket.to(roomName).emit("draw_end", { id: socket.id });
  });

  socket.on("cursor_move", ({ x, y } = {}) => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    const room = rooms.get(roomName);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (!user) return;
    if (!esNum(x) || !esNum(y)) return;
    
    socket.to(roomName).emit("cursor_move", { id: socket.id, x, y, username: user.username, color: user.color});
  });

  socket.on("cursor_leave", () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    socket.to(roomName).emit("cursor_leave", { id: socket.id });
  });

    socket.on("clear_canvas", () => {
    const roomName = socket.data.roomName;
    if (!roomName) return;
    const room = rooms.get(roomName);
    if (!room) return;

    room.trazos = [];
    io.to(roomName).emit("clear_canvas");
  });

  socket.on("disconnect", () => {
    const roomName = socket.data.roomName;
    if (!roomName) { return }
    const room = rooms.get(roomName);
    if (!room) { return }
    room.users.delete(socket.id);
    io.to(roomName).emit("cursor_leave", { id: socket.id })
    if (room.users.size == 0) {
      rooms.delete(roomName);
    }
    else {
      const listaUsuarios = Array.from(room.users.values());
      io.to(roomName).emit("room_users", listaUsuarios)
    }
  });
});

console.log("Servidor escuchando en el puerto 3000");

