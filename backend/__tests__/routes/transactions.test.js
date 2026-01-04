const request = require('supertest');
const express = require('express');
const transactionRoutes = require('../../routes/transactions');
const TransactionManager = require('../../services/transactionManager');
const InterestCalculator = require('../../services/interestCalculator');
const errorHandler = require('../../middleware/errorHandler');

jest.mock('../../services/transactionManager');
jest.mock('../../services/interestCalculator');

const app = express();
app.use(express.json());
app.use('/api', transactionRoutes);
app.use(errorHandler);

describe('Transaction Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/accounts/:accountId/transactions', () => {
    it('should return all transactions for an account', async () => {
      const mockTransactions = [
        { id: 1, account_id: 1, type: 'deposit', amount: 100 },
        { id: 2, account_id: 1, type: 'withdrawal', amount: 50 }
      ];

      TransactionManager.getTransactions.mockResolvedValue(mockTransactions);

      const response = await request(app).get('/api/accounts/1/transactions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockTransactions);
      expect(TransactionManager.getTransactions).toHaveBeenCalledWith('1');
    });

    it('should handle errors when fetching transactions', async () => {
      TransactionManager.getTransactions.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/accounts/1/transactions');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/accounts/:accountId/transactions', () => {
    it('should create a deposit transaction', async () => {
      const newTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        category: 'Allowance',
        amount: 50,
        balance_after: 150
      };

      TransactionManager.createTransaction.mockResolvedValue(newTransaction);

      const response = await request(app)
        .post('/api/accounts/1/transactions')
        .send({
          type: 'deposit',
          category: 'Allowance',
          amount: 50,
          note: 'Weekly allowance'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newTransaction);
      expect(TransactionManager.createTransaction).toHaveBeenCalledWith({
        accountId: '1',
        type: 'deposit',
        category: 'Allowance',
        amount: 50,
        note: 'Weekly allowance',
        transaction_date: undefined
      });
    });

    it('should create a withdrawal transaction', async () => {
      const newTransaction = {
        id: 2,
        account_id: 1,
        type: 'withdrawal',
        category: 'Toy',
        amount: 30,
        balance_after: 70
      };

      TransactionManager.createTransaction.mockResolvedValue(newTransaction);

      const response = await request(app)
        .post('/api/accounts/1/transactions')
        .send({
          type: 'withdrawal',
          category: 'Toy',
          amount: 30
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newTransaction);
    });

    it('should return 400 for insufficient funds', async () => {
      TransactionManager.createTransaction.mockRejectedValue(
        new Error('Insufficient funds')
      );

      const response = await request(app)
        .post('/api/accounts/1/transactions')
        .send({
          type: 'withdrawal',
          category: 'Toy',
          amount: 1000
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Insufficient funds' });
    });

    it('should handle custom transaction date', async () => {
      const customDate = '2024-01-15T10:30:00.000Z';
      const newTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        amount: 50,
        transaction_date: customDate
      };

      TransactionManager.createTransaction.mockResolvedValue(newTransaction);

      const response = await request(app)
        .post('/api/accounts/1/transactions')
        .send({
          type: 'deposit',
          category: 'Test',
          amount: 50,
          transaction_date: customDate
        });

      expect(response.status).toBe(201);
      expect(TransactionManager.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ transaction_date: customDate })
      );
    });
  });

  describe('POST /api/accounts/:accountId/calculate-interest', () => {
    it('should calculate and return interest amount', async () => {
      InterestCalculator.calculateInterest.mockResolvedValue(5.50);

      const response = await request(app)
        .post('/api/accounts/1/calculate-interest');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Interest calculated',
        amount: 5.50
      });
      expect(InterestCalculator.calculateInterest).toHaveBeenCalledWith('1');
    });

    it('should return message when no interest is due', async () => {
      InterestCalculator.calculateInterest.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/accounts/1/calculate-interest');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'No interest due' });
    });

    it('should handle errors during interest calculation', async () => {
      InterestCalculator.calculateInterest.mockRejectedValue(
        new Error('Calculation error')
      );

      const response = await request(app)
        .post('/api/accounts/1/calculate-interest');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 if account not found during interest calculation', async () => {
      InterestCalculator.calculateInterest.mockRejectedValue(
        new Error('Account not found')
      );

      const response = await request(app)
        .post('/api/accounts/999/calculate-interest');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Account not found' });
    });
  });
});
