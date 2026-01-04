const { runDailyInterest } = require('../../jobs/dailyInterest');
const db = require('../../database/db');
const InterestCalculator = require('../../services/interestCalculator');

jest.mock('../../database/db');
jest.mock('../../services/interestCalculator');

describe('Daily Interest Job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  it('should process interest for all non-deleted accounts with positive balance', async () => {
    const mockAccounts = [
      { id: 1, name: 'Account 1', balance: 1000 },
      { id: 2, name: 'Account 2', balance: 500 },
      { id: 3, name: 'Account 3', balance: 2000 }
    ];

    db.all.mockResolvedValue(mockAccounts);
    InterestCalculator.calculateInterest
      .mockResolvedValueOnce(5.50)
      .mockResolvedValueOnce(2.75)
      .mockResolvedValueOnce(11.00);

    await runDailyInterest();

    expect(db.all).toHaveBeenCalledWith(
      'SELECT * FROM accounts WHERE deleted_at IS NULL AND balance > 0'
    );
    expect(InterestCalculator.calculateInterest).toHaveBeenCalledTimes(3);
    expect(InterestCalculator.calculateInterest).toHaveBeenCalledWith(1);
    expect(InterestCalculator.calculateInterest).toHaveBeenCalledWith(2);
    expect(InterestCalculator.calculateInterest).toHaveBeenCalledWith(3);

    expect(console.log).toHaveBeenCalledWith('Running daily interest calculation...');
    expect(console.log).toHaveBeenCalledWith('Added $5.50 interest to Account 1\'s account');
    expect(console.log).toHaveBeenCalledWith('Added $2.75 interest to Account 2\'s account');
    expect(console.log).toHaveBeenCalledWith('Added $11.00 interest to Account 3\'s account');
    expect(console.log).toHaveBeenCalledWith('Daily interest calculation complete');
  });

  it('should handle accounts with no interest due', async () => {
    const mockAccounts = [
      { id: 1, name: 'Account 1', balance: 1000 },
      { id: 2, name: 'Account 2', balance: 500 }
    ];

    db.all.mockResolvedValue(mockAccounts);
    InterestCalculator.calculateInterest
      .mockResolvedValueOnce(null) // No interest due
      .mockResolvedValueOnce(2.50);

    await runDailyInterest();

    expect(InterestCalculator.calculateInterest).toHaveBeenCalledTimes(2);
    // Only one log for the account that earned interest
    expect(console.log).toHaveBeenCalledWith('Added $2.50 interest to Account 2\'s account');
    // Should not log anything for Account 1 since no interest was added
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Account 1'));
  });

  it('should handle empty account list', async () => {
    db.all.mockResolvedValue([]);

    await runDailyInterest();

    expect(db.all).toHaveBeenCalled();
    expect(InterestCalculator.calculateInterest).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith('Running daily interest calculation...');
    expect(console.log).toHaveBeenCalledWith('Daily interest calculation complete');
  });

  it('should handle database errors gracefully', async () => {
    db.all.mockRejectedValue(new Error('Database connection failed'));

    await runDailyInterest();

    expect(console.log).toHaveBeenCalledWith('Running daily interest calculation...');
    expect(console.error).toHaveBeenCalledWith(
      'Error running daily interest:',
      expect.any(Error)
    );
    expect(InterestCalculator.calculateInterest).not.toHaveBeenCalled();
  });

  it('should log error if calculation fails for an account', async () => {
    const mockAccounts = [
      { id: 1, name: 'Account 1', balance: 1000 }
    ];

    db.all.mockResolvedValue(mockAccounts);
    InterestCalculator.calculateInterest.mockRejectedValue(new Error('Calculation error'));

    // Should not throw - errors are caught and logged
    await runDailyInterest();

    expect(console.error).toHaveBeenCalledWith(
      'Error running daily interest:',
      expect.any(Error)
    );
  });

  it('should format interest amounts correctly in logs', async () => {
    const mockAccounts = [
      { id: 1, name: 'Test Account', balance: 1000 }
    ];

    db.all.mockResolvedValue(mockAccounts);
    InterestCalculator.calculateInterest.mockResolvedValue(11.00);

    await runDailyInterest();

    expect(console.log).toHaveBeenCalledWith('Added $11.00 interest to Test Account\'s account');
  });

  it('should only process accounts with balance > 0', async () => {
    // The query itself filters this, but we verify the query is correct
    db.all.mockResolvedValue([]);

    await runDailyInterest();

    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining('balance > 0')
    );
  });

  it('should only process non-deleted accounts', async () => {
    db.all.mockResolvedValue([]);

    await runDailyInterest();

    expect(db.all).toHaveBeenCalledWith(
      expect.stringContaining('deleted_at IS NULL')
    );
  });
});
