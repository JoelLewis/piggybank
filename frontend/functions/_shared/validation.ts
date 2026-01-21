// Category definitions - Single Source of Truth
export const DEPOSIT_CATEGORIES = ['Allowance', 'Tooth Fairy', 'Gift', 'Chore', 'Other'];
export const WITHDRAWAL_CATEGORIES = ['Toy', 'Candy', 'Savings Goal', 'Other'];
export const INTEREST_CATEGORIES = ['Interest'];

// Combined list for validation where type is unknown
export const ALL_VALID_CATEGORIES = [
  ...new Set([
    ...DEPOSIT_CATEGORIES,
    ...WITHDRAWAL_CATEGORIES,
    ...INTEREST_CATEGORIES
  ])
];

export const VALID_COMPOUNDING_PERIODS = ['daily', 'weekly', 'monthly', 'quarterly', 'annually'];
export const VALID_TRANSACTION_TYPES = ['deposit', 'withdrawal', 'interest'];

export interface ValidationError {
  error: string;
}

export function validateAccount(data: any): ValidationError | null {
  const { name, interest_rate, initial_balance, compounding_period } = data;

  // Validate name
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { error: 'Account name is required' };
  }

  if (name.length > 50) {
    return { error: 'Account name must not exceed 50 characters' };
  }

  // Validate interest rate if provided
  if (interest_rate !== undefined) {
    const rate = parseFloat(interest_rate);
    if (isNaN(rate)) {
      return { error: 'Interest rate must be a valid number' };
    }
    if (rate < 0 || rate > 1) {
      return { error: 'Interest rate must be between 0 and 1 (0% to 100%)' };
    }
  }

  // Validate initial balance if provided
  if (initial_balance !== undefined) {
    const balance = parseFloat(initial_balance);
    if (isNaN(balance)) {
      return { error: 'Initial balance must be a valid number' };
    }
    if (balance < 0) {
      return { error: 'Initial balance must be greater than or equal to $0.00' };
    }
  }

  // Validate compounding period if provided
  if (compounding_period !== undefined) {
    if (!VALID_COMPOUNDING_PERIODS.includes(compounding_period)) {
      return {
        error: `Compounding period must be one of: ${VALID_COMPOUNDING_PERIODS.join(', ')}`
      };
    }
  }

  return null;
}

function isValidDate(dateString: any): boolean {
  if (typeof dateString !== 'string') return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function validateTransaction(data: any): ValidationError | null {
  const { type, category, amount, note, transaction_date } = data;

  // Validate transaction type
  if (!type || typeof type !== 'string') {
    return { error: 'Transaction type is required' };
  }

  if (!VALID_TRANSACTION_TYPES.includes(type)) {
    return {
      error: `Transaction type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`
    };
  }

  // Validate category
  if (!category || typeof category !== 'string') {
    return { error: 'Transaction category is required' };
  }

  let validCategories: string[] = [];
  if (type === 'deposit') {
    validCategories = DEPOSIT_CATEGORIES;
  } else if (type === 'withdrawal') {
    validCategories = WITHDRAWAL_CATEGORIES;
  } else if (type === 'interest') {
    validCategories = INTEREST_CATEGORIES;
  }

  if (!validCategories.includes(category)) {
    return {
      error: `Invalid category for ${type}. Valid categories: ${validCategories.join(', ')}`
    };
  }

  // Validate amount
  if (amount === undefined || amount === null) {
    return { error: 'Transaction amount is required' };
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum)) {
    return { error: 'Amount must be a valid number' };
  }

  if (amountNum <= 0) {
    return { error: 'Amount must be greater than $0.00' };
  }

  if (amountNum > 999999.99) {
    return { error: 'Amount must not exceed $999,999.99' };
  }

  // Validate note if provided
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      return { error: 'Note must be a string' };
    }
    if (note.length > 200) {
      return { error: 'Note must not exceed 200 characters' };
    }
  }

  // Validate transaction_date if provided
  if (transaction_date !== undefined) {
    if (!isValidDate(transaction_date)) {
      return { error: 'Transaction date must be a valid ISO 8601 date string' };
    }
  }

  return null;
}

export function validateTransactionUpdate(data: any): ValidationError | null {
  const { amount, category, note, transaction_date } = data;

  // Validate amount if provided
  if (amount !== undefined) {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return { error: 'Amount must be a valid number' };
    }
    if (amountNum <= 0) {
      return { error: 'Amount must be greater than $0.00' };
    }
    if (amountNum > 999999.99) {
      return { error: 'Amount must not exceed $999,999.99' };
    }
  }

  // Validate category if provided
  if (category !== undefined) {
    if (typeof category !== 'string' || category.trim() === '') {
      return { error: 'Category must be a non-empty string' };
    }

    if (!ALL_VALID_CATEGORIES.includes(category)) {
      return {
        error: 'Invalid category. Must be one of the predefined categories.'
      };
    }
  }

  // Validate note if provided
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') {
      return { error: 'Note must be a string' };
    }
    if (note.length > 200) {
      return { error: 'Note must not exceed 200 characters' };
    }
  }

  // Validate transaction_date if provided
  if (transaction_date !== undefined) {
    if (!isValidDate(transaction_date)) {
      return { error: 'Transaction date must be a valid ISO 8601 date string' };
    }
  }

  return null;
}
