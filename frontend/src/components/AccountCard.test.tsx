import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AccountCard from './AccountCard';

describe('AccountCard', () => {
  const mockAccount = {
    id: 1,
    name: 'Savings Account',
    balance: 1234.56,
    interest_rate: 0.05,
    compounding_period: 'monthly'
  };

  it('renders account name', () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText('Savings Account')).toBeInTheDocument();
  });

  it('renders formatted balance', () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText('$1,234.56')).toBeInTheDocument();
  });

  it('renders interest rate percentage', () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('renders compounding period in uppercase', () => {
    render(<AccountCard account={mockAccount} />);
    expect(screen.getByText('monthly')).toBeInTheDocument();
  });

  it('renders link to account detail page', () => {
    render(<AccountCard account={mockAccount} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/account/1');
  });

  it('formats balance with thousands separator', () => {
    const highBalanceAccount = {
      ...mockAccount,
      balance: 12345.67
    };
    render(<AccountCard account={highBalanceAccount} />);
    expect(screen.getByText('$12,345.67')).toBeInTheDocument();
  });

  it('formats small balance with two decimal places', () => {
    const smallBalanceAccount = {
      ...mockAccount,
      balance: 5.5
    };
    render(<AccountCard account={smallBalanceAccount} />);
    expect(screen.getByText('$5.50')).toBeInTheDocument();
  });

  it('displays zero balance correctly', () => {
    const zeroBalanceAccount = {
      ...mockAccount,
      balance: 0
    };
    render(<AccountCard account={zeroBalanceAccount} />);
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('formats high interest rate correctly', () => {
    const highInterestAccount = {
      ...mockAccount,
      interest_rate: 0.125
    };
    render(<AccountCard account={highInterestAccount} />);
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('formats low interest rate correctly', () => {
    const lowInterestAccount = {
      ...mockAccount,
      interest_rate: 0.005
    };
    render(<AccountCard account={lowInterestAccount} />);
    expect(screen.getByText('0.5%')).toBeInTheDocument();
  });

  it('displays different compounding periods', () => {
    const dailyCompounding = {
      ...mockAccount,
      compounding_period: 'daily'
    };
    render(<AccountCard account={dailyCompounding} />);
    expect(screen.getByText('daily')).toBeInTheDocument();
  });
});
