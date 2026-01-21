import type { D1Database, Transaction } from './types';

export class TransactionManager {
  constructor(private db: D1Database) {}

  async createTransaction(params: {
    accountId: number;
    type: string;
    category: string;
    amount: number;
    note?: string;
    transaction_date?: string;
  }): Promise<Transaction> {
    const { accountId, type, category, amount, note, transaction_date } = params;

    // Get current account balance
    const account = await this.db
      .prepare('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL')
      .bind(accountId)
      .first<any>();

    if (!account) {
      throw new Error('Account not found');
    }

    // Calculate new balance
    let newBalance: number;
    const currentBalance = parseFloat(account.balance);
    const txAmount = parseFloat(amount.toString());

    if (type === 'deposit' || type === 'interest') {
      newBalance = currentBalance + txAmount;
    } else if (type === 'withdrawal') {
      if (currentBalance < txAmount) {
        throw new Error('Insufficient funds');
      }
      newBalance = currentBalance - txAmount;
    } else {
      throw new Error('Invalid transaction type');
    }

    // Create transaction
    const result = await this.db
      .prepare(
        `INSERT INTO transactions
         (account_id, type, category, amount, balance_after, note, transaction_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        accountId,
        type,
        category,
        txAmount,
        parseFloat(newBalance.toFixed(2)),
        note || null,
        transaction_date || new Date().toISOString()
      )
      .run();

    // Update account balance
    await this.db
      .prepare(
        "UPDATE accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(parseFloat(newBalance.toFixed(2)), accountId)
      .run();

    // Get the created transaction
    const transaction = await this.db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first<Transaction>();

    if (!transaction) {
      throw new Error('Failed to create transaction');
    }

    return transaction;
  }

  async getTransactions(accountId: number, filters: { type?: string } = {}): Promise<Transaction[]> {
    let sql = `SELECT * FROM transactions WHERE account_id = ? AND deleted_at IS NULL`;
    const params: any[] = [accountId];

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    sql += ' ORDER BY transaction_date DESC';

    const stmt = this.db.prepare(sql);
    params.forEach((param) => stmt.bind(param));

    const result = await stmt.all<Transaction>();
    return result.results || [];
  }

  async recalculateBalances(accountId: number): Promise<number> {
    // Get all non-deleted transactions in chronological order
    const result = await this.db
      .prepare(
        `SELECT * FROM transactions
         WHERE account_id = ? AND deleted_at IS NULL
         ORDER BY transaction_date ASC, id ASC`
      )
      .bind(accountId)
      .all<Transaction>();

    const transactions = result.results || [];
    let runningBalance = 0;

    // Recalculate balance for each transaction
    for (const tx of transactions) {
      const txAmount = parseFloat(tx.amount.toString());

      if (tx.type === 'deposit' || tx.type === 'interest') {
        runningBalance += txAmount;
      } else if (tx.type === 'withdrawal') {
        runningBalance -= txAmount;
      }

      // Update balance_after for this transaction
      await this.db
        .prepare('UPDATE transactions SET balance_after = ? WHERE id = ?')
        .bind(parseFloat(runningBalance.toFixed(2)), tx.id)
        .run();
    }

    // Update account's current balance
    await this.db
      .prepare(
        "UPDATE accounts SET balance = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(parseFloat(runningBalance.toFixed(2)), accountId)
      .run();

    return runningBalance;
  }

  async updateTransaction(
    transactionId: number,
    updates: {
      amount?: number;
      category?: string;
      note?: string;
      transaction_date?: string;
    }
  ): Promise<Transaction> {
    const { amount, category, note, transaction_date } = updates;

    // Get the existing transaction
    const oldTransaction = await this.db
      .prepare('SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL')
      .bind(transactionId)
      .first<Transaction>();

    if (!oldTransaction) {
      throw new Error('Transaction not found');
    }

    // Check if account exists
    const account = await this.db
      .prepare('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL')
      .bind(oldTransaction.account_id)
      .first<any>();

    if (!account) {
      throw new Error('Account not found');
    }

    // Update the transaction
    const updateFields: string[] = [];
    const updateParams: any[] = [];

    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateParams.push(parseFloat(amount.toString()));
    }

    if (category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(category);
    }

    if (note !== undefined) {
      updateFields.push('note = ?');
      updateParams.push(note);
    }

    if (transaction_date !== undefined) {
      updateFields.push('transaction_date = ?');
      updateParams.push(transaction_date);
    }

    if (updateFields.length === 0) {
      return oldTransaction;
    }

    updateFields.push("updated_at = datetime('now')");
    updateParams.push(transactionId);

    await this.db
      .prepare(`UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateParams)
      .run();

    // Recalculate all balances for this account
    await this.recalculateBalances(oldTransaction.account_id);

    // Get updated transaction
    const updatedTransaction = await this.db
      .prepare('SELECT * FROM transactions WHERE id = ?')
      .bind(transactionId)
      .first<Transaction>();

    if (!updatedTransaction) {
      throw new Error('Transaction not found after update');
    }

    // Check if any balance went negative
    const negativeCheck = await this.db
      .prepare(
        `SELECT MIN(balance_after) as min_balance
         FROM transactions
         WHERE account_id = ? AND deleted_at IS NULL`
      )
      .bind(oldTransaction.account_id)
      .first<{ min_balance: number }>();

    if (negativeCheck && negativeCheck.min_balance < 0) {
      // Revert the transaction
      await this.db
        .prepare(
          `UPDATE transactions
           SET amount = ?, category = ?, note = ?, transaction_date = ?
           WHERE id = ?`
        )
        .bind(
          oldTransaction.amount,
          oldTransaction.category,
          oldTransaction.note,
          oldTransaction.transaction_date,
          transactionId
        )
        .run();

      // Recalculate again
      await this.recalculateBalances(oldTransaction.account_id);

      throw new Error('Transaction edit would create negative balance in history');
    }

    return updatedTransaction;
  }

  async deleteTransaction(transactionId: number): Promise<{ message: string }> {
    // Get the transaction
    const transaction = await this.db
      .prepare('SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL')
      .bind(transactionId)
      .first<Transaction>();

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Soft delete the transaction
    await this.db
      .prepare("UPDATE transactions SET deleted_at = datetime('now') WHERE id = ?")
      .bind(transactionId)
      .run();

    // Recalculate all balances for this account
    await this.recalculateBalances(transaction.account_id);

    return { message: 'Transaction deleted successfully' };
  }
}
