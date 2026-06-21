import { Server } from 'socket.io';
import { config } from './config.js';

export function createSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                callback(null, true);
            },
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    const activeUsers = new Map();

    let broadcastTimer = null;
    const broadcastPresence = () => {
        if (broadcastTimer) return;
        broadcastTimer = setTimeout(() => {
            io.emit('presence:list', Array.from(activeUsers.values()));
            broadcastTimer = null;
        }, 500);
    };

    io.on('connection', (socket) => {
        console.log('[Socket] New connection:', socket.id);

        socket.on('presence:join', (user) => {
            activeUsers.set(socket.id, {
                ...user,
                socketId: socket.id,
                lastSeen: Date.now(),
                page: user.page || 'Dashboard',
                activity: null
            });
            broadcastPresence();
        });

        socket.on('presence:update', (update) => {
            const user = activeUsers.get(socket.id);
            if (user) {
                activeUsers.set(socket.id, { ...user, ...update, lastSeen: Date.now() });
                broadcastPresence();
            }
        });

        socket.on('disconnect', () => {
            activeUsers.delete(socket.id);
            broadcastPresence();
        });

        socket.on('queue:join', (room) => {
            socket.join(`queue:${room}`);
        });

        socket.on('application:join', (applicationId) => {
            socket.join(`application:${applicationId}`);
        });

        // ── ALLMIND Oversight Events ──────────────────────────────────

        // Return all active sessions to admin
        socket.on('allmind:get-sessions', (callback) => {
            if (typeof callback === 'function') {
                const sessions = Array.from(activeUsers.entries()).map(([sid, user]) => ({
                    socketId: sid,
                    ...user,
                }));
                callback(sessions);
            }
        });

        // Force logout a user by socket ID
        socket.on('allmind:force-logout', (targetSocketId, callback) => {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
                targetSocket.emit('force:logout');
                targetSocket.disconnect(true);
                activeUsers.delete(targetSocketId);
                broadcastPresence();
                if (typeof callback === 'function') callback({ success: true });
            } else {
                if (typeof callback === 'function') callback({ success: false, error: 'Socket not found' });
            }
        });

        // Return recent traffic from the in-memory ring buffer
        socket.on('allmind:get-traffic', (callback) => {
            if (typeof callback === 'function') {
                callback(io._trafficLog || []);
            }
        });
    });

    // Expose activeUsers and trafficLog getter for socket events
    io._allmindGetTraffic = () => {
        // Will be set by index.js via app.locals
        return [];
    };

    return io;
}
