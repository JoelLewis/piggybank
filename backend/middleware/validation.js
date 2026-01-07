// Category definitions - Single Source of Truth
const DEPOSIT_CATEGORIES = ['Allowance', 'Tooth Fairy', 'Gift', 'Chore', 'Other'];
const WITHDRAWAL_CATEGORIES = ['Toy', 'Candy', 'Savings Goal', 'Other'];
const INTEREST_CATEGORIES = ['Interest'];

// Combined list for validation where type is unknown
const ALL_VALID_CATEGORIES = [
    ...new Set([
        ...DEPOSIT_CATEGORIES,
        ...WITHDRAWAL_CATEGORIES,
        ...INTEREST_CATEGORIES
    ])
];

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

const isValidDate = (dateString) => {
    if (typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()); // Check if valid date
};

const validateTransaction = (req, res, next) => {
    const { type, category, amount, note, transaction_date } = req.body;

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

    let validCategories = [];
    if (type === 'deposit') {
        validCategories = DEPOSIT_CATEGORIES;
    } else if (type === 'withdrawal') {
        validCategories = WITHDRAWAL_CATEGORIES;
    } else if (type === 'interest') {
        validCategories = INTEREST_CATEGORIES;
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

    // Validate transaction_date if provided
    if (transaction_date !== undefined) {
        if (!isValidDate(transaction_date)) {
             return res.status(400).json({ error: 'Transaction date must be a valid ISO 8601 date string' });
        }
    }

    next();
};

const validateTransactionUpdate = (req, res, next) => {
    const { amount, category, note, transaction_date } = req.body;

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

    // Validate category if provided
    if (category !== undefined) {
        if (typeof category !== 'string' || category.trim() === '') {
            return res.status(400).json({ error: 'Category must be a non-empty string' });
        }

        if (!ALL_VALID_CATEGORIES.includes(category)) {
             return res.status(400).json({
                 error: 'Invalid category. Must be one of the predefined categories.'
             });
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

    // Validate transaction_date if provided
    if (transaction_date !== undefined) {
        if (!isValidDate(transaction_date)) {
             return res.status(400).json({ error: 'Transaction date must be a valid ISO 8601 date string' });
        }
    }

    next();
};

module.exports = { validateAccount, validateTransaction, validateTransactionUpdate };
