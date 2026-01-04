const request = require('supertest');
const express = require('express');
const accountRoutes = require('../../routes/accounts');
const db = require('../../database/db');
const errorHandler = require('../../middleware/errorHandler');

jest.mock('../../database/db');

const app = express();
app.use(express.json());
app.use('/api/accounts', accountRoutes);
app.use(errorHandler);

describe('Account Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/accounts', () => {
    it('should return all non-deleted accounts', async () => {
      const mockAccounts = [
        { id: 1, name: 'Savings', balance: 100 },
        { id: 2, name: 'Spending', balance: 50 }
      ];

      db.all.mockResolvedValue(mockAccounts);

      const response = await request(app).get('/api/accounts');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccounts);
      expect(db.all).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY name'
      );
    });

    it('should return empty array if no accounts exist', async () => {
      db.all.mockResolvedValue([]);

      const response = await request(app).get('/api/accounts');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      db.all.mockRejectedValue(new Error('Database error'));

      const response = await request(app).get('/api/accounts');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('should return account by id', async () => {
      const mockAccount = { id: 1, name: 'Savings', balance: 100 };

      db.get.mockResolvedValue(mockAccount);

      const response = await request(app).get('/api/accounts/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockAccount);
      expect(db.get).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL',
        ['1']
      );
    });

    it('should return 404 if account not found', async () => {
      db.get.mockResolvedValue(null);

      const response = await request(app).get('/api/accounts/999');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Account not found' });
    });
  });

  describe('POST /api/accounts', () => {
    it('should create new account with default values', async () => {
      const newAccount = {
        id: 1,
        name: 'New Account',
        balance: 0,
        interest_rate: 0,
        compounding_period: 'monthly'
      };

      db.get
        .mockResolvedValueOnce(null) // Check for existing account
        .mockResolvedValueOnce(newAccount); // Return created account

      db.run.mockResolvedValue({ id: 1 });

      const response = await request(app)
        .post('/api/accounts')
        .send({ name: 'New Account' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newAccount);
    });

    it('should create account with custom values', async () => {
      const newAccount = {
        id: 1,
        name: 'Savings',
        balance: 100,
        interest_rate: 0.05,
        compounding_period: 'daily'
      };

      db.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(newAccount);

      db.run.mockResolvedValue({ id: 1 });

      const response = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Savings',
          initial_balance: 100,
          interest_rate: 0.05,
          compounding_period: 'daily'
        });

      expect(response.status).toBe(201);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO accounts'),
        ['Savings', 100, 0.05, 'daily']
      );
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Account name is required' });
    });

    it('should return 400 if account name already exists', async () => {
      db.get.mockResolvedValue({ id: 1, name: 'Existing Account' });

      const response = await request(app)
        .post('/api/accounts')
        .send({ name: 'Existing Account' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Account name already exists' });
    });

    it('should return 400 if name is empty string', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Account name is required' });
    });
  });

  describe('PUT /api/accounts/:id', () => {
    it('should update account', async () => {
      const updatedAccount = {
        id: 1,
        name: 'Updated Account',
        interest_rate: 0.10,
        compounding_period: 'quarterly'
      };

      db.get.mockResolvedValue(updatedAccount);
      db.run.mockResolvedValue({});

      const response = await request(app)
        .put('/api/accounts/1')
        .send({
          name: 'Updated Account',
          interest_rate: 0.10,
          compounding_period: 'quarterly'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedAccount);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts'),
        ['Updated Account', 0.10, 'quarterly', '1']
      );
    });

    it('should return 400 if name is missing', async () => {
      const response = await request(app)
        .put('/api/accounts/1')
        .send({ interest_rate: 0.05 });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Account name is required' });
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should soft delete account', async () => {
      db.run.mockResolvedValue({});

      const response = await request(app).delete('/api/accounts/1');

      expect(response.status).toBe(204);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts SET deleted_at'),
        ['1']
      );
    });

    it('should handle database errors during deletion', async () => {
      db.run.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/accounts/1');

      expect(response.status).toBe(500);
    });
  });
});
