import { io } from "socket.io-client";

// URL del servidor: .env.production en el build; en local, el 3000
export const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000");
