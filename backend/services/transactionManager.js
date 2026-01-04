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
}

module.exports = new TransactionManager();
