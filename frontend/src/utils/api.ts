// src/utils/api.ts

// Determine base URL based on environment (SSR vs Client)
const getBaseUrl = () => {
  if (import.meta.env.SSR) {
    // When running on the server (SSR), use the internal Docker/localhost URL
    return process.env.INTERNAL_API_URL || 'http://localhost:4000/api';
  }
  // When running on the client, use the public URL or relative path (proxy)
  return import.meta.env.PUBLIC_API_URL || '/api';
};

const API_BASE = getBaseUrl();

export async function getAccounts() {
  const response = await fetch(`${API_BASE}/accounts`);
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

export async function getAccount(id: string) {
  const response = await fetch(`${API_BASE}/accounts/${id}`);
  if (!response.ok) throw new Error('Failed to fetch account');
  return response.json();
}

export async function createAccount(data: any) {
    const response = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create account');
    }
    return response.json();
}

export async function getTransactions(accountId: string) {
  const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

export async function createTransaction(accountId: string, data: any) {
  const response = await fetch(`${API_BASE}/accounts/${accountId}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
     const err = await response.json();
     throw new Error(err.error || 'Failed to create transaction');
  }
  return response.json();
}

export async function calculateInterest(accountId: string) {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/calculate-interest`, {
        method: 'POST'
    });
    if (!response.ok) throw new Error('Failed to calculate interest');
    return response.json();
}

export async function getAccountStatistics(accountId: string) {
    const response = await fetch(`${API_BASE}/accounts/${accountId}/statistics`);
    if (!response.ok) throw new Error('Failed to fetch statistics');
    return response.json();
}

export async function updateTransaction(transactionId: string, data: any) {
    const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update transaction');
    }
    return response.json();
}

export async function deleteTransaction(transactionId: string) {
    const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete transaction');
    }
    return response.json();
}
