import { io, Socket } from 'socket.io-client';

const VITE_API_URL = import.meta.env.VITE_API_URL;
const SOCKET_URL = VITE_API_URL ? new URL(VITE_API_URL).origin : window.location.origin;

class SocketService {
    private socket: Socket | null = null;

    connect() {
        if (this.socket?.connected) return this.socket;

        this.socket = io(SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            console.log('[Socket] Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('[Socket] Disconnected from server');
        });

        return this.socket;
    }

    getSocket() {
        if (!this.socket) return this.connect();
        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
