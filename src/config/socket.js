import { io } from 'socket.io-client';

// Detectar automáticamente el entorno
const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'https://vita-backend-czgo.onrender.com'
  : 'http://localhost:3000';

// Crear instancia única de socket
const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Logs para debugging
socket.on('connect', () => {
  console.log('✅ Socket conectado:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Socket desconectado:', reason);
});

socket.on('connect_error', (error) => {
  console.error('❌ Error de conexión:', error.message);
});

export default socket;