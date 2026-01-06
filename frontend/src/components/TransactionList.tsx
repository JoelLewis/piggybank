import React, { useMemo, useState } from 'react';
import { History, Edit2, Trash2, Filter, X } from 'lucide-react';
import { updateTransaction, deleteTransaction } from '../utils/api';

interface Transaction {
  id: number;
  date: string; // or transaction_date
  type: 'deposit' | 'withdrawal' | 'interest';
  category: string;
  amount: number;
  balance_after: number;
  transaction_date: string;
  note?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ amount: '', category: '', note: '' });
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    return filtered.sort((a, b) =>
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [transactions, filterType, filterCategory]);

  // Paginate transactions
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({
      amount: tx.amount.toString(),
      category: tx.category,
      note: tx.note || ''
    });
    setError(null);
  };

  const handleSaveEdit = async (id: number) => {
    try {
      setError(null);
      await updateTransaction(id.toString(), {
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        note: editForm.note
      });
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transaction? This will recalculate your balance.')) {
      return;
    }
    try {
      await deleteTransaction(id.toString());
      window.location.reload();
    } catch (err: any) {
      alert('Failed to delete transaction: ' + err.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-50 bg-slate-50/30">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold flex items-center gap-2 text-slate-700">
            <History size={18} /> Transaction Ledger
          </h2>
          <div className="text-sm text-slate-500">
            Showing {paginatedTransactions.length} of {filteredTransactions.length} transactions
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <Filter size={16} className="text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="interest">Interest</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {(filterType !== 'all' || filterCategory !== 'all') && (
            <button
              onClick={() => {
                setFilterType('all');
                setFilterCategory('all');
                setCurrentPage(1);
              }}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Event</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-right">Balance</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedTransactions.map(tx => (
              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-slate-600">
                  {new Date(tx.transaction_date).toLocaleDateString()}
                  <div className="text-[10px] text-slate-400 font-normal">
                    {new Date(tx.transaction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'deposit' ? 'bg-emerald-500' : tx.type === 'withdrawal' ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                    <div>
                      <span className="text-sm font-bold text-slate-800">{tx.category}</span>
                      {tx.note && <div className="text-xs text-slate-500 mt-0.5">{tx.note}</div>}
                    </div>
                  </div>
                </td>
                <td className={`px-6 py-4 text-right font-black ${tx.type === 'withdrawal' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {tx.type === 'withdrawal' ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-400 text-sm">
                  ${Number(tx.balance_after).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {tx.type !== 'interest' && (
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(tx)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit transaction"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete transaction"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {paginatedTransactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">
                  {filteredTransactions.length === 0 && transactions.length > 0
                    ? 'No transactions match your filters.'
                    : 'No transactions yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-slate-50 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 text-sm font-medium rounded ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Edit Transaction</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                <input
                  type="text"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Note (optional)</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  maxLength={200}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div className="text-xs text-slate-500 mt-1">{editForm.note.length}/200</div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleSaveEdit(editingId)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-6 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
