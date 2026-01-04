const db = require('../database/db');
const InterestCalculator = require('../services/interestCalculator');

async function runDailyInterest() {
  console.log('Running daily interest calculation...');
  
  try {
    const accounts = await db.all('SELECT * FROM accounts WHERE deleted_at IS NULL AND balance > 0');
    
    for (const account of accounts) {
      const interest = await InterestCalculator.calculateInterest(account.id);
      if (interest) {
        console.log(`Added $${interest.toFixed(2)} interest to ${account.name}'s account`);
      }
    }
    
    console.log('Daily interest calculation complete');
  } catch (error) {
    console.error('Error running daily interest:', error);
  }
}

module.exports = { runDailyInterest };
