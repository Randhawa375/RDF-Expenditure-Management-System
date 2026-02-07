
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction, TransactionType, PersonExpense, MonthlyNote } from '../types';
import { jsPDF } from 'jspdf';
import { PdfGenerator } from '../services/pdfGenerator';
import autoTable from 'jspdf-autotable';

interface DashboardProps {
  transactions: Transaction[];
  personExpenses?: PersonExpense[];
  monthlyNotes?: MonthlyNote[];
  onSaveNote?: (note: MonthlyNote) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onAdd: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  transactions,
  personExpenses = [],
  monthlyNotes = [],
  onSaveNote,
  onDeleteNote,
  onAdd
}) => {
  const navigate = useNavigate();
  const [activeDetailView, setActiveDetailView] = useState<'income' | 'expense' | 'balance' | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteAmount, setNoteAmount] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

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

  const filteredMonthlyNotes = useMemo(() => {
    return monthlyNotes.filter(n => n.month === selectedMonth);
  }, [monthlyNotes, selectedMonth]);

  // Today's Date helpers
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayStats = useMemo(() => {
    const todayTrans = transactions.filter(t => t.date === todayDate);
    const todayPersonExp = personExpenses.filter(e => e.date === todayDate);

    const mainStats = todayTrans.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.totalIncome += t.amount;
      else if (t.type === TransactionType.EXPENSE) acc.totalExpenses += t.amount;
      return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    const personTotal = todayPersonExp.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalIncome: mainStats.totalIncome,
      totalExpenses: mainStats.totalExpenses, // Removed + personTotal to prevent double counting
      mainExpenses: mainStats.totalExpenses,
      personExpenses: personTotal,
      transactions: todayTrans,
      personTrans: todayPersonExp
    };
  }, [transactions, personExpenses, todayDate]);

  const stats = useMemo(() => {
    const mainStats = filteredTransactions.reduce((acc, t) => {
      if (t.type === TransactionType.INCOME) acc.totalIncome += t.amount;
      else if (t.type === TransactionType.EXPENSE) acc.totalExpenses += t.amount;
      // If we want TRANSFER to be included in Expenses (like in Daily Ledger), we should add it here too.
      // But for now, let's stick to user's request about double counting.
      // If user records Transfer as Expense, it's already here.
      return acc;
    }, { totalIncome: 0, totalExpenses: 0 });

    const personTotalExpense = filteredPersonExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalIncome: mainStats.totalIncome,
      totalExpenses: mainStats.totalExpenses, // Removed + personTotalExpense
      mainExpenses: mainStats.totalExpenses,
      personExpenses: personTotalExpense
    };
  }, [filteredTransactions, filteredPersonExpenses]);

  const profit = stats.totalIncome - stats.totalExpenses;

  // Group Person Expenses for Breakdown
  const personBreakdown = useMemo(() => {
    const breakdown: Record<string, { name: string, amount: number }> = {};
    filteredPersonExpenses.forEach(e => {
      if (!breakdown[e.person_id]) {
        // We don't have the name directly here, we might need to rely on the fact that
        // Person Expenses might need to come with names joined or we look them up?
        // Ah, PersonExpense doesn't have the name. We need to pass persons list or assume
        // the App.tsx could enrich it OR just use description which says "(Staff) Desc" in PDF but here?
        // Wait, PersonExpense has `person_id`.
        // To show names we need the Person list.
        // Let's use a workaround: The description usually contains some info? No.
        // We really should pass `persons` to Dashboard if we want names.
        // But for now let's just group by ID and maybe we can't show name easily without fetching it?
        // Actually, let's just LIST the expenses with their descriptions for now or 
        // request App.tsx to pass persons.
        // Wait, the user request "to whom person this payment is remaining".
        // Use the passed PersonExpense list.
      }
      // Actually simpler: Just show the list of Staff Expenses in the details view.
    });
    return [];
  }, [filteredPersonExpenses]);

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveNote) return;
    setIsSubmittingNote(true);
    try {
      await onSaveNote({
        id: crypto.randomUUID(),
        month: selectedMonth,
        title: noteTitle,
        amount: Number(noteAmount)
      });
      setNoteTitle('');
      setNoteAmount('');
      setIsNoteModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (onDeleteNote) {
      await onDeleteNote(id);
    }
  };


  const downloadFullMonthlyReport = async () => {
    try {
      const doc = await PdfGenerator.initPDF();
      const monthName = new Date(selectedMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });

      PdfGenerator.addHeader(
        doc,
        'MONTHLY STATEMENT',
        'RDF EMS',
        `PERIOD: ${monthName.toUpperCase()}`
      );

      // Financial Summary Dashboard
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 50, 170, 35, 3, 3, 'FD');

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL RECEIVED', 30, 60);
      doc.text('TOTAL EXPENSES', 85, 60);
      doc.text('NET BALANCE', 140, 60);

      doc.setFontSize(14);
      doc.setTextColor(16, 185, 129);
      doc.text(`PKR ${stats.totalIncome.toLocaleString()}`, 30, 73);

      doc.setTextColor(225, 29, 72);
      doc.text(`PKR ${stats.totalExpenses.toLocaleString()}`, 85, 73);

      if (profit >= 0) doc.setTextColor(79, 70, 229);
      else doc.setTextColor(225, 29, 72);
      doc.text(`PKR ${profit.toLocaleString()}`, 140, 73);

      // Note about person expenses inclusion
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');



      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Details', 20, 95);

      // Merge and sort all transactions + person expenses for the report
      const allItems = [
        ...filteredTransactions.map(t => ({
          ...t,
          displayType: t.type === TransactionType.INCOME ? 'Received' : 'Expense'
        }))
      ].sort((a, b) => a.date.localeCompare(b.date));

      const tableColumn = ["Date", "Type", "Description", "Amount (PKR)"];
      const tableRows = allItems.map(t => [
        t.date,
        t.displayType,
        t.description,
        t.amount.toLocaleString()
      ]);

      autoTable(doc, {
        startY: 100,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: {
          font: 'Amiri',
          fontStyle: 'normal',
          fontSize: 9,
          textColor: [30, 41, 59],
          valign: 'middle',
          lineColor: [226, 232, 240],
          lineWidth: 0.1,
          cellPadding: 4
        },
        headStyles: {
          fillColor: [15, 23, 42], // Slate 900
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'helvetica',
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // Slate 50
        },
        margin: { top: 30, right: 20, left: 20 },
        didParseCell: (data: any) => {
          // Color coding for amount column
          if (data.section === 'body' && data.column.index === 3) {
            const originalEntry = allItems[data.row.index];
            if (originalEntry) {
              const isIncome = originalEntry.type === TransactionType.INCOME;
              data.cell.styles.textColor = isIncome ? [16, 185, 129] : [225, 29, 72];
            }
          }
        }
      });

      PdfGenerator.addFooter(doc);

      doc.save(`RDF_Monthly_Summary_${selectedMonth}.pdf`);
    } catch (e) {
      console.error(e);
      alert(`Error generating PDF: ${(e as Error).message}`);
    }
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
        <button
          onClick={() => setActiveDetailView('income')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md flex flex-col items-center text-center cursor-pointer group"
        >
          <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl mb-5 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-emerald-600 transition-colors">Payment Received</span>
          <div className="text-3xl font-black text-slate-900 mb-1 leading-none">PKR {stats.totalIncome.toLocaleString()}</div>
          <div className="font-urdu text-emerald-600 text-xl font-bold">وصول شدہ رقم</div>
        </button>

        {/* Total Expense Card */}
        <button
          onClick={() => setActiveDetailView('expense')}
          className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md flex flex-col items-center text-center cursor-pointer group"
        >
          <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl mb-5 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 group-hover:text-rose-600 transition-colors">Total Expense</span>
          <div className="text-3xl font-black text-slate-900 mb-1 leading-none">PKR {stats.totalExpenses.toLocaleString()}</div>
          <div className="font-urdu text-rose-600 text-xl font-bold">کل خرچہ</div>
        </button>

        {/* Net Balance Card */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-transform hover:scale-[1.01] flex flex-col items-center text-center">
          <div className={`p-4 rounded-2xl mb-5 ${profit >= 0 ? 'bg-indigo-50 text-indigo-500' : 'bg-rose-50 text-rose-500'}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Net Balance</span>
          <div className={`text-3xl font-black mb-1 leading-none ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>PKR {profit.toLocaleString()}</div>
          <div className={`font-urdu text-xl font-bold ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>بیلنس</div>

          <button
            onClick={() => setActiveDetailView('balance')}
            className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 border-b border-transparent hover:border-indigo-600 transition-all"
          >
            View Breakdown / Add Note
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {activeDetailView && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[90vh] flex flex-col">
            <div className={`px-6 py-5 flex justify-between items-center shrink-0 ${activeDetailView === 'income' ? 'bg-emerald-600' :
              activeDetailView === 'expense' ? 'bg-rose-600' :
                'bg-slate-900'
              }`}>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  {activeDetailView === 'income' ? 'Total Received Details' :
                    activeDetailView === 'expense' ? 'Total Expense Details' :
                      'Net Balance Details'}
                </h2>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-0.5">
                  {activeDetailView === 'income' ? 'وصول شدہ رقم کی تفصیل' :
                    activeDetailView === 'expense' ? 'کل خرچہ کی تفصیل' :
                      'تفصیلات'}
                </p>
              </div>
              <button
                onClick={() => setActiveDetailView(null)}
                className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {activeDetailView === 'balance' && (
                <>
                  {/* Calculation Summary */}
                  <div className="bg-indigo-50 p-4 rounded-xl mb-6">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="font-bold text-slate-600">Total Income</span>
                      <span className="font-mono font-bold text-emerald-600">+ {stats.totalIncome.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="font-bold text-slate-600">Total Expense</span>
                      <span className="font-mono font-bold text-rose-600">- {stats.totalExpenses.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-indigo-200 mt-2 pt-2 flex justify-between items-center">
                      <span className="font-black text-slate-800">Net Balance</span>
                      <span className={`font-mono font-black ${profit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {profit.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Staff Expenses Section Removed to prevent double counting confusion */}

                  {/* Manual Notes Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Additional Notes / Payables (دیگر واجبات / نوٹس)</h3>
                      <button
                        onClick={() => setIsNoteModalOpen(true)}
                        className="text-[10px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      >
                        + Add Note
                      </button>
                    </div>

                    {filteredMonthlyNotes.length === 0 ? (
                      <p className="text-sm text-slate-400 italic">No notes added.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredMonthlyNotes.map(n => (
                          <div key={n.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm group">
                            <div>
                              <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-slate-700 text-sm">{n.amount.toLocaleString()}</span>
                              <button
                                onClick={() => handleDeleteNote(n.id)}
                                className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 mt-2">
                          <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wide mb-1">Impact Analysis</p>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-orange-800 font-medium">Net Balance</span>
                            <span className="font-mono font-bold text-slate-700">{profit.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-orange-800 font-medium">Minus Notes Total</span>
                            <span className="font-mono font-bold text-rose-600">
                              - {filteredMonthlyNotes.reduce((sum, n) => sum + n.amount, 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="border-t border-orange-200/50 mt-1 pt-1 flex justify-between items-center text-sm">
                            <span className="text-orange-900 font-bold">Remaining</span>
                            <span className="font-mono font-bold text-orange-900">
                              {(profit - filteredMonthlyNotes.reduce((sum, n) => sum + n.amount, 0)).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeDetailView === 'income' && (
                <div className="space-y-4">
                  {filteredTransactions.filter(t => t.type === TransactionType.INCOME).length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">No income records for this month.</p>
                  ) : (
                    filteredTransactions.filter(t => t.type === TransactionType.INCOME)
                      .sort((a, b) => b.date.localeCompare(a.date)) // newest first
                      .map(t => (
                        <div key={t.id} className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                          <div>
                            <p className="font-bold text-slate-800">{t.description}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">{t.date}</p>
                          </div>
                          <span className="font-mono font-black text-emerald-600 text-lg">+ {t.amount.toLocaleString()}</span>
                        </div>
                      ))
                  )}
                </div>
              )}

              {activeDetailView === 'expense' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 sticky top-0 bg-white py-2">General Expenses</h3>
                  {filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-4">No expense records for this month.</p>
                  ) : (
                    <>
                      {filteredTransactions.filter(t => t.type === TransactionType.EXPENSE)
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map(t => (
                          <div key={t.id} className="flex justify-between items-center bg-rose-50 p-4 rounded-xl border border-rose-100">
                            <div>
                              <p className="font-bold text-slate-800">{t.description}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{t.date}</p>
                            </div>
                            <span className="font-mono font-black text-rose-600 text-lg">- {t.amount.toLocaleString()}</span>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Add Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-slate-900 text-lg mb-4">Add Balance Note</h3>
            <form onSubmit={handleSaveNote} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Title / Description</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Pending Payment to X"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Amount</label>
                <input
                  type="number"
                  value={noteAmount}
                  onChange={(e) => setNoteAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="0"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNote}
                  className="px-4 py-2 text-sm font-black text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
                >
                  {isSubmittingNote ? 'Saving...' : 'Add Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div >
  );
};

export default Dashboard;
