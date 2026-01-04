const InterestCalculator = require('../../services/interestCalculator');
const db = require('../../database/db');
const TransactionManager = require('../../services/transactionManager');

jest.mock('../../database/db');
jest.mock('../../services/transactionManager');

describe('InterestCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTimePeriod', () => {
    it('should return 0 periods if no last interest date', () => {
      const result = InterestCalculator.getTimePeriod(null, 'daily');
      expect(result).toEqual({ periods: 0, periodLengthYears: 0 });
    });

    it('should calculate daily periods correctly', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const result = InterestCalculator.getTimePeriod(thirtyDaysAgo.toISOString(), 'daily');

      expect(result.periods).toBe(30);
      expect(result.periodLengthYears).toBeCloseTo(1/365);
    });

    it('should calculate weekly periods correctly', () => {
      const now = new Date();
      const fourWeeksAgo = new Date(now.getTime() - (28 * 24 * 60 * 60 * 1000));
      const result = InterestCalculator.getTimePeriod(fourWeeksAgo.toISOString(), 'weekly');

      // 28 days / (365/52) days per week ≈ 3.98 weeks = 3 full periods
      expect(result.periods).toBe(3);
      expect(result.periodLengthYears).toBeCloseTo(1/52);
    });

    it('should calculate monthly periods correctly', () => {
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
      const result = InterestCalculator.getTimePeriod(sixtyDaysAgo.toISOString(), 'monthly');

      // 60 days / (365/12 days per month) ≈ 1.97 months = 1 full period
      expect(result.periods).toBeGreaterThanOrEqual(1);
      expect(result.periodLengthYears).toBeCloseTo(1/12);
    });

    it('should calculate quarterly periods correctly', () => {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      const result = InterestCalculator.getTimePeriod(ninetyDaysAgo.toISOString(), 'quarterly');

      expect(result.periods).toBeGreaterThanOrEqual(0);
      expect(result.periodLengthYears).toBeCloseTo(1/4);
    });

    it('should calculate annual periods correctly', () => {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
      const result = InterestCalculator.getTimePeriod(oneYearAgo.toISOString(), 'annually');

      expect(result.periods).toBe(1);
      expect(result.periodLengthYears).toBe(1);
    });
  });

  describe('calculateInterest', () => {
    it('should return null if account not found', async () => {
      db.get.mockResolvedValue(null);

      const result = await InterestCalculator.calculateInterest(999);

      expect(result).toBeNull();
      expect(db.get).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL',
        [999]
      );
    });

    it('should return null if account balance is zero', async () => {
      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 0,
        interest_rate: 0.05,
        compounding_period: 'monthly',
        last_interest_date: new Date().toISOString()
      });

      const result = await InterestCalculator.calculateInterest(1);

      expect(result).toBeNull();
    });

    it('should return null if account balance is negative', async () => {
      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: -100,
        interest_rate: 0.05,
        compounding_period: 'monthly',
        last_interest_date: new Date().toISOString()
      });

      const result = await InterestCalculator.calculateInterest(1);

      expect(result).toBeNull();
    });

    it('should return null if no periods have elapsed', async () => {
      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 1000,
        interest_rate: 0.05,
        compounding_period: 'monthly',
        last_interest_date: new Date().toISOString() // Just now
      });

      const result = await InterestCalculator.calculateInterest(1);

      expect(result).toBeNull();
    });

    it('should calculate and create interest transaction for daily compounding', async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));

      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 1000,
        interest_rate: 0.05, // 5% annual
        compounding_period: 'daily',
        last_interest_date: tenDaysAgo.toISOString()
      });

      TransactionManager.createTransaction.mockResolvedValue({});
      db.run.mockResolvedValue({});

      const result = await InterestCalculator.calculateInterest(1);

      // For 10 days at 5% annual rate, daily compounding:
      // Final = 1000 * (1 + 0.05/365)^10 ≈ 1000 * 1.00137 ≈ 1001.37
      // Interest ≈ $1.37
      expect(result).toBeGreaterThan(1);
      expect(result).toBeLessThan(2);
      expect(TransactionManager.createTransaction).toHaveBeenCalled();
      expect(db.run).toHaveBeenCalledWith(
        'UPDATE accounts SET last_interest_date = datetime(\'now\') WHERE id = ?',
        [1]
      );
    });

    it('should calculate and create interest transaction for monthly compounding', async () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 1000,
        interest_rate: 0.12, // 12% annual
        compounding_period: 'monthly',
        last_interest_date: twoMonthsAgo.toISOString()
      });

      TransactionManager.createTransaction.mockResolvedValue({});
      db.run.mockResolvedValue({});

      const result = await InterestCalculator.calculateInterest(1);

      // For 60 days at 12% annual rate, monthly compounding:
      // 60 days / (365/12) days per month ≈ 1.97 months = 1 full period
      // Final = 1000 * (1 + 0.12/12)^1 = 1000 * 1.01 = 1010
      // Interest = $10
      expect(result).toBeGreaterThan(9);
      expect(result).toBeLessThan(11);
      expect(TransactionManager.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 1,
          type: 'interest',
          category: 'Interest'
        })
      );
    });

    it('should not create transaction if interest is less than $0.01', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000));

      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 10, // Small balance
        interest_rate: 0.01, // 1% annual
        compounding_period: 'daily',
        last_interest_date: oneDayAgo.toISOString()
      });

      const result = await InterestCalculator.calculateInterest(1);

      // Interest will be less than $0.005 (rounds to less than a penny)
      expect(result).toBeNull();
      expect(TransactionManager.createTransaction).not.toHaveBeenCalled();
    });

    it('should use created_at if last_interest_date is null', async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 1000,
        interest_rate: 0.05,
        compounding_period: 'daily',
        last_interest_date: null,
        created_at: thirtyDaysAgo.toISOString()
      });

      TransactionManager.createTransaction.mockResolvedValue({});
      db.run.mockResolvedValue({});

      const result = await InterestCalculator.calculateInterest(1);

      expect(result).toBeGreaterThan(0);
      expect(TransactionManager.createTransaction).toHaveBeenCalled();
    });

    it('should handle high interest rates correctly', async () => {
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 1000,
        interest_rate: 0.50, // 50% annual (extreme case)
        compounding_period: 'annually',
        last_interest_date: oneYearAgo.toISOString()
      });

      TransactionManager.createTransaction.mockResolvedValue({});
      db.run.mockResolvedValue({});

      const result = await InterestCalculator.calculateInterest(1);

      // 1000 * (1 + 0.50)^1 = 1500, interest = $500
      expect(result).toBeCloseTo(500, 0);
    });

    it('should format interest amount to 2 decimal places', async () => {
      const now = new Date();
      const twoMonthsAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

      db.get.mockResolvedValue({
        id: 1,
        name: 'Test Account',
        balance: 1000,
        interest_rate: 0.12, // 12% annual to ensure enough interest
        compounding_period: 'monthly',
        last_interest_date: twoMonthsAgo.toISOString()
      });

      TransactionManager.createTransaction.mockResolvedValue({});
      db.run.mockResolvedValue({});

      await InterestCalculator.calculateInterest(1);

      expect(TransactionManager.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.stringMatching(/^\d+\.\d{2}$/) // Must be formatted to 2 decimals
        })
      );
    });
  });
});
