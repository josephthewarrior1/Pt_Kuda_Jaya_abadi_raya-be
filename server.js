require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize Firebase
require('./config/firebase');

// Import routes
const authRoutes = require('./routes/userRoutes');
const customerRoutes = require('./routes/customerRoutes');
const carRoutes = require('./routes/carRoutes');
const companyRoutes = require('./routes/companyRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const renewalRoutes = require('./routes/renewalRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const kwitansiRoutes = require('./routes/kwitansiRoutes');
const quotationRoutes = require('./routes/quotationRoutes');

// Import cron
const { startReminderCron } = require('./src/cron/reminderCron');

const app = express();

// ==========================================
// MIDDLEWARES
// ==========================================

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://customer-management-insurance.vercel.app',
  // Tambah domain lain di sini kalau perlu
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is in allowedOrigins or matches Vercel preview deployment URLs
    const isAllowedVercel = /^https:\/\/customer-management-insurance(-[a-zA-Z0-9-]+)?\.vercel\.app$/.test(origin);

    if (allowedOrigins.includes(origin) || isAllowedVercel) {
      callback(null, true);
    } else {
      console.warn('🚫 CORS blocked for origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

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
app.use('/api', carRoutes);
app.use('/api', companyRoutes);
app.use('/api', reminderRoutes);
app.use('/api', paymentRoutes);
app.use('/api', renewalRoutes);
app.use('/api', invoiceRoutes);
app.use('/api', kwitansiRoutes);
app.use('/api', quotationRoutes);

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
  console.log('👥 CUSTOMER ENDPOINTS:');
  console.log('  GET    /api/customers             - Get all customers');
  console.log('  GET    /api/customers/:id         - Get customer by ID');
  console.log('  POST   /api/customers             - Create new customer');
  console.log('  PUT    /api/customers/:id         - Update customer');
  console.log('  DELETE /api/customers/:id         - Delete customer');
  console.log('');
  console.log('🧾 INVOICE ENDPOINTS:');
  console.log('  GET    /api/invoices              - Get all invoices');
  console.log('  GET    /api/invoices/:id          - Get invoice by ID');
  console.log('  POST   /api/invoices              - Create new invoice');
  console.log('  PUT    /api/invoices/:id          - Update invoice');
  console.log('');
  console.log('💳 PAYMENT ENDPOINTS:');
  console.log('  GET    /api/payments                 - Get all payment records');
  console.log('  GET    /api/payments/:id             - Get payment by ID');
  console.log('  GET    /api/payments/customer/:id    - Get payments by customer');
  console.log('  GET    /api/payments/status/:status  - Get payments by status');
  console.log('  POST   /api/payments                 - Create payment record');
  console.log('  PUT    /api/payments/:id             - Update payment record');
  console.log('  POST   /api/payments/:id/upload-proof - Upload payment proof');
  console.log('');
  console.log('📄 KWITANSI ENDPOINTS:');
  console.log('  POST   /api/kwitansi/generate        - Generate or update kwitansi');
  console.log('  GET    /api/kwitansi                 - Get all kwitansi');
  console.log('  GET    /api/kwitansi/:id             - Get kwitansi by ID');
  console.log('');
  console.log('📝 QUOTATION ENDPOINTS:');
  console.log('  POST   /api/quotations               - Create quotation');
  console.log('  GET    /api/quotations/policy/:id    - Get quotations by policy');
  console.log('  POST   /api/quotations/:id/accept    - Accept quotation (syncs to Car)');
  console.log('');
  console.log('🔄 RENEWAL ENDPOINTS:');
  console.log('  GET    /api/renewals                  - Get all renewals');
  console.log('  GET    /api/renewals/:id              - Get renewal by ID');
  console.log('  GET    /api/renewals/customer/:id     - Get renewals by customer');
  console.log('  GET    /api/renewals/status/:status   - Get renewals by status');
  console.log('  POST   /api/renewals                  - Create renewal');
  console.log('  PUT    /api/renewals/:id              - Update renewal');
  console.log('  POST   /api/renewals/:id/complete     - Complete renewal');
  console.log('');
  console.log('📧 REMINDER ENDPOINTS:');
  console.log('  POST   /api/reminders/send        - Send reminder to self');
  console.log('');

  // Start cron job
  startReminderCron();
});

module.exports = app;
