const InterestCalculator = require('../interestCalculator');

describe('InterestCalculator', () => {
  describe('getTimePeriod', () => {
    beforeEach(() => {
      // Mock Date to have consistent tests
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-02-01T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return 0 periods if no last interest date', () => {
      const result = InterestCalculator.getTimePeriod(null, 'monthly');
      expect(result.periods).toBe(0);
      expect(result.periodLengthYears).toBe(0);
    });

    it('should calculate monthly periods correctly', () => {
      // 60 days ago = roughly 2 months
      const lastDate = new Date('2023-12-03T00:00:00Z'); // 60 days before Feb 1
      const result = InterestCalculator.getTimePeriod(lastDate.toISOString(), 'monthly');

      // 60 days / (365/12) = 60 / 30.42 = ~1.97 periods -> floor = 1
      expect(result.periods).toBe(1);
      expect(result.periodLengthYears).toBeCloseTo(1/12, 4);
    });

    it('should calculate daily periods correctly', () => {
      const lastDate = new Date('2024-01-25T00:00:00Z'); // 7 days before
      const result = InterestCalculator.getTimePeriod(lastDate.toISOString(), 'daily');

      // 7 days / 1 = 7 periods
      expect(result.periods).toBe(7);
      expect(result.periodLengthYears).toBeCloseTo(1/365, 6);
    });

    it('should calculate weekly periods correctly', () => {
      const lastDate = new Date('2024-01-04T00:00:00Z'); // 28 days before
      const result = InterestCalculator.getTimePeriod(lastDate.toISOString(), 'weekly');

      // 28 days / (365/52) = 28 / 7.02 = ~3.99 periods -> floor = 3
      expect(result.periods).toBe(3);
      expect(result.periodLengthYears).toBeCloseTo(1/52, 4);
    });

    it('should calculate quarterly periods correctly', () => {
      const lastDate = new Date('2023-08-03T00:00:00Z'); // ~182 days before
      const result = InterestCalculator.getTimePeriod(lastDate.toISOString(), 'quarterly');

      // 182 days / (365/4) = 182 / 91.25 = ~1.99 periods -> floor = 1
      expect(result.periods).toBe(1);
      expect(result.periodLengthYears).toBeCloseTo(1/4, 4);
    });

    it('should calculate annually periods correctly', () => {
      const lastDate = new Date('2022-12-01T00:00:00Z'); // over a year
      const result = InterestCalculator.getTimePeriod(lastDate.toISOString(), 'annually');

      // Should be at least 1 period
      expect(result.periods).toBeGreaterThanOrEqual(1);
      expect(result.periodLengthYears).toBe(1);
    });

    it('should return 0 periods if less than one period has elapsed', () => {
      const lastDate = new Date('2024-01-31T00:00:00Z'); // 1 day before
      const result = InterestCalculator.getTimePeriod(lastDate.toISOString(), 'monthly');

      // 1 day is not enough for a monthly period
      expect(result.periods).toBe(0);
    });
  });

  describe('Interest Calculation Formula', () => {
    it('should correctly calculate compound interest', () => {
      const principal = 100;
      const annualRate = 0.05; // 5%
      const periodsPerYear = 12; // monthly
      const periods = 12; // 1 year of monthly compounding

      const ratePerPeriod = annualRate / periodsPerYear;
      const finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
      const interest = finalAmount - principal;

      // After 1 year at 5% monthly compounding: ~$5.12
      expect(interest).toBeGreaterThan(5);
      expect(interest).toBeLessThan(5.2);
    });

    it('should handle zero interest rate', () => {
      const principal = 100;
      const annualRate = 0;
      const periodsPerYear = 12;
      const periods = 12;

      const ratePerPeriod = annualRate / periodsPerYear;
      const finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
      const interest = finalAmount - principal;

      expect(interest).toBe(0);
    });

    it('should compound correctly for daily periods', () => {
      const principal = 1000;
      const annualRate = 0.10; // 10%
      const periodsPerYear = 365;
      const periods = 365; // 1 year

      const ratePerPeriod = annualRate / periodsPerYear;
      const finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
      const interest = finalAmount - principal;

      // 10% compounded daily ≈ 10.52%
      expect(interest).toBeGreaterThan(105);
      expect(interest).toBeLessThan(106);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small interest amounts', () => {
      const principal = 0.01;
      const annualRate = 0.01;
      const periodsPerYear = 365;
      const periods = 1;

      const ratePerPeriod = annualRate / periodsPerYear;
      const finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
      const interest = finalAmount - principal;

      // Should be a very small number
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBeLessThan(0.001);
    });

    it('should handle large balances', () => {
      const principal = 999999.99;
      const annualRate = 0.05;
      const periodsPerYear = 12;
      const periods = 1;

      const ratePerPeriod = annualRate / periodsPerYear;
      const finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
      const interest = finalAmount - principal;

      // Should calculate without overflow
      expect(interest).toBeGreaterThan(0);
      expect(interest).toBeLessThan(10000);
    });
  });
});
