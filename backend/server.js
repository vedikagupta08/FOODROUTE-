const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// ---------------------------
// CORS Configuration
// ---------------------------
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------
// Socket.IO Setup
// ---------------------------
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join-delivery', (deliveryId) => {
    socket.join(`delivery-${deliveryId}`);
  });

  socket.on('leave-delivery', (deliveryId) => {
    socket.leave(`delivery-${deliveryId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

app.set('io', io);

// ---------------------------
// MongoDB Atlas Connection
// ---------------------------
if (!process.env.MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env file");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ---------------------------
// Routes
// ---------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/food', require('./routes/food'));
app.use('/api/receivers', require('./routes/receivers'));
app.use('/api/volunteer', require('./routes/volunteer'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/dashboard', require('./routes/dashboard'));

// ---------------------------
// Health Check
// ---------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'FoodRoute+ API is running'
  });
});

// ---------------------------
// Global Error Handler
// ---------------------------
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : undefined
  });
});

// ---------------------------
// Start Server
// ---------------------------
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = { app, io };