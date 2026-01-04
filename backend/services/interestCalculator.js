const db = require('../database/db');
const TransactionManager = require('./transactionManager');

class InterestCalculator {
  // Calculate time elapsed in years based on compounding period
  getTimePeriod(lastInterestDate, compoundingPeriod) {
    const now = new Date();
    const last = new Date(lastInterestDate);
    
    // If no last interest date, assume account creation or start of period. 
    // However, logic usually implies we calculate FROM the last date.
    if (!lastInterestDate) return { periods: 0, periodLengthYears: 0 };

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceLast = Math.floor((now - last) / msPerDay);
    
    const periodsPerYear = {
      'daily': 365,
      'weekly': 52,
      'monthly': 12,
      'quarterly': 4,
      'annually': 1
    };
    
    const daysPerPeriod = 365 / periodsPerYear[compoundingPeriod];
    
    return {
      periods: Math.floor(daysSinceLast / daysPerPeriod),
      periodLengthYears: 1 / periodsPerYear[compoundingPeriod]
    };
  }
  
  async calculateInterest(accountId) {
    const account = await db.get('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL', [accountId]);
    if (!account || account.balance <= 0) return null;
    
    // If no last_interest_date, use created_at or don't calculate yet? 
    // Usually initialized on creation. If null, maybe update to now?
    const lastDate = account.last_interest_date || account.created_at;

    const { periods, periodLengthYears } = this.getTimePeriod(lastDate, account.compounding_period);
    
    if (periods === 0) return null; // No full period has elapsed
    
    // Compound interest formula: A = P(1 + r/n)^(nt)
    // Actually, simple iterative application or direct formula.
    // Here we apply it for 'periods' number of compounding events.
    // Rate is annual. Rate per period is (annual_rate / periods_per_year).
    
    const principal = parseFloat(account.balance);
    const annualRate = parseFloat(account.interest_rate); // e.g. 0.05 for 5%
    
    const periodsPerYear = {
        'daily': 365, 'weekly': 52, 'monthly': 12, 'quarterly': 4, 'annually': 1
    }[account.compounding_period];

    const ratePerPeriod = annualRate / periodsPerYear;
    
    const finalAmount = principal * Math.pow(1 + ratePerPeriod, periods);
    const interestEarned = finalAmount - principal;
    
    if (interestEarned > 0.005) { // Round to penny
      // Create interest transaction
      await TransactionManager.createTransaction({
        accountId,
        type: 'interest',
        category: 'Interest',
        amount: interestEarned.toFixed(2),
        note: `Interest for ${periods} ${account.compounding_period} period(s)`
      });
      
      // Update last interest date
      await db.run(
        'UPDATE accounts SET last_interest_date = datetime(\'now\') WHERE id = ?',
        [accountId]
      );
      
      return interestEarned;
    }
    
    return null;
  }
}

module.exports = new InterestCalculator();
