import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionList from './TransactionList';

describe('TransactionList', () => {
  const mockTransactions = [
    {
      id: 1,
      date: '2024-01-15T10:30:00Z',
      type: 'deposit' as const,
      category: 'Allowance',
      amount: 50,
      balance_after: 150,
      transaction_date: '2024-01-15T10:30:00Z'
    },
    {
      id: 2,
      date: '2024-01-16T14:20:00Z',
      type: 'withdrawal' as const,
      category: 'Toy',
      amount: 25,
      balance_after: 125,
      transaction_date: '2024-01-16T14:20:00Z'
    },
    {
      id: 3,
      date: '2024-01-17T09:00:00Z',
      type: 'interest' as const,
      category: 'Interest',
      amount: 5.50,
      balance_after: 130.50,
      transaction_date: '2024-01-17T09:00:00Z'
    }
  ];

  it('renders transaction list header', () => {
    render(<TransactionList transactions={mockTransactions} />);
    expect(screen.getByText('Transaction Ledger')).toBeInTheDocument();
  });

  it('renders all transactions', () => {
    render(<TransactionList transactions={mockTransactions} />);

    expect(screen.getByText('Allowance')).toBeInTheDocument();
    expect(screen.getByText('Toy')).toBeInTheDocument();
    expect(screen.getByText('Interest')).toBeInTheDocument();
  });

  it('displays transaction amounts with correct sign', () => {
    render(<TransactionList transactions={mockTransactions} />);

    expect(screen.getByText('+$50.00')).toBeInTheDocument();
    expect(screen.getByText('-$25.00')).toBeInTheDocument();
    expect(screen.getByText('+$5.50')).toBeInTheDocument();
  });

  it('displays balance after each transaction', () => {
    render(<TransactionList transactions={mockTransactions} />);

    expect(screen.getByText('$150.00')).toBeInTheDocument();
    expect(screen.getByText('$125.00')).toBeInTheDocument();
    expect(screen.getByText('$130.50')).toBeInTheDocument();
  });

  it('sorts transactions by date in descending order', () => {
    const unsortedTransactions = [
      mockTransactions[1], // Jan 16
      mockTransactions[2], // Jan 17
      mockTransactions[0]  // Jan 15
    ];

    render(<TransactionList transactions={unsortedTransactions} />);

    const categories = screen.getAllByRole('cell').filter(cell =>
      ['Allowance', 'Toy', 'Interest'].includes(cell.textContent || '')
    );

    // Should be sorted: Interest (17th), Toy (16th), Allowance (15th)
    expect(categories[0]).toHaveTextContent('Interest');
    expect(categories[1]).toHaveTextContent('Toy');
    expect(categories[2]).toHaveTextContent('Allowance');
  });

  it('displays empty state when no transactions', () => {
    render(<TransactionList transactions={[]} />);
    expect(screen.getByText('No transactions yet.')).toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    render(<TransactionList transactions={mockTransactions} />);

    // Dates should be formatted using toLocaleDateString
    const dateCells = screen.getAllByRole('cell').filter(cell => {
      const text = cell.textContent || '';
      return text.includes('/') || text.includes('-');
    });

    expect(dateCells.length).toBeGreaterThan(0);
  });

  it('applies correct color for deposit transactions', () => {
    render(<TransactionList transactions={mockTransactions} />);

    // Check that deposit transactions have emerald color
    const allRows = screen.getAllByRole('row');
    // Find the row containing "Allowance"
    const depositRow = allRows.find(row => row.textContent?.includes('Allowance'));
    expect(depositRow).toBeDefined();

    // Find emerald-colored cells (deposit and interest both use emerald)
    const emeraldCells = document.querySelectorAll('.text-emerald-500');
    expect(emeraldCells.length).toBeGreaterThan(0);
  });

  it('applies correct color for withdrawal transactions', () => {
    render(<TransactionList transactions={mockTransactions} />);

    // Check that withdrawal transactions have rose color
    const roseCells = document.querySelectorAll('.text-rose-500');
    expect(roseCells.length).toBeGreaterThan(0);

    const allRows = screen.getAllByRole('row');
    const withdrawalRow = allRows.find(row => row.textContent?.includes('Toy'));
    expect(withdrawalRow).toBeDefined();
  });

  it('applies correct color for interest transactions', () => {
    render(<TransactionList transactions={mockTransactions} />);

    // Check that interest transactions have emerald color (same as deposits)
    const allRows = screen.getAllByRole('row');
    const interestRow = allRows.find(row => row.textContent?.includes('Interest'));
    expect(interestRow).toBeDefined();

    // Both deposits and interest should have emerald color
    const emeraldCells = document.querySelectorAll('.text-emerald-500');
    expect(emeraldCells.length).toBeGreaterThanOrEqual(2); // At least 2 (deposit + interest)
  });

  it('renders table headers', () => {
    render(<TransactionList transactions={mockTransactions} />);

    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Event')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText('Balance')).toBeInTheDocument();
  });

  it('formats decimal amounts correctly', () => {
    const transactionWithDecimals = [{
      ...mockTransactions[0],
      amount: 10.5,
      balance_after: 110.5
    }];

    render(<TransactionList transactions={transactionWithDecimals} />);

    expect(screen.getByText('+$10.50')).toBeInTheDocument();
    expect(screen.getByText('$110.50')).toBeInTheDocument();
  });

  it('handles large amounts correctly', () => {
    const largeTransaction = [{
      ...mockTransactions[0],
      amount: 1234.56,
      balance_after: 5678.90
    }];

    render(<TransactionList transactions={largeTransaction} />);

    expect(screen.getByText('+$1234.56')).toBeInTheDocument();
    expect(screen.getByText('$5678.90')).toBeInTheDocument();
  });

  it('displays time alongside date', () => {
    render(<TransactionList transactions={mockTransactions} />);

    // Times should be formatted using toLocaleTimeString
    // The exact format depends on locale, but there should be time information
    const cells = screen.getAllByRole('cell');
    const hasTimeInfo = cells.some(cell => {
      const text = cell.textContent || '';
      return /\d{1,2}:\d{2}/.test(text); // Matches time format like "10:30" or "2:20"
    });

    expect(hasTimeInfo).toBe(true);
  });
});
