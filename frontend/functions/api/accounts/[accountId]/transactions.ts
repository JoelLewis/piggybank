import type { Env, Transaction } from '../../../_shared/types';
import { validateTransaction } from '../../../_shared/validation';
import { TransactionManager } from '../../../_shared/transactionManager';

// GET transactions for account
export const onRequestGet: PagesFunction<Env, 'accountId'> = async ({ params, env }) => {
  try {
    const { accountId } = params;
    const transactionManager = new TransactionManager(env.DB);
    const transactions = await transactionManager.getTransactions(parseInt(accountId));

    return new Response(JSON.stringify(transactions), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST create transaction
export const onRequestPost: PagesFunction<Env, 'accountId'> = async ({
  request,
  params,
  env
}) => {
  try {
    const { accountId } = params;
    const data = await request.json();

    // Validate input
    const validationError = validateTransaction(data);
    if (validationError) {
      return new Response(JSON.stringify(validationError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { type, category, amount, note, transaction_date } = data;

    const transactionManager = new TransactionManager(env.DB);
    const transaction = await transactionManager.createTransaction({
      accountId: parseInt(accountId),
      type,
      category,
      amount,
      note,
      transaction_date
    });

    return new Response(JSON.stringify(transaction), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
