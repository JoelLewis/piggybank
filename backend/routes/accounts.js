const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { validateAccount } = require('../middleware/validation');

// GET all accounts
router.get('/', async (req, res, next) => {
  try {
    const accounts = await db.all(
      'SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY name'
    );
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// GET single account
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await db.get('SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// POST create account
router.post('/', validateAccount, async (req, res, next) => {
  try {
    const { name, interest_rate = 0, compounding_period = 'monthly', initial_balance = 0 } = req.body;
    
    // Check uniqueness
    const existing = await db.get('SELECT id FROM accounts WHERE name = ? AND deleted_at IS NULL', [name]);
    if (existing) {
        return res.status(400).json({ error: 'Account name already exists' });
    }

    const result = await db.run(
      `INSERT INTO accounts (name, balance, interest_rate, compounding_period, last_interest_date)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [name, initial_balance, interest_rate, compounding_period]
    );
    
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [result.id]);
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// PUT update account
router.put('/:id', validateAccount, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, interest_rate, compounding_period } = req.body;
    
    await db.run(
      `UPDATE accounts 
       SET name = ?, interest_rate = ?, compounding_period = ?, updated_at = datetime('now')
       WHERE id = ? AND deleted_at IS NULL`,
      [name, interest_rate, compounding_period, id]
    );
    
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [id]);
    res.json(account);
  } catch (error) {
    next(error);
  }
});

// DELETE soft delete account
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await db.run(
      'UPDATE accounts SET deleted_at = datetime(\'now\') WHERE id = ?',
      [id]
    );
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
