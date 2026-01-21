import type { Env } from '../../../_shared/types';
import { InterestCalculator } from '../../../_shared/interestCalculator';

// POST manual interest calculation
export const onRequestPost: PagesFunction<Env, 'accountId'> = async ({ params, env }) => {
  try {
    const { accountId } = params;
    const interestCalculator = new InterestCalculator(env.DB);
    const interest = await interestCalculator.calculateInterest(parseInt(accountId));

    if (interest) {
      return new Response(
        JSON.stringify({ message: 'Interest calculated', amount: interest }),
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(JSON.stringify({ message: 'No interest due' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
