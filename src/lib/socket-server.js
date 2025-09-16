// JavaScript version of socket-server for CommonJS compatibility
const { Server: NetServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const jwt = require('jsonwebtoken');

let socketServer = null;

function initializeSocketServer(httpServer) {
    if (socketServer?.isInitialized) {
        return socketServer.io;
    }

    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? process.env.NEXT_PUBLIC_APP_URL
                : "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling']
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication token required'));
            }

            // Verify JWT token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from database (simplified for now)
            // In a real implementation, you'd import the User model here
            socket.userId = decoded.userId;
            socket.userType = decoded.userType;

            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication failed'));
        }
    });

    // Connection handling
    io.on('connection', (socket) => {
        console.log(`User ${socket.userId} (${socket.userType}) connected to socket`);

        // Join user-specific room
        socket.join(`user:${socket.userId}`);

        // Join role-based rooms
        socket.join(`role:${socket.userType}`);

        // Join all users room for global notifications
        socket.join('all_users');

        // Handle joining transfer-specific rooms
        socket.on('join_transfer_room', (transferId) => {
            socket.join(`transfer:${transferId}`);
            console.log(`User ${socket.userId} joined transfer room: ${transferId}`);
        });

        // Handle leaving transfer-specific rooms
        socket.on('leave_transfer_room', (transferId) => {
            socket.leave(`transfer:${transferId}`);
            console.log(`User ${socket.userId} left transfer room: ${transferId}`);
        });

        // Handle notification preferences
        socket.on('update_notification_preferences', (preferences) => {
            socket.data.notificationPreferences = preferences;
        });

        // Handle disconnect
        socket.on('disconnect', (reason) => {
            console.log(`User ${socket.userId} disconnected: ${reason}`);
        });

        // Send connection confirmation
        socket.emit('connected', {
            message: 'Successfully connected to real-time notifications',
            userId: socket.userId,
            userType: socket.userType
        });
    });

    socketServer = {
        io,
        isInitialized: true
    };

    return io;
}

function getSocketServer() {
    return socketServer?.io || null;
}

// Notification utility functions
class NotificationService {
    constructor(io) {
        this.io = io;
    }

    // Send notification to specific user
    sendToUser(userId, event, data) {
        this.io.to(`user:${userId}`).emit(event, data);
    }

    // Send notification to all users with specific role
    sendToRole(userType, event, data) {
        this.io.to(`role:${userType}`).emit(event, data);
    }

    // Send notification to all users
    sendToAll(event, data) {
        this.io.to('all_users').emit(event, data);
    }

    // Send notification to users in a transfer room
    sendToTransferRoom(transferId, event, data) {
        this.io.to(`transfer:${transferId}`).emit(event, data);
    }
}

// Export singleton instance
function getNotificationService() {
    const io = getSocketServer();
    return io ? new NotificationService(io) : null;
}

module.exports = {
    initializeSocketServer,
    getSocketServer,
    getNotificationService
};
