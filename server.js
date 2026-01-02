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
// MIDDLEWARES
// ==========================================

// CORS Configuration - Allow all origins for development
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Content-Length', 'X-JSON'],
  maxAge: 86400, // 24 hours
}));

// Handle preflight requests
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// ==========================================
// ROUTES
// ==========================================

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PT Kuda Jaya Abadi Raya - API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/api/users',
      customers: '/api/customers',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api', authRoutes);
app.use('/api', customerRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message,
  });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('\n🚀 ============================================');
  console.log('🚀  PT Kuda Jaya Abadi Raya - Backend Server');
  console.log('🚀 ============================================');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log('🚀 ============================================\n');
  
  console.log('📚 Available Endpoints:');
  console.log('  POST   /api/users/signup          - Register new user');
  console.log('  POST   /api/users/login           - Login user');
  console.log('  GET    /api/users/profile         - Get user profile (protected)');
  console.log('  PUT    /api/users/profile         - Update profile (protected)');
  console.log('  PUT    /api/users/change-password - Change password (protected)');
  console.log('');
  console.log('👥 CUSTOMER ENDPOINTS (User & Paid User Only):');
  console.log('  GET    /api/customers             - Get all customers');
  console.log('  GET    /api/customers/stats       - Get customer statistics');
  console.log('  GET    /api/customers/:id         - Get customer by ID');
  console.log('  POST   /api/customers             - Create new customer');
  console.log('  PUT    /api/customers/:id         - Update customer');
  console.log('  DELETE /api/customers/:id         - Delete customer');
  console.log('  POST   /api/customers/:id/upload-photos - Upload car photos');
  console.log('');
});

module.exports = app;