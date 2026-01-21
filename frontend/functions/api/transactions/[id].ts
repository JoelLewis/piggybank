import type { Env } from '../../_shared/types';
import { validateTransactionUpdate } from '../../_shared/validation';
import { TransactionManager } from '../../_shared/transactionManager';

// PUT update transaction
export const onRequestPut: PagesFunction<Env, 'id'> = async ({ request, params, env }) => {
  try {
    const { id } = params;
    const data = await request.json();

    // Validate input
    const validationError = validateTransactionUpdate(data);
    if (validationError) {
      return new Response(JSON.stringify(validationError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { amount, category, note, transaction_date } = data;

    const transactionManager = new TransactionManager(env.DB);
    const transaction = await transactionManager.updateTransaction(parseInt(id), {
      amount,
      category,
      note,
      transaction_date
    });

    return new Response(JSON.stringify(transaction), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE soft delete transaction
export const onRequestDelete: PagesFunction<Env, 'id'> = async ({ params, env }) => {
  try {
    const { id } = params;

    const transactionManager = new TransactionManager(env.DB);
    const result = await transactionManager.deleteTransaction(parseInt(id));

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
