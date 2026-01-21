import type { Env, Account } from '../../../_shared/types';

// GET account statistics
export const onRequestGet: PagesFunction<Env, 'id'> = async ({ params, env }) => {
  try {
    const { id } = params;

    // Get account
    const account = await env.DB.prepare(
      'SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL'
    )
      .bind(id)
      .first<Account>();

    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate total deposits
    const depositsResult = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE account_id = ? AND type = 'deposit' AND deleted_at IS NULL`
    )
      .bind(id)
      .first<{ total: number }>();

    // Calculate total withdrawals
    const withdrawalsResult = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE account_id = ? AND type = 'withdrawal' AND deleted_at IS NULL`
    )
      .bind(id)
      .first<{ total: number }>();

    // Calculate total interest earned
    const interestResult = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE account_id = ? AND type = 'interest' AND deleted_at IS NULL`
    )
      .bind(id)
      .first<{ total: number }>();

    // Calculate account age in days
    const createdDate = new Date(account.created_at);
    const now = new Date();
    const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate next interest payment date
    const lastInterestDate = new Date(account.last_interest_date || account.created_at);
    const periodsPerYear: Record<string, number> = {
      daily: 365,
      weekly: 52,
      monthly: 12,
      quarterly: 4,
      annually: 1
    };
    const daysPerPeriod = 365 / periodsPerYear[account.compounding_period];
    const nextInterestDate = new Date(lastInterestDate);
    nextInterestDate.setDate(nextInterestDate.getDate() + daysPerPeriod);

    // Calculate estimated next interest amount
    let nextInterestAmount = 0;
    if (account.balance > 0 && account.interest_rate > 0) {
      const principal = parseFloat(account.balance.toString());
      const rate = parseFloat(account.interest_rate.toString());
      const finalAmount = principal * (1 + rate);
      nextInterestAmount = finalAmount - principal;
    }

    const statistics = {
      current_balance: parseFloat(account.balance.toString()),
      total_deposits: parseFloat((depositsResult?.total || 0).toString()),
      total_withdrawals: parseFloat((withdrawalsResult?.total || 0).toString()),
      total_interest_earned: parseFloat((interestResult?.total || 0).toString()),
      account_age_days: ageInDays,
      next_interest_date: nextInterestDate.toISOString(),
      next_interest_amount: parseFloat(nextInterestAmount.toFixed(2))
    };

    return new Response(JSON.stringify(statistics), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
