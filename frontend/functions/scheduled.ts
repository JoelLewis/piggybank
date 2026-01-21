import type { Env, Account } from './_shared/types';
import { InterestCalculator } from './_shared/interestCalculator';

// Cloudflare Cron Trigger for daily interest calculation
export const onScheduled: PagesFunction<Env> = async ({ env }) => {
  try {
    console.log('Running daily interest calculation job...');

    // Get all active accounts
    const result = await env.DB.prepare(
      'SELECT * FROM accounts WHERE deleted_at IS NULL'
    ).all<Account>();

    const accounts = result.results || [];
    const interestCalculator = new InterestCalculator(env.DB);

    let processedCount = 0;
    let totalInterest = 0;

    for (const account of accounts) {
      try {
        const interest = await interestCalculator.calculateInterest(account.id);
        if (interest) {
          processedCount++;
          totalInterest += interest;
          console.log(`Account ${account.name} (ID: ${account.id}): Interest of $${interest.toFixed(2)} calculated`);
        }
      } catch (error: any) {
        console.error(`Failed to calculate interest for account ${account.id}:`, error.message);
      }
    }

    console.log(`Daily interest calculation complete. Processed ${processedCount} accounts. Total interest: $${totalInterest.toFixed(2)}`);
  } catch (error: any) {
    console.error('Daily interest calculation job failed:', error.message);
    throw error;
  }
};
