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
// CORS configuration
app.use(cors({
  origin: '*', // Allow all origins for now
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// Handle preflight requests
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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
  res.status(200).json({ success: true });
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
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;