import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionForm from './TransactionForm';
import * as api from '../utils/api';

vi.mock('../utils/api');

describe('TransactionForm', () => {
  const mockOnTransactionSuccess = vi.fn();
  const accountId = '123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with default deposit type', () => {
    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    expect(screen.getByText('New Transaction')).toBeInTheDocument();
    const depositBtn = screen.getByRole('button', { name: /^deposit$/i });
    const withdrawalBtn = screen.getByRole('button', { name: /^withdrawal$/i });
    expect(depositBtn).toBeInTheDocument();
    expect(withdrawalBtn).toBeInTheDocument();
  });

  it('switches between deposit and withdrawal types', async () => {
    const user = userEvent.setup();
    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    const depositBtn = screen.getByRole('button', { name: /^deposit$/i });
    const withdrawalBtn = screen.getByRole('button', { name: /^withdrawal$/i });

    // Initially deposit should be selected
    expect(depositBtn).toHaveClass('bg-white');

    // Click withdrawal
    await user.click(withdrawalBtn);
    expect(withdrawalBtn).toHaveClass('bg-white');
  });

  it('shows deposit categories when deposit is selected', () => {
    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    expect(screen.getByRole('button', { name: 'Allowance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tooth Fairy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Gift$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chore' })).toBeInTheDocument();
  });

  it('shows withdrawal categories when withdrawal is selected', async () => {
    const user = userEvent.setup();
    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    await user.click(screen.getByRole('button', { name: /^withdrawal$/i }));

    expect(screen.getByRole('button', { name: 'Toy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Candy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Savings Goal' })).toBeInTheDocument();
  });

  it('allows selecting a category', async () => {
    const user = userEvent.setup();
    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    const allowanceBtn = screen.getByRole('button', { name: 'Allowance' });
    await user.click(allowanceBtn);

    expect(allowanceBtn).toHaveClass('bg-indigo-50');
  });

  it('submits deposit transaction successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTransaction).mockResolvedValue({});

    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    // Fill in amount
    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '50.00');

    // Select category
    await user.click(screen.getByRole('button', { name: 'Allowance' }));

    // Add note
    const noteInput = screen.getByPlaceholderText('Note (optional)');
    await user.type(noteInput, 'Weekly allowance');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Post Deposit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.createTransaction).toHaveBeenCalledWith(accountId, {
        type: 'deposit',
        amount: 50,
        category: 'Allowance',
        note: 'Weekly allowance'
      });
      expect(mockOnTransactionSuccess).toHaveBeenCalled();
    });
  });

  it('submits withdrawal transaction successfully', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTransaction).mockResolvedValue({});

    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    // Switch to withdrawal
    await user.click(screen.getByRole('button', { name: /^withdrawal$/i }));

    // Fill in amount
    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '25.50');

    // Select category
    await user.click(screen.getByRole('button', { name: 'Toy' }));

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Post Withdrawal/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.createTransaction).toHaveBeenCalledWith(accountId, {
        type: 'withdrawal',
        amount: 25.50,
        category: 'Toy',
        note: ''
      });
    });
  });

  it('uses default category if none selected', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTransaction).mockResolvedValue({});

    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '10.00');

    const submitBtn = screen.getByRole('button', { name: /Post Deposit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.createTransaction).toHaveBeenCalledWith(accountId, {
        type: 'deposit',
        amount: 10,
        category: 'Allowance', // Default first category
        note: ''
      });
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTransaction).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '10.00');

    const submitBtn = screen.getByRole('button', { name: /Post Deposit/i });
    await user.click(submitBtn);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it('displays error message on submission failure', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTransaction).mockRejectedValue(new Error('Insufficient funds'));

    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    const amountInput = screen.getByPlaceholderText('0.00');
    await user.type(amountInput, '1000.00');

    const submitBtn = screen.getByRole('button', { name: /Post Deposit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
    });
    expect(mockOnTransactionSuccess).not.toHaveBeenCalled();
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTransaction).mockResolvedValue({});

    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    const noteInput = screen.getByPlaceholderText('Note (optional)') as HTMLInputElement;

    await user.type(amountInput, '50.00');
    await user.type(noteInput, 'Test note');

    const submitBtn = screen.getByRole('button', { name: /Post Deposit/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(amountInput.value).toBe('');
      expect(noteInput.value).toBe('');
    });
  });

  it('does not submit with invalid amount', async () => {
    const user = userEvent.setup();
    vi.mocked(api.createTransaction).mockResolvedValue({});

    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    const submitBtn = screen.getByRole('button', { name: /Post Deposit/i });
    await user.click(submitBtn);

    // Form should not submit (amount is required)
    expect(api.createTransaction).not.toHaveBeenCalled();
  });

  it('clears category when switching transaction type', async () => {
    const user = userEvent.setup();
    render(<TransactionForm accountId={accountId} onTransactionSuccess={mockOnTransactionSuccess} />);

    // Select a deposit category
    const allowanceBtn = screen.getByRole('button', { name: 'Allowance' });
    await user.click(allowanceBtn);
    expect(allowanceBtn).toHaveClass('bg-indigo-50');

    // Switch to withdrawal
    await user.click(screen.getByRole('button', { name: /^withdrawal$/i }));

    // Allowance should no longer be visible, and no withdrawal category should be selected
    const toyBtn = screen.getByRole('button', { name: 'Toy' });
    expect(toyBtn).not.toHaveClass('bg-indigo-50');
  });
});
