const validateAccount = (req, res, next) => {
    const { name, interest_rate, initial_balance, compounding_period } = req.body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Account name is required' });
    }

    if (name.length > 50) {
        return res.status(400).json({ error: 'Account name must not exceed 50 characters' });
    }

    // Validate interest rate if provided
    if (interest_rate !== undefined) {
        const rate = parseFloat(interest_rate);
        if (isNaN(rate)) {
            return res.status(400).json({ error: 'Interest rate must be a valid number' });
        }
        if (rate < 0 || rate > 1) {
            return res.status(400).json({ error: 'Interest rate must be between 0 and 1 (0% to 100%)' });
        }
    }

    // Validate initial balance if provided
    if (initial_balance !== undefined) {
        const balance = parseFloat(initial_balance);
        if (isNaN(balance)) {
            return res.status(400).json({ error: 'Initial balance must be a valid number' });
        }
        if (balance < 0) {
            return res.status(400).json({ error: 'Initial balance must be greater than or equal to $0.00' });
        }
    }

    // Validate compounding period if provided
    if (compounding_period !== undefined) {
        const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];
        if (!validPeriods.includes(compounding_period)) {
            return res.status(400).json({
                error: 'Compounding period must be one of: daily, weekly, monthly, quarterly, annually'
            });
        }
    }

    next();
};

const validateTransaction = (req, res, next) => {
    const { type, category, amount, note } = req.body;

    // Validate transaction type
    if (!type || typeof type !== 'string') {
        return res.status(400).json({ error: 'Transaction type is required' });
    }

    const validTypes = ['deposit', 'withdrawal', 'interest'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({
            error: 'Transaction type must be one of: deposit, withdrawal, interest'
        });
    }

    // Validate category
    if (!category || typeof category !== 'string') {
        return res.status(400).json({ error: 'Transaction category is required' });
    }

    const depositCategories = ['Allowance', 'Tooth Fairy', 'Gift', 'Chore', 'Other'];
    const withdrawalCategories = ['Toy', 'Candy', 'Savings Goal', 'Other'];
    const interestCategories = ['Interest'];

    let validCategories = [];
    if (type === 'deposit') {
        validCategories = depositCategories;
    } else if (type === 'withdrawal') {
        validCategories = withdrawalCategories;
    } else if (type === 'interest') {
        validCategories = interestCategories;
    }

    if (!validCategories.includes(category)) {
        return res.status(400).json({
            error: `Invalid category for ${type}. Valid categories: ${validCategories.join(', ')}`
        });
    }

    // Validate amount
    if (amount === undefined || amount === null) {
        return res.status(400).json({ error: 'Transaction amount is required' });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
        return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    if (amountNum <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than $0.00' });
    }

    if (amountNum > 999999.99) {
        return res.status(400).json({ error: 'Amount must not exceed $999,999.99' });
    }

    // Validate note if provided
    if (note !== undefined && note !== null) {
        if (typeof note !== 'string') {
            return res.status(400).json({ error: 'Note must be a string' });
        }
        if (note.length > 200) {
            return res.status(400).json({ error: 'Note must not exceed 200 characters' });
        }
    }

    next();
};

const validateTransactionUpdate = (req, res, next) => {
    const { amount, category, note } = req.body;

    // Validate amount if provided
    if (amount !== undefined) {
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum)) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }
        if (amountNum <= 0) {
            return res.status(400).json({ error: 'Amount must be greater than $0.00' });
        }
        if (amountNum > 999999.99) {
            return res.status(400).json({ error: 'Amount must not exceed $999,999.99' });
        }
    }

    // Validate category if provided (note: we can't validate against type here since we don't have it)
    if (category !== undefined) {
        if (typeof category !== 'string' || category.trim() === '') {
            return res.status(400).json({ error: 'Category must be a non-empty string' });
        }
    }

    // Validate note if provided
    if (note !== undefined && note !== null) {
        if (typeof note !== 'string') {
            return res.status(400).json({ error: 'Note must be a string' });
        }
        if (note.length > 200) {
            return res.status(400).json({ error: 'Note must not exceed 200 characters' });
        }
    }

    next();
};

module.exports = { validateAccount, validateTransaction, validateTransactionUpdate };
