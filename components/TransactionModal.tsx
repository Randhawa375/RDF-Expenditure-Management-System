
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  editTransaction?: Transaction | null;
  defaultType?: TransactionType;
  defaultDate?: string;
  isTypeLocked?: boolean;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editTransaction, 
  defaultType = TransactionType.EXPENSE,
  defaultDate,
  isTypeLocked = false
}) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: defaultType,
    date: defaultDate || new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
  });

  useEffect(() => {
    if (editTransaction) {
      setFormData(editTransaction);
    } else {
      setFormData({ 
        type: defaultType, 
        date: defaultDate || new Date().toISOString().split('T')[0], 
        amount: 0, 
        description: '' 
      });
    }
  }, [editTransaction, defaultType, defaultDate, isOpen]);

  if (!isOpen) return null;

  const activeType = formData.type || TransactionType.EXPENSE;
  const isExpense = activeType === TransactionType.EXPENSE;
  const accentColor = isExpense ? 'bg-rose-500' : 'bg-emerald-500';
  const accentBorder = isExpense ? 'border-rose-100' : 'border-emerald-100';
  const accentText = isExpense ? 'text-rose-600' : 'text-emerald-600';

  const shouldHideDate = !!defaultDate && !editTransaction;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-slate-50">
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
              {editTransaction ? 'Edit Record' : 'Add New Entry'}
            </h3>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 leading-none">Transaction Detail</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 text-slate-300 hover:text-slate-900 rounded-xl transition-all hover:bg-slate-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Amount Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Amount (رقم)</label>
            <div className={`bg-slate-50 p-4 rounded-2xl border transition-all ${accentBorder}`}>
               <input 
                type="number" 
                className="w-full bg-transparent outline-none text-center text-2xl font-black text-slate-900 placeholder-slate-200" 
                placeholder="0"
                value={formData.amount || ''} 
                onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} 
                autoFocus
              />
            </div>
          </div>

          {/* Description Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Description (تفصیل)</label>
            <input 
              type="text" 
              className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-100 transition-all font-urdu text-lg font-bold placeholder-slate-300" 
              placeholder="تفصیل لکھیں"
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
          </div>

          {!shouldHideDate && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Date (تاریخ)</label>
              <input 
                type="date" 
                className="w-full px-5 py-3 bg-slate-50 border border-transparent rounded-2xl outline-none focus:border-indigo-100 font-bold text-slate-700 text-xs cursor-pointer" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
              />
            </div>
          )}
        </div>

        <div className="mt-8">
          <button 
            onClick={() => onSave({...formData, id: editTransaction?.id || crypto.randomUUID()} as Transaction)} 
            className={`w-full py-4 ${accentColor} text-white rounded-2xl text-lg font-urdu font-black shadow-lg hover:brightness-105 active:scale-95 transition-all`}
          >
            محفوظ کریں (Save)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;
