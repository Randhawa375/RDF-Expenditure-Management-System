
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, Person } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction, personId?: string, targetPersonId?: string) => void;
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
  const [targetPersonId, setTargetPersonId] = useState<string>('');

  useEffect(() => {
    if (editTransaction) {
      setFormData(editTransaction);
      setSelectedPersonId('');
      setTargetPersonId('');
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
      setTargetPersonId('');
    }
  }, [editTransaction, defaultType, defaultDate, isOpen]);

  if (!isOpen) return null;

  const activeType = formData.type || TransactionType.EXPENSE;
  const isTransfer = activeType === TransactionType.TRANSFER;
  const isIncome = activeType === TransactionType.INCOME;
  const isExpense = activeType === TransactionType.EXPENSE;

  let accentColor = 'bg-slate-800';
  let accentBorder = 'border-slate-200';

  if (isExpense) {
    accentColor = 'bg-rose-500';
    accentBorder = 'border-rose-100';
  } else if (isIncome) {
    accentColor = 'bg-emerald-500';
    accentBorder = 'border-emerald-100';
  } else if (isTransfer) {
    accentColor = 'bg-indigo-500';
    accentBorder = 'border-indigo-100';
  }

  const shouldHideDate = !!defaultDate && !editTransaction;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/20 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 border border-slate-50 max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-start mb-4">
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

        {/* Type Switcher */}
        {!isTypeLocked && !editTransaction && (
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button
              onClick={() => setFormData({ ...formData, type: TransactionType.EXPENSE })}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${isExpense ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Expense
            </button>
            <button
              onClick={() => setFormData({ ...formData, type: TransactionType.INCOME })}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${isIncome ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Income
            </button>
            <button
              onClick={() => setFormData({ ...formData, type: TransactionType.TRANSFER })}
              className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${isTransfer ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Transfer (ٹرانسفر)
            </button>
          </div>
        )}

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

          {/* Transfer Logic: Source & Dest */}
          {isTransfer && !editTransaction && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 leading-none">From (Sender / دینے والا)</label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full px-3 py-3.5 bg-indigo-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-indigo-100 transition-all font-bold text-slate-700 text-xs appearance-none"
                >
                  <option value="">-- Select --</option>
                  {persons.map(person => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 leading-none">To (Receiver / لینے والا)</label>
                <select
                  value={targetPersonId}
                  onChange={(e) => setTargetPersonId(e.target.value)}
                  className="w-full px-3 py-3.5 bg-emerald-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-emerald-100 transition-all font-bold text-slate-700 text-xs appearance-none"
                >
                  <option value="">-- Select --</option>
                  {persons.filter(p => p.id !== selectedPersonId).map(person => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Normal Link Logic */}
          {!isTransfer && !editTransaction && persons.length > 0 && (
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
            onClick={() => onSave({ ...formData, id: editTransaction?.id || crypto.randomUUID() } as Transaction, selectedPersonId, targetPersonId)}
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
