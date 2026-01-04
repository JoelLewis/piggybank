import React, { useState } from 'react';
import { DollarSign } from 'lucide-react';
import { createTransaction } from '../utils/api';

interface TransactionFormProps {
  accountId: string;
  onTransactionSuccess: () => void;
}

export default function TransactionForm({ accountId, onTransactionSuccess }: TransactionFormProps) {
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CATEGORIES = {
    deposit: ["Allowance", "Tooth Fairy", "Gift", "Chore", "Other"],
    withdrawal: ["Toy", "Candy", "Savings Goal", "Other"]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    if (!category) {
        setCategory(CATEGORIES[type][0]); // Default to first if not selected
    }

    setLoading(true);
    setError(null);

    try {
      await createTransaction(accountId, {
        type,
        amount: parseFloat(amount),
        category: category || CATEGORIES[type][0],
        note
      });
      setAmount('');
      setNote('');
      onTransactionSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-full">
      <h3 className="font-bold text-slate-800 mb-4">New Transaction</h3>
      
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
        {(['deposit', 'withdrawal'] as const).map(t => (
          <button 
            key={t} 
            type="button"
            onClick={() => { setType(t); setCategory(''); }} 
            className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="number" 
            step="0.01"
            placeholder="0.00" 
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-lg" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Category</label>
            <div className="grid grid-cols-2 gap-2">
                {CATEGORIES[type].map(c => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`text-xs font-bold py-2 px-3 rounded-lg border transition-all ${category === c ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>
        </div>

        <input 
          type="text" 
          placeholder="Note (optional)" 
          className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium" 
          value={note} 
          onChange={(e) => setNote(e.target.value)}
        />

        {error && <div className="text-rose-500 text-sm font-bold bg-rose-50 p-3 rounded-xl">{error}</div>}

        <button 
          type="submit" 
          disabled={loading}
          className={`w-full py-4 rounded-2xl font-black text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${type === 'deposit' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
        >
          {loading ? 'Processing...' : `Post ${type.charAt(0).toUpperCase() + type.slice(1)}`}
        </button>
      </form>
    </div>
  );
}
