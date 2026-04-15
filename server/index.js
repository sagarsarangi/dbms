const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const queryRoutes = require('./routes/query');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', process.env.CLIENT_URL].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/', queryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'SD Hall Backend is running' });
});

app.listen(PORT, () => {
  console.log(`\n  🏠 SD Hall Backend Server`);
  console.log(`  ========================`);
  console.log(`  → Running on http://localhost:${PORT}`);
  console.log(`  → Health: http://localhost:${PORT}/health\n`);
});

// Export the app so Vercel can deploy it as a Serverless Function
module.exports = app;
