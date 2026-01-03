require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Firebase
require('./config/firebase');

// Import routes
const authRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');

const app = express();

// ==========================================
// MIDDLEWARES - SESUAIKAN UNTUK VERCEL
// ==========================================
// Increase payload size limit untuk file upload
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Content-Length']
}));

// Handle preflight requests
app.options('*', cors());

// ==========================================
// ROUTES
// ==========================================
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Server is running'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true,
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', authRoutes);
app.use('/api', customerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error.message || error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Export untuk Vercel
module.exports = app;