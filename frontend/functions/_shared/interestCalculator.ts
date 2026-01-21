import type { D1Database, Account } from './types';
import { TransactionManager } from './transactionManager';

export class InterestCalculator {
  constructor(private db: D1Database) {}

  // Calculate time elapsed in years based on compounding period
  getTimePeriod(
    lastInterestDate: string | null,
    compoundingPeriod: string
  ): { periods: number; periodLengthYears: number } {
    const now = new Date();

    if (!lastInterestDate) {
      return { periods: 0, periodLengthYears: 0 };
    }

    const last = new Date(lastInterestDate);
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceLast = Math.floor((now.getTime() - last.getTime()) / msPerDay);

    const periodsPerYear: Record<string, number> = {
      daily: 365,
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      annually: 1
    };

    const daysPerPeriod = 365 / periodsPerYear[compoundingPeriod];

    return {
      periods: Math.floor(daysSinceLast / daysPerPeriod),
      periodLengthYears: 1 / periodsPerYear[compoundingPeriod]
    };
  }

  async calculateInterest(accountId: number): Promise<number | null> {
    const account = await this.db
      .prepare('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL')
      .bind(accountId)
      .first<Account>();

    if (!account || account.balance <= 0) {
      return null;
    }

    // If no last_interest_date, use created_at
    const lastDate = account.last_interest_date || account.created_at;

    const { periods, periodLengthYears } = this.getTimePeriod(
      lastDate,
      account.compounding_period
    );

    if (periods === 0) {
      return null; // No full period has elapsed
    }

    // Compound interest formula: A = P(1 + r/n)^(nt)
    const principal = parseFloat(account.balance.toString());
    const annualRate = parseFloat(account.interest_rate.toString());

    const periodsPerYear: Record<string, number> = {
      daily: 365,
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      annually: 1
    };

    const ratePerPeriod = annualRate / periodsPerYear[account.compounding_period];
    const finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
    const interestEarned = finalAmount - principal;

    if (interestEarned > 0.005) {
      // Round to penny
      const transactionManager = new TransactionManager(this.db);

      // Create interest transaction
      await transactionManager.createTransaction({
        accountId,
        type: 'interest',
        category: 'Interest',
        amount: parseFloat(interestEarned.toFixed(2)),
        note: `Interest for ${periods} ${account.compounding_period} period(s)`
      });

      // Update last interest date
      await this.db
        .prepare("UPDATE accounts SET last_interest_date = datetime('now') WHERE id = ?")
        .bind(accountId)
        .run();

      return interestEarned;
    }

    return null;
  }
}
