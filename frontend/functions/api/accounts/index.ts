import type { Env, Account } from '../../_shared/types';
import { validateAccount } from '../../_shared/validation';

interface CloudflareContext {
  env: Env;
  params: Record<string, string>;
}

// GET all accounts
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const result = await env.DB.prepare(
      'SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY name'
    ).all<Account>();

    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST create account
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const data = await request.json();

    // Validate input
    const validationError = validateAccount(data);
    if (validationError) {
      return new Response(JSON.stringify(validationError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const {
      name,
      interest_rate = 0,
      compounding_period = 'monthly',
      initial_balance = 0
    } = data;

    // Check uniqueness
    const existing = await env.DB.prepare(
      'SELECT id FROM accounts WHERE name = ? AND deleted_at IS NULL'
    )
      .bind(name)
      .first<{ id: number }>();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Account name already exists' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await env.DB.prepare(
      `INSERT INTO accounts (name, balance, interest_rate, compounding_period, last_interest_date)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
      .bind(name, initial_balance, interest_rate, compounding_period)
      .run();

    const account = await env.DB.prepare('SELECT * FROM accounts WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<Account>();

    return new Response(JSON.stringify(account), {
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
