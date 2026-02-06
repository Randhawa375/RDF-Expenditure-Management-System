
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Person } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction, personId?: string) => void;
  editTransaction?: Transaction | null;
  defaultType?: TransactionType;
  defaultDate?: string;
  isTypeLocked?: boolean;
  persons?: Person[];
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTransaction,
  defaultType = TransactionType.EXPENSE,
  defaultDate,
  isTypeLocked = false,
  persons = []
}) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: defaultType,
    date: defaultDate || (() => {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Karachi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
    })(),
    amount: 0,
    description: '',
  });
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');

  useEffect(() => {
    if (editTransaction) {
      setFormData(editTransaction);
      setSelectedPersonId(''); // Reset person on edit for now as we don't track it in main transaction yet
    } else {
      setFormData({
        type: defaultType,
        date: defaultDate || (() => {
          return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Karachi',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).format(new Date());
        })(),
        amount: 0,
        description: ''
      });
      setSelectedPersonId('');
    }
  }, [editTransaction, defaultType, defaultDate, isOpen]);

  if (!isOpen) return null;

  const activeType = formData.type || TransactionType.EXPENSE;
  const isExpense = activeType === TransactionType.EXPENSE;
  const accentColor = isExpense ? 'bg-rose-500' : 'bg-emerald-500';
  const accentBorder = isExpense ? 'border-rose-100' : 'border-emerald-100';
  // const accentText = isExpense ? 'text-rose-600' : 'text-emerald-600'; // Unused

  const shouldHideDate = !!defaultDate && !editTransaction;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/20 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 border border-slate-50 max-h-[90vh] overflow-y-auto">

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
                onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                autoFocus
              />
            </div>
          </div>

          {/* Person Selector */}
          {!editTransaction && persons.length > 0 && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">
                Link to Person (کسی فرد سے منسلک کریں)
              </label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-100 transition-all font-bold text-slate-700 text-sm appearance-none"
              >
                <option value="">-- No Person (کوئی نہیں) --</option>
                {persons.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Description (تفصیل)</label>
            <input
              type="text"
              className="w-full px-5 py-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-100 transition-all font-urdu text-lg font-bold placeholder-slate-300"
              placeholder="تفصیل لکھیں"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {!shouldHideDate && (
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 leading-none">Date (تاریخ)</label>
              <input
                type="date"
                className="w-full px-5 py-3 bg-slate-50 border border-transparent rounded-2xl outline-none focus:border-indigo-100 font-bold text-slate-700 text-xs cursor-pointer"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          )}
        </div>

        <div className="mt-8">
          <button
            onClick={() => onSave({ ...formData, id: editTransaction?.id || crypto.randomUUID() } as Transaction, selectedPersonId)}
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
