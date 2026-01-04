const TransactionManager = require('../../services/transactionManager');
const db = require('../../database/db');

jest.mock('../../database/db');

describe('TransactionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransaction', () => {
    it('should throw error if account not found', async () => {
      db.get.mockResolvedValue(null);

      await expect(
        TransactionManager.createTransaction({
          accountId: 999,
          type: 'deposit',
          category: 'Allowance',
          amount: 10
        })
      ).rejects.toThrow('Account not found');
    });

    it('should create deposit transaction and update balance', async () => {
      const mockAccount = {
        id: 1,
        name: 'Test Account',
        balance: 100
      };

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
        .mockResolvedValueOnce(mockAccount) // First call for account lookup
        .mockResolvedValueOnce(mockTransaction); // Second call to return transaction

      db.run
        .mockResolvedValueOnce({ id: 1 }) // Transaction insert
        .mockResolvedValueOnce({}); // Balance update

      const result = await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Allowance',
        amount: 50,
        note: 'Weekly allowance'
      });

      expect(result).toEqual(mockTransaction);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([1, 'deposit', 'Allowance', 50, '150.00'])
      );
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts SET balance'),
        ['150.00', 1]
      );
    });

    it('should create withdrawal transaction and update balance', async () => {
      const mockAccount = {
        id: 1,
        name: 'Test Account',
        balance: 100
      };

      db.get.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce({
        id: 2,
        account_id: 1,
        type: 'withdrawal',
        amount: 30,
        balance_after: 70
      });

      db.run.mockResolvedValue({ id: 2 });

      const result = await TransactionManager.createTransaction({
        accountId: 1,
        type: 'withdrawal',
        category: 'Toy',
        amount: 30
      });

      expect(result.balance_after).toBe(70);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts SET balance'),
        ['70.00', 1]
      );
    });

    it('should throw error for insufficient funds', async () => {
      const mockAccount = {
        id: 1,
        name: 'Test Account',
        balance: 50
      };

      db.get.mockResolvedValue(mockAccount);

      await expect(
        TransactionManager.createTransaction({
          accountId: 1,
          type: 'withdrawal',
          category: 'Toy',
          amount: 100
        })
      ).rejects.toThrow('Insufficient funds');

      expect(db.run).not.toHaveBeenCalled();
    });

    it('should create interest transaction and increase balance', async () => {
      const mockAccount = {
        id: 1,
        name: 'Test Account',
        balance: 1000
      };

      db.get.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce({
        id: 3,
        type: 'interest',
        amount: 5.50,
        balance_after: 1005.50
      });

      db.run.mockResolvedValue({ id: 3 });

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'interest',
        category: 'Interest',
        amount: 5.50
      });

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts SET balance'),
        ['1005.50', 1]
      );
    });

    it('should throw error for invalid transaction type', async () => {
      const mockAccount = {
        id: 1,
        balance: 100
      };

      db.get.mockResolvedValue(mockAccount);

      await expect(
        TransactionManager.createTransaction({
          accountId: 1,
          type: 'invalid',
          category: 'Test',
          amount: 10
        })
      ).rejects.toThrow('Invalid transaction type');
    });

    it('should handle decimal amounts correctly', async () => {
      const mockAccount = {
        id: 1,
        balance: 100.50
      };

      db.get.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce({});
      db.run.mockResolvedValue({ id: 1 });

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Test',
        amount: 25.75
      });

      // 100.50 + 25.75 = 126.25
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE accounts SET balance'),
        ['126.25', 1]
      );
    });

    it('should use custom transaction_date if provided', async () => {
      const mockAccount = { id: 1, balance: 100 };
      const customDate = '2024-01-15T10:30:00.000Z';

      db.get.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce({});
      db.run.mockResolvedValue({ id: 1 });

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Test',
        amount: 10,
        transaction_date: customDate
      });

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([customDate])
      );
    });

    it('should use current date if transaction_date not provided', async () => {
      const mockAccount = { id: 1, balance: 100 };

      db.get.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce({});
      db.run.mockResolvedValue({ id: 1 });

      const beforeDate = new Date();

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Test',
        amount: 10
      });

      const afterDate = new Date();

      // Get the call arguments
      const callArgs = db.run.mock.calls[0][1];
      const usedDate = new Date(callArgs[callArgs.length - 1]);

      expect(usedDate.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(usedDate.getTime()).toBeLessThanOrEqual(afterDate.getTime());
    });

    it('should handle note parameter correctly', async () => {
      const mockAccount = { id: 1, balance: 100 };

      db.get.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce({});
      db.run.mockResolvedValue({ id: 1 });

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Test',
        amount: 10,
        note: 'Test note'
      });

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining(['Test note'])
      );
    });

    it('should handle missing note parameter', async () => {
      const mockAccount = { id: 1, balance: 100 };

      db.get.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce({});
      db.run.mockResolvedValue({ id: 1 });

      await TransactionManager.createTransaction({
        accountId: 1,
        type: 'deposit',
        category: 'Test',
        amount: 10
      });

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        expect.arrayContaining([null])
      );
    });
  });

  describe('getTransactions', () => {
    it('should retrieve all transactions for an account', async () => {
      const mockTransactions = [
        { id: 1, account_id: 1, type: 'deposit', amount: 100 },
        { id: 2, account_id: 1, type: 'withdrawal', amount: 50 }
      ];

      db.all.mockResolvedValue(mockTransactions);

      const result = await TransactionManager.getTransactions(1);

      expect(result).toEqual(mockTransactions);
      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM transactions WHERE account_id = ?'),
        [1]
      );
    });

    it('should filter transactions by type', async () => {
      const mockTransactions = [
        { id: 1, account_id: 1, type: 'deposit', amount: 100 }
      ];

      db.all.mockResolvedValue(mockTransactions);

      const result = await TransactionManager.getTransactions(1, { type: 'deposit' });

      expect(result).toEqual(mockTransactions);
      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('AND type = ?'),
        [1, 'deposit']
      );
    });

    it('should order transactions by date descending', async () => {
      db.all.mockResolvedValue([]);

      await TransactionManager.getTransactions(1);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY transaction_date DESC'),
        expect.any(Array)
      );
    });

    it('should exclude deleted transactions', async () => {
      db.all.mockResolvedValue([]);

      await TransactionManager.getTransactions(1);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array)
      );
    });

    it('should return empty array if no transactions found', async () => {
      db.all.mockResolvedValue([]);

      const result = await TransactionManager.getTransactions(999);

      expect(result).toEqual([]);
    });
  });
});
