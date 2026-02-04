
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionType, PersonExpense } from '../types';
import { jsPDF } from 'jspdf';

interface DashboardProps {
  transactions: Transaction[];
  personExpenses?: PersonExpense[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, personExpenses = [] }) => {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit'
    }).format(new Date()).slice(0, 7);
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const filteredPersonExpenses = useMemo(() => {
    return personExpenses.filter(e => e.date.startsWith(selectedMonth));
  }, [personExpenses, selectedMonth]);

  const stats = useMemo(() => {
    const mainStats = filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.totalIncome += t.amount;
      else acc.totalExpenses += t.amount;
      return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    const personTotalExpense = filteredPersonExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalIncome: mainStats.totalIncome,
      totalExpenses: mainStats.totalExpenses + personTotalExpense,
      mainExpenses: mainStats.totalExpenses,
      personExpenses: personTotalExpense
    };
  }, [filteredTransactions, filteredPersonExpenses]);

  const profit = stats.totalIncome - stats.totalExpenses;

  const downloadFullMonthlyReport = () => {
    try {
      const doc = new jsPDF();
      const monthName = new Date(selectedMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });
      const timestamp = new Date().toLocaleString();

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 45, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('RDF EXPENDITURE', 20, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('MANAGEMENT SYSTEM', 20, 32);

      doc.setFontSize(9);
      doc.text(`Period: ${monthName.toUpperCase()}`, 190, 25, { align: 'right' });
      doc.text(`Generated: ${timestamp}`, 190, 31, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 55, 170, 35, 3, 3, 'FD');

      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL RECEIVED', 30, 65);
      doc.text('TOTAL EXPENSES', 85, 65);
      doc.text('NET BALANCE', 140, 65);

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text(`PKR ${stats.totalIncome.toLocaleString()}`, 30, 78);

      doc.setTextColor(225, 29, 72);
      doc.text(`PKR ${stats.totalExpenses.toLocaleString()}`, 85, 78);

      if (profit >= 0) doc.setTextColor(79, 70, 229);
      else doc.setTextColor(225, 29, 72);
      doc.text(`PKR ${profit.toLocaleString()}`, 140, 78);

      // Note about person expenses inclusion
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');

      if (stats.personExpenses > 0) {
        doc.text(`* Includes PKR ${stats.personExpenses.toLocaleString()} from Staff Expenses`, 85, 85);
      }

      let y = 110;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Monthly Transaction Details', 20, 100);

      doc.setFillColor(241, 245, 249);
      doc.rect(20, y - 6, 170, 10, 'F');

      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text('Date', 25, y);
      doc.text('Type', 45, y);
      doc.text('Description', 70, y);
      doc.text('Amount (PKR)', 185, y, { align: 'right' });

      y += 10;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      // Merge and sort all transactions + person expenses for the report
      const allItems = [
        ...filteredTransactions.map(t => ({ ...t, displayType: t.type === TransactionType.INCOME ? 'Received' : 'Expense' })),
        ...filteredPersonExpenses.map(e => ({
          id: e.id,
          date: e.date,
          amount: e.amount,
          description: `(Staff) ${e.description}`,
          type: TransactionType.EXPENSE,
          displayType: 'Staff Exp'
        }))
      ].sort((a, b) => a.date.localeCompare(b.date));

      allItems.forEach((t, index) => {
        if (y > 275) {
          doc.addPage();
          y = 30;
          doc.setFillColor(241, 245, 249);
          doc.rect(20, y - 6, 170, 10, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text('Date', 25, y);
          doc.text('Type', 45, y);
          doc.text('Description', 70, y);
          doc.text('Amount (PKR)', 185, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          y += 10;
        }

        if (index % 2 === 0) {
          doc.setFillColor(252, 252, 252);
          doc.rect(20, y - 5, 170, 9, 'F');
        }

        doc.text(t.date, 25, y);
        doc.text(t.displayType, 45, y);
        const desc = t.description.length > 50 ? t.description.substring(0, 47) + '...' : t.description;
        doc.text(desc, 70, y);

        if (t.type === TransactionType.INCOME) doc.setTextColor(16, 185, 129);
        else doc.setTextColor(225, 29, 72);

        doc.text(t.amount.toLocaleString(), 185, y, { align: 'right' });
        doc.setTextColor(30, 41, 59);
        y += 9;
      });

      doc.save(`RDF_Monthly_Summary_${selectedMonth}.pdf`);
    } catch (e) { alert("Error generating PDF"); }
  };

  return (
    <div className="space-y-8">
      {/* Header Area - Centered for both views */}
      <div className="flex flex-col items-center gap-6 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
          Welcome to <span className="text-indigo-600">RDF</span>
        </h2>

        <div className="flex flex-col items-center gap-4 w-full">
          {/* Month Picker Styled like a button */}
          <div className="bg-white border border-slate-100 p-2 rounded-2xl flex items-center shadow-sm w-full max-w-xs">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest px-4 border-r border-slate-100 mr-2">Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none px-4 py-2 rounded-xl text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer w-full text-center"
            />
          </div>

          {/* Download Button */}
          <button
            onClick={downloadFullMonthlyReport}
            className="bg-slate-900 text-white w-full max-w-xs px-6 py-4 rounded-2xl flex items-center justify-center gap-4 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95 group"
          >
            <svg className="w-5 h-5 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] font-black uppercase tracking-widest mb-0.5">Download Report</span>
              <span className="font-urdu text-xs opacity-70">رپورٹ ڈاؤن لوڈ کریں</span>
            </div>
          </button>
        </div>
      </div>

      {/* Main Stats - 1 col on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment Received Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-[1.01] flex flex-col items-center text-center">
          <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl mb-5">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Payment Received</span>
          <div className="text-3xl font-black text-slate-900 mb-1 leading-none">PKR {stats.totalIncome.toLocaleString()}</div>
          <div className="font-urdu text-emerald-600 text-xl font-bold">وصول شدہ رقم</div>
        </div>

        {/* Total Expense Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-[1.01] flex flex-col items-center text-center">
          <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl mb-5">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Expense</span>
          <div className="text-3xl font-black text-slate-900 mb-1 leading-none">PKR {stats.totalExpenses.toLocaleString()}</div>
          <div className="font-urdu text-rose-600 text-xl font-bold">کل خرچہ</div>
        </div>

        {/* Net Balance Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-[1.01] flex flex-col items-center text-center">
          <div className={`p-4 rounded-2xl mb-5 ${profit >= 0 ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Net Balance</span>
          <div className={`text-3xl font-black mb-1 leading-none ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>PKR {profit.toLocaleString()}</div>
          <div className={`font-urdu text-xl font-bold ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>بیلنس</div>
        </div>
      </div>

      {/* Large Navigation Buttons - 1 column on mobile, 3 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/receipts')}
          className="bg-white hover:bg-emerald-50 text-slate-900 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all flex flex-col md:flex-row gap-6 items-center group"
        >
          <div className="bg-emerald-500 text-white p-5 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-emerald-200">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-2">Received Ledger</span>
            <span className="text-2xl md:text-3xl font-urdu font-black text-emerald-600 leading-tight">وصولیوں کا کھاتہ</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/expenses')}
          className="bg-white hover:bg-rose-50 text-slate-900 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all flex flex-col md:flex-row gap-6 items-center group"
        >
          <div className="bg-rose-500 text-white p-5 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-rose-200">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-2">Expense Dashboard</span>
            <span className="text-2xl md:text-3xl font-urdu font-black text-rose-600 leading-tight">خرچے کا کھاتہ</span>
          </div>
        </button>

        <button
          onClick={() => navigate('/people')}
          className="bg-white hover:bg-indigo-50 text-slate-900 p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all flex flex-col md:flex-row gap-6 items-center group"
        >
          <div className="bg-indigo-600 text-white p-5 rounded-2xl group-hover:scale-110 transition-transform shadow-lg shadow-indigo-200">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-2">Person Dashboard</span>
            <span className="text-2xl md:text-3xl font-urdu font-black text-indigo-600 leading-tight">افراد کا کھاتہ</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
