import React from 'react';
import { User, TrendingUp, ChevronRight } from 'lucide-react';

interface Account {
  id: number;
  name: string;
  balance: number;
  interest_rate: number;
  compounding_period: string;
}

interface AccountCardProps {
  account: Account;
}

export default function AccountCard({ account }: AccountCardProps) {
  return (
    <a href={`/account/${account.id}`} className="block">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group h-full flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <User size={24} />
            </div>
            <div className="text-[10px] font-black tracking-widest text-slate-300 uppercase bg-slate-50 px-3 py-1 rounded-full">
              {account.compounding_period}
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-1">{account.name}</h3>
          <div className="text-4xl font-black text-indigo-600 mb-6">
            ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
          <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-sm">
            <TrendingUp size={14} /> {(account.interest_rate * 100).toFixed(1)}%
          </div>
          <ChevronRight className="text-slate-300 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </a>
  );
}
