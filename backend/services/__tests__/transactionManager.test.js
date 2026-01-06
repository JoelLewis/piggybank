const TransactionManager = require('../transactionManager');
const db = require('../../database/db');

// Mock the database module
jest.mock('../../database/db');

describe('TransactionManager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should create a deposit transaction and update balance', async () => {
      const mockAccount = {
        id: 1,
        balance: 100,
        deleted_at: null
      };

      const mockTransactionResult = { id: 1 };
      const mockTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        category: 'Allowance',
        amount: 50,
        balance_after: 150,
        note: 'Weekly allowance'
      };

      db.get
        .mockResolvedValueOnce(mockAccount) // Get account
        .mockResolvedValueOnce(mockTransaction); // Get created transaction

      db.run
        .mockResolvedValueOnce(mockTransactionResult) // Insert transaction
        .mockResolvedValueOnce({}); // Update account balance

      const result = await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Allowance',
        amount: 50,
        note: 'Weekly allowance'
      });

      expect(result).toEqual(mockTransaction);
      expect(db.get).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenCalledTimes(2);

      // Verify balance was updated correctly
      const updateCall = db.run.mock.calls[1];
      expect(updateCall[1][0]).toBe('150.00'); // New balance
    });

    it('should create a withdrawal transaction and decrease balance', async () => {
      const mockAccount = {
        id: 1,
        balance: 100,
        deleted_at: null
      };

      const mockTransactionResult = { id: 1 };
      const mockTransaction = {
        id: 1,
        account_id: 1,
        type: 'withdrawal',
        category: 'Toy',
        amount: 30,
        balance_after: 70
      };

      db.get
        .mockResolvedValueOnce(mockAccount) // Get account
        .mockResolvedValueOnce(mockTransaction); // Get created transaction

      db.run
        .mockResolvedValueOnce(mockTransactionResult) // Insert transaction
        .mockResolvedValueOnce({}); // Update account balance

      const result = await TransactionManager.createTransaction({
        accountId: 1,
        type: 'withdrawal',
        category: 'Toy',
        amount: 30
      });

      // Check that withdrawal decreased the balance
      const transactionInsertCall = db.run.mock.calls[0];
      const balanceAfter = transactionInsertCall[1][4]; // 5th parameter is balance_after
      expect(balanceAfter).toBe('70.00');
    });

    it('should throw error for insufficient funds', async () => {
      const mockAccount = {
        id: 1,
        balance: 10,
        deleted_at: null
      };

      db.get.mockResolvedValueOnce(mockAccount);

      await expect(
        TransactionManager.createTransaction({
          accountId: 1,
          type: 'withdrawal',
          category: 'Toy',
          amount: 50
        })
      ).rejects.toThrow('Insufficient funds');
    });

    it('should throw error for invalid transaction type', async () => {
      const mockAccount = {
        id: 1,
        balance: 100,
        deleted_at: null
      };

      db.get.mockResolvedValueOnce(mockAccount);

      await expect(
        TransactionManager.createTransaction({
          accountId: 1,
          type: 'invalid',
          category: 'Test',
          amount: 10
        })
      ).rejects.toThrow('Invalid transaction type');
    });

    it('should throw error if account not found', async () => {
      db.get.mockResolvedValueOnce(null);

      await expect(
        TransactionManager.createTransaction({
          accountId: 999,
          type: 'deposit',
          category: 'Test',
          amount: 10
        })
      ).rejects.toThrow('Account not found');
    });

    it('should handle interest transactions correctly', async () => {
      const mockAccount = {
        id: 1,
        balance: 100,
        deleted_at: null
      };

      const mockTransactionResult = { id: 1 };
      const mockTransaction = {
        id: 1,
        account_id: 1,
        type: 'interest',
        category: 'Interest',
        amount: 5,
        balance_after: 105
      };

      db.get
        .mockResolvedValueOnce(mockAccount) // Get account
        .mockResolvedValueOnce(mockTransaction); // Get created transaction

      db.run
        .mockResolvedValueOnce(mockTransactionResult) // Insert transaction
        .mockResolvedValueOnce({}); // Update account balance

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'interest',
        category: 'Interest',
        amount: 5
      });

      // Interest should increase balance like a deposit
      const transactionInsertCall = db.run.mock.calls[0];
      const balanceAfter = transactionInsertCall[1][4];
      expect(balanceAfter).toBe('105.00');
    });

    it('should format balance to 2 decimal places', async () => {
      const mockAccount = {
        id: 1,
        balance: 100.999,
        deleted_at: null
      };

      const mockTransactionResult = { id: 1 };
      const mockTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        category: 'Test',
        amount: 10.111,
        balance_after: 111.11
      };

      db.get
        .mockResolvedValueOnce(mockAccount) // Get account
        .mockResolvedValueOnce(mockTransaction); // Get created transaction

      db.run
        .mockResolvedValueOnce(mockTransactionResult) // Insert transaction
        .mockResolvedValueOnce({}); // Update account balance

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Test',
        amount: 10.111
      });

      const transactionInsertCall = db.run.mock.calls[0];
      const balanceAfter = transactionInsertCall[1][4];

      // Should be properly formatted to 2 decimals
      expect(balanceAfter).toBe('111.11');
    });
  });

  describe('getTransactions', () => {
    it('should retrieve all transactions for an account', async () => {
      const mockTransactions = [
        { id: 1, type: 'deposit', amount: 50 },
        { id: 2, type: 'withdrawal', amount: 20 }
      ];

      db.all.mockResolvedValueOnce(mockTransactions);

      const result = await TransactionManager.getTransactions(1);

      expect(result).toEqual(mockTransactions);
      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM transactions'),
        [1]
      );
    });

    it('should filter transactions by type', async () => {
      const mockTransactions = [
        { id: 1, type: 'deposit', amount: 50 }
      ];

      db.all.mockResolvedValueOnce(mockTransactions);

      await TransactionManager.getTransactions(1, { type: 'deposit' });

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('AND type = ?'),
        [1, 'deposit']
      );
    });

    it('should exclude deleted transactions', async () => {
      db.all.mockResolvedValueOnce([]);

      await TransactionManager.getTransactions(1);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should sort transactions by date descending', async () => {
      db.all.mockResolvedValueOnce([]);

      await TransactionManager.getTransactions(1);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY transaction_date DESC'),
        expect.any(Array)
      );
    });
  });

  describe('recalculateBalances', () => {
    it('should recalculate balances correctly for multiple transactions', async () => {
      const mockTransactions = [
        { id: 1, type: 'deposit', amount: 100 },
        { id: 2, type: 'withdrawal', amount: 30 },
        { id: 3, type: 'interest', amount: 5 },
        { id: 4, type: 'withdrawal', amount: 10 }
      ];

      db.all.mockResolvedValueOnce(mockTransactions);
      db.run.mockResolvedValue({});

      await TransactionManager.recalculateBalances(1);

      // Should update each transaction's balance_after
      expect(db.run).toHaveBeenCalledTimes(5); // 4 transactions + 1 account update

      // Check the balance calculations
      const calls = db.run.mock.calls;

      // First transaction: +100 = 100
      expect(calls[0][1][0]).toBe('100.00');

      // Second transaction: 100-30 = 70
      expect(calls[1][1][0]).toBe('70.00');

      // Third transaction: 70+5 = 75
      expect(calls[2][1][0]).toBe('75.00');

      // Fourth transaction: 75-10 = 65
      expect(calls[3][1][0]).toBe('65.00');

      // Final account balance: 65
      expect(calls[4][1][0]).toBe('65.00');
    });

    it('should handle zero transactions', async () => {
      db.all.mockResolvedValueOnce([]);
      db.run.mockResolvedValue({});

      await TransactionManager.recalculateBalances(1);

      // Should still update account balance to 0
      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts'),
        ['0.00', 1]
      );
    });

    it('should return the final balance', async () => {
      const mockTransactions = [
        { id: 1, type: 'deposit', amount: 50 },
        { id: 2, type: 'deposit', amount: 25 }
      ];

      db.all.mockResolvedValueOnce(mockTransactions);
      db.run.mockResolvedValue({});

      const finalBalance = await TransactionManager.recalculateBalances(1);

      expect(finalBalance).toBe(75);
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction and recalculate balances', async () => {
      const mockOldTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        amount: 50,
        category: 'Allowance',
        note: 'Old note',
        transaction_date: '2024-01-01'
      };

      const mockUpdatedTransaction = {
        ...mockOldTransaction,
        amount: 75,
        note: 'Updated note'
      };

      db.get
        .mockResolvedValueOnce(mockOldTransaction) // Get old transaction
        .mockResolvedValueOnce({ id: 1 }) // Get account
        .mockResolvedValueOnce(mockUpdatedTransaction) // Get updated transaction
        .mockResolvedValueOnce({ min_balance: 10 }); // Check for negative balances

      db.run.mockResolvedValue({});
      db.all.mockResolvedValueOnce([mockUpdatedTransaction]);

      const result = await TransactionManager.updateTransaction(1, {
        amount: 75,
        note: 'Updated note'
      });

      expect(result).toEqual(mockUpdatedTransaction);
      expect(db.run).toHaveBeenCalled();
    });

    it('should rollback if edit would create negative balance', async () => {
      const mockOldTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        amount: 100,
        category: 'Test',
        note: 'Test',
        transaction_date: '2024-01-01'
      };

      db.get
        .mockResolvedValueOnce(mockOldTransaction)
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ ...mockOldTransaction, amount: 10 })
        .mockResolvedValueOnce({ min_balance: -50 }); // Negative balance!

      db.run.mockResolvedValue({});
      db.all.mockResolvedValue([]);

      await expect(
        TransactionManager.updateTransaction(1, { amount: 10 })
      ).rejects.toThrow('Transaction edit would create negative balance in history');

      // Should have called rollback
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE transactions'),
        expect.arrayContaining([mockOldTransaction.amount])
      );
    });

    it('should throw error if transaction not found', async () => {
      db.get.mockResolvedValueOnce(null);

      await expect(
        TransactionManager.updateTransaction(999, { amount: 100 })
      ).rejects.toThrow('Transaction not found');
    });
  });

  describe('deleteTransaction', () => {
    it('should soft delete transaction and recalculate balances', async () => {
      const mockTransaction = {
        id: 1,
        account_id: 1,
        type: 'deposit',
        amount: 50
      };

      db.get.mockResolvedValueOnce(mockTransaction);
      db.run.mockResolvedValue({});
      db.all.mockResolvedValueOnce([]);

      const result = await TransactionManager.deleteTransaction(1);

      expect(result.message).toBe('Transaction deleted successfully');
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE transactions SET deleted_at'),
        [1]
      );
    });

    it('should throw error if transaction not found', async () => {
      db.get.mockResolvedValueOnce(null);

      await expect(
        TransactionManager.deleteTransaction(999)
      ).rejects.toThrow('Transaction not found');
    });
  });
});
