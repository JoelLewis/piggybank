const db = require('../database/db');

class TransactionManager {
  async createTransaction({ accountId, type, category, amount, note, transaction_date }) {
    // Get current account balance
    const account = await db.get('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL', [accountId]);
    if (!account) throw new Error('Account not found');
    
    // Calculate new balance
    let newBalance;
    const currentBalance = parseFloat(account.balance);
    const txAmount = parseFloat(amount);

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
    const result = await db.run(
      `INSERT INTO transactions 
       (account_id, type, category, amount, balance_after, note, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [accountId, type, category, txAmount, newBalance.toFixed(2), note || null, transaction_date || new Date().toISOString()]
    );
    
    // Update account balance
    await db.run(
      'UPDATE accounts SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [newBalance.toFixed(2), accountId]
    );
    
    return await db.get('SELECT * FROM transactions WHERE id = ?', [result.id]);
  }
  
  async getTransactions(accountId, filters = {}) {
    let sql = `SELECT * FROM transactions WHERE account_id = ? AND deleted_at IS NULL`;
    const params = [accountId];

    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }

    sql += ' ORDER BY transaction_date DESC';

    return await db.all(sql, params);
  }

  async recalculateBalances(accountId) {
    // Get all non-deleted transactions in chronological order
    const transactions = await db.all(
      `SELECT * FROM transactions
       WHERE account_id = ? AND deleted_at IS NULL
       ORDER BY transaction_date ASC, id ASC`,
      [accountId]
    );

    let runningBalance = 0;

    // Recalculate balance for each transaction
    for (const tx of transactions) {
      const txAmount = parseFloat(tx.amount);

      if (tx.type === 'deposit' || tx.type === 'interest') {
        runningBalance += txAmount;
      } else if (tx.type === 'withdrawal') {
        runningBalance -= txAmount;
      }

      // Update balance_after for this transaction
      await db.run(
        'UPDATE transactions SET balance_after = ? WHERE id = ?',
        [runningBalance.toFixed(2), tx.id]
      );
    }

    // Update account's current balance
    await db.run(
      'UPDATE accounts SET balance = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [runningBalance.toFixed(2), accountId]
    );

    return runningBalance;
  }

  async updateTransaction(transactionId, { amount, category, note, transaction_date }) {
    // Get the existing transaction
    const oldTransaction = await db.get(
      'SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL',
      [transactionId]
    );

    if (!oldTransaction) {
      throw new Error('Transaction not found');
    }

    // Check if editing would create negative balance
    const account = await db.get(
      'SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL',
      [oldTransaction.account_id]
    );

    if (!account) {
      throw new Error('Account not found');
    }

    // Update the transaction
    const updateFields = [];
    const updateParams = [];

    if (amount !== undefined) {
      updateFields.push('amount = ?');
      updateParams.push(parseFloat(amount));
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

    updateFields.push('updated_at = datetime(\'now\')');
    updateParams.push(transactionId);

    await db.run(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Recalculate all balances for this account
    await this.recalculateBalances(oldTransaction.account_id);

    // Get updated transaction
    const updatedTransaction = await db.get(
      'SELECT * FROM transactions WHERE id = ?',
      [transactionId]
    );

    // Check if any balance went negative
    const negativeCheck = await db.get(
      `SELECT MIN(balance_after) as min_balance
       FROM transactions
       WHERE account_id = ? AND deleted_at IS NULL`,
      [oldTransaction.account_id]
    );

    if (negativeCheck.min_balance < 0) {
      // Rollback by reverting the transaction
      await db.run(
        `UPDATE transactions
         SET amount = ?, category = ?, note = ?, transaction_date = ?
         WHERE id = ?`,
        [oldTransaction.amount, oldTransaction.category, oldTransaction.note,
         oldTransaction.transaction_date, transactionId]
      );

      // Recalculate again
      await this.recalculateBalances(oldTransaction.account_id);

      throw new Error('Transaction edit would create negative balance in history');
    }

    return updatedTransaction;
  }

  async deleteTransaction(transactionId) {
    // Get the transaction
    const transaction = await db.get(
      'SELECT * FROM transactions WHERE id = ? AND deleted_at IS NULL',
      [transactionId]
    );

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    // Soft delete the transaction
    await db.run(
      'UPDATE transactions SET deleted_at = datetime(\'now\') WHERE id = ?',
      [transactionId]
    );

    // Recalculate all balances for this account
    await this.recalculateBalances(transaction.account_id);

    return { message: 'Transaction deleted successfully' };
  }
}

module.exports = new TransactionManager();
