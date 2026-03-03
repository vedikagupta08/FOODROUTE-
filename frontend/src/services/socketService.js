import { io } from 'socket.io-client';

/**
 * Socket.IO Service
 * Manages real-time connections for delivery tracking
 */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

let socket = null;

/**
 * Initialize socket connection
 */
export const initSocket = () => {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  return socket;
};

/**
 * Join delivery room for real-time updates
 */
export const joinDeliveryRoom = (deliveryId) => {
  if (socket) {
    socket.emit('join-delivery', deliveryId);
  }
};

/**
 * Leave delivery room
 */
export const leaveDeliveryRoom = (deliveryId) => {
  if (socket) {
    socket.emit('leave-delivery', deliveryId);
  }
};

/**
 * Listen for delivery status updates
 */
export const onDeliveryStatusUpdate = (callback) => {
  if (socket) {
    socket.on('delivery-status-updated', callback);
  }
};

/**
 * Listen for delivery assignments
 */
export const onDeliveryAssigned = (callback) => {
  if (socket) {
    socket.on('delivery-assigned', callback);
  }
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default socket;
