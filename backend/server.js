const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const { runDailyInterest } = require('./jobs/dailyInterest');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
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
