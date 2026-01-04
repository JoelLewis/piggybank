import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAccounts,
  getAccount,
  createAccount,
  getTransactions,
  createTransaction,
  calculateInterest
} from './api';

// Mock fetch globally
global.fetch = vi.fn();

describe('API Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAccounts', () => {
    it('fetches all accounts successfully', async () => {
      const mockAccounts = [
        { id: 1, name: 'Savings', balance: 100 },
        { id: 2, name: 'Spending', balance: 50 }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAccounts
      } as Response);

      const result = await getAccounts();

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/accounts'));
      expect(result).toEqual(mockAccounts);
    });

    it('throws error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false
      } as Response);

      await expect(getAccounts()).rejects.toThrow('Failed to fetch accounts');
    });
  });

  describe('getAccount', () => {
    it('fetches single account successfully', async () => {
      const mockAccount = { id: 1, name: 'Savings', balance: 100 };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockAccount
      } as Response);

      const result = await getAccount('1');

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/accounts/1'));
      expect(result).toEqual(mockAccount);
    });

    it('throws error when account not found', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false
      } as Response);

      await expect(getAccount('999')).rejects.toThrow('Failed to fetch account');
    });
  });

  describe('createAccount', () => {
    it('creates account successfully', async () => {
      const newAccount = { name: 'New Account', balance: 0 };
      const createdAccount = { id: 1, ...newAccount };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => createdAccount
      } as Response);

      const result = await createAccount(newAccount);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/accounts'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAccount)
        })
      );
      expect(result).toEqual(createdAccount);
    });

    it('throws error with message from server', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Account name already exists' })
      } as Response);

      await expect(createAccount({ name: 'Existing' })).rejects.toThrow('Account name already exists');
    });

    it('throws generic error when no error message provided', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({})
      } as Response);

      await expect(createAccount({ name: 'Test' })).rejects.toThrow('Failed to create account');
    });
  });

  describe('getTransactions', () => {
    it('fetches transactions for account successfully', async () => {
      const mockTransactions = [
        { id: 1, type: 'deposit', amount: 100 },
        { id: 2, type: 'withdrawal', amount: 50 }
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTransactions
      } as Response);

      const result = await getTransactions('1');

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/accounts/1/transactions'));
      expect(result).toEqual(mockTransactions);
    });

    it('throws error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false
      } as Response);

      await expect(getTransactions('1')).rejects.toThrow('Failed to fetch transactions');
    });
  });

  describe('createTransaction', () => {
    it('creates deposit transaction successfully', async () => {
      const transactionData = {
        type: 'deposit',
        amount: 50,
        category: 'Allowance',
        note: 'Weekly allowance'
      };
      const createdTransaction = { id: 1, ...transactionData, balance_after: 150 };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => createdTransaction
      } as Response);

      const result = await createTransaction('1', transactionData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/accounts/1/transactions'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData)
        })
      );
      expect(result).toEqual(createdTransaction);
    });

    it('creates withdrawal transaction successfully', async () => {
      const transactionData = {
        type: 'withdrawal',
        amount: 25,
        category: 'Toy',
        note: ''
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 2, ...transactionData })
      } as Response);

      await createTransaction('1', transactionData);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/accounts/1/transactions'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws error for insufficient funds', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Insufficient funds' })
      } as Response);

      await expect(
        createTransaction('1', { type: 'withdrawal', amount: 1000, category: 'Toy', note: '' })
      ).rejects.toThrow('Insufficient funds');
    });

    it('throws generic error when no error message provided', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({})
      } as Response);

      await expect(
        createTransaction('1', { type: 'deposit', amount: 50, category: 'Test', note: '' })
      ).rejects.toThrow('Failed to create transaction');
    });
  });

  describe('calculateInterest', () => {
    it('calculates interest successfully', async () => {
      const mockResponse = { message: 'Interest calculated', amount: 5.50 };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await calculateInterest('1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/accounts/1/calculate-interest'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual(mockResponse);
    });

    it('returns no interest due message', async () => {
      const mockResponse = { message: 'No interest due' };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await calculateInterest('1');

      expect(result).toEqual(mockResponse);
    });

    it('throws error when calculation fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false
      } as Response);

      await expect(calculateInterest('1')).rejects.toThrow('Failed to calculate interest');
    });
  });

  describe('API base URL', () => {
    it('uses correct endpoint paths', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => []
      } as Response);

      await getAccounts();
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/accounts'));

      await getAccount('1');
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/accounts/1'));

      await getTransactions('1');
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('/accounts/1/transactions'));

      await createTransaction('1', { type: 'deposit', amount: 10, category: 'Test', note: '' });
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/accounts/1/transactions'),
        expect.anything()
      );

      await calculateInterest('1');
      expect(fetch).toHaveBeenLastCalledWith(
        expect.stringContaining('/accounts/1/calculate-interest'),
        expect.anything()
      );
    });
  });
});
