const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;

const initSocket = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    socket.join(`user:${userId}`);
    if (socket.user.role === 'super_admin') socket.join('super_admins');

    socket.on('disconnect', () => { });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

// Emit to a single user
const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

// Emit to all super admins
const emitToSuperAdmins = (event, payload) => {
  if (!io) return;
  io.to('super_admins').emit(event, payload);
};

// Broadcast to everyone connected
const emitBroadcast = (event, payload) => {
  if (!io) return;
  io.emit(event, payload);
};

module.exports = { initSocket, getIO, emitToUser, emitToSuperAdmins, emitBroadcast };
