import type { Env, Account } from '../../_shared/types';
import { validateAccount } from '../../_shared/validation';

interface CloudflareContext {
  params: { id: string };
  env: Env;
}

// GET single account
export const onRequestGet: PagesFunction<Env, 'id'> = async ({ params, env }) => {
  try {
    const { id } = params;
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

    return new Response(JSON.stringify(account), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT update account
export const onRequestPut: PagesFunction<Env, 'id'> = async ({ request, params, env }) => {
  try {
    const { id } = params;
    const data = await request.json();

    // Validate input
    const validationError = validateAccount(data);
    if (validationError) {
      return new Response(JSON.stringify(validationError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { name, interest_rate, compounding_period } = data;

    await env.DB.prepare(
      `UPDATE accounts
       SET name = ?, interest_rate = ?, compounding_period = ?, updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`
    )
      .bind(name, interest_rate, compounding_period, id)
      .run();

    const account = await env.DB.prepare('SELECT * FROM accounts WHERE id = ?')
      .bind(id)
      .first<Account>();

    return new Response(JSON.stringify(account), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE soft delete account
export const onRequestDelete: PagesFunction<Env, 'id'> = async ({ params, env }) => {
  try {
    const { id } = params;

    await env.DB.prepare("UPDATE accounts SET deleted_at = datetime('now') WHERE id = ?")
      .bind(id)
      .run();

    return new Response(null, { status: 204 });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
