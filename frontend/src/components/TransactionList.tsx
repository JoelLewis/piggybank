import React, { useMemo } from 'react';
import { History } from 'lucide-react';

interface Transaction {
  id: number;
  date: string; // or transaction_date
  type: 'deposit' | 'withdrawal' | 'interest';
  category: string;
  amount: number;
  balance_after: number;
  transaction_date: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  // Memoize sorted transactions to prevent re-sorting on every render and avoid mutating props
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) =>
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    );
  }, [transactions]);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h2 className="font-bold flex items-center gap-2 text-slate-700"><History size={18} /> Transaction Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Event</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {new Date(tx.transaction_date).toLocaleDateString()}
                    <div className="text-[10px] text-slate-400 font-normal">{new Date(tx.transaction_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'deposit' ? 'bg-emerald-500' : tx.type === 'withdrawal' ? 'bg-rose-500' : 'bg-indigo-500'}`}></span>
                      <span className="text-sm font-bold text-slate-800">{tx.category}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right font-black ${tx.type === 'withdrawal' ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {tx.type === 'withdrawal' ? '-' : '+'}${Number(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-400 text-sm">
                    ${Number(tx.balance_after).toFixed(2)}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                  <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium">No transactions yet.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
}
