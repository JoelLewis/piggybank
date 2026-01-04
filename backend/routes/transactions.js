const express = require('express');
const router = express.Router();
const TransactionManager = require('../services/transactionManager');
const InterestCalculator = require('../services/interestCalculator');

// GET transactions for account
router.get('/accounts/:accountId/transactions', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const transactions = await TransactionManager.getTransactions(accountId);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// POST create transaction
router.post('/accounts/:accountId/transactions', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const { type, category, amount, note, transaction_date } = req.body;
    
    const transaction = await TransactionManager.createTransaction({
      accountId,
      type,
      category,
      amount,
      note,
      transaction_date
    });
    
    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

// POST manual interest calculation
router.post('/accounts/:accountId/calculate-interest', async (req, res, next) => {
    try {
        const { accountId } = req.params;
        const interest = await InterestCalculator.calculateInterest(accountId);
        if (interest) {
            res.json({ message: 'Interest calculated', amount: interest });
        } else {
            res.json({ message: 'No interest due' });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;
