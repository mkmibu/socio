const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// Security
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Compression
app.use(compression());

// ============================================
// DATABASE CONNECTION
// ============================================

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sociaboost';

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');
  })
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  });

// ============================================
// ROUTES (To be implemented)
// ============================================

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// Welcome
app.get('/', (req, res) => {
  res.json({
    name: 'SociaBoost API',
    version: '1.0.0',
    description: 'Platform Social Media Exchange #1 di Indonesia',
    docs: '/api/docs',
    health: '/api/health',
  });
});

// Routes placeholder
// app.use('/api/auth', require('./src/routes/auth'));
// app.use('/api/campaigns', require('./src/routes/campaigns'));
// app.use('/api/tasks', require('./src/routes/tasks'));
// app.use('/api/topup', require('./src/routes/topup'));
// app.use('/api/admin', require('./src/routes/admin'));

// ============================================
// ERROR HANDLING
// ============================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    status: 404,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// SERVER START
// ============================================

app.listen(PORT, () => {
  console.log(`\n🚀 SociaBoost API Server Running on Port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${mongoUri}`);
  console.log(`\n✅ Ready to accept requests!\n`);
});

module.exports = app;
