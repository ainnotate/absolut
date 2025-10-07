require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./models/database');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const assetRoutes = require('./routes/assetRoutes');

const app = express();
const PORT = process.env.PORT || 5003;

app.use(cors({
  origin: [
    'http://localhost:3002', 
    'http://localhost:3000',
    'http://192.168.29.158:3002',
    'http://192.168.29.158:3000'
  ],
  credentials: true
}));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api', uploadRoutes);
app.use('/api', assetRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Absolute Platform API is running',
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    await initializeDatabase();
    console.log('✅ Database initialized successfully');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Absolute Platform Server running on http://localhost:${PORT}`);
      console.log(`🌐 Mobile access: http://192.168.29.158:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();