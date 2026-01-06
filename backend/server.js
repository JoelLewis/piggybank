const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const { runDailyInterest } = require('./jobs/dailyInterest');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middleware
// Restrict CORS to allowed origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  }
}));

// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());

// Routes
app.use('/api/accounts', accountRoutes);
app.use('/api', transactionRoutes); // Note: transactionRoutes includes /accounts/:id/... paths

// Error handling
app.use(errorHandler);

// Schedule daily interest calculation (runs at 1:00 AM)
cron.schedule('0 1 * * *', runDailyInterest);

app.listen(PORT, () => {
  console.log(`Piggybank API running on port ${PORT}`);
});
