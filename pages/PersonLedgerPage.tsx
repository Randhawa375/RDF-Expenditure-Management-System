
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/db';
import { Person, PersonExpense } from '../types';
import { jsPDF } from 'jspdf';
import { PdfGenerator } from '../services/pdfGenerator';
import autoTable from 'jspdf-autotable';

const PersonLedgerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [person, setPerson] = useState<Person | null>(null);
    const [entries, setEntries] = useState<PersonExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [entryType, setEntryType] = useState<'PAYMENT' | 'EXPENSE'>('EXPENSE');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const persons = await db.getPersons();
            const foundPerson = persons.find(p => p.id === id);
            setPerson(foundPerson || null);

            const fetchedEntries = await db.getPersonExpenses(id);
            setEntries(fetchedEntries);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const monthlyEntries = useMemo(() => {
        return entries.filter(e => e.date.startsWith(selectedMonth));
    }, [entries, selectedMonth]);

    const stats = useMemo(() => {
        const payments = monthlyEntries.filter(e => e.type === 'PAYMENT').reduce((sum, e) => sum + e.amount, 0);
        const expenses = monthlyEntries.filter(e => e.type === 'EXPENSE' || e.type === 'RECEIVED' || !e.type).reduce((sum, e) => sum + e.amount, 0);
        return { payments, expenses };
    }, [monthlyEntries]);

    const allTimeStats = useMemo(() => {
        const payments = entries.filter(e => e.type === 'PAYMENT').reduce((sum, e) => sum + e.amount, 0);
        const expenses = entries.filter(e => e.type === 'EXPENSE' || e.type === 'RECEIVED' || !e.type).reduce((sum, e) => sum + e.amount, 0);
        return { payments, expenses };
    }, [entries]);

    // Balance Calculation: Previous Balance + (All Time Payments - All Time Expenses)?
    // Or just Monthly? Usually ledgers are running. 
    // But the UI has a "Previous Balance" field in Person.
    // Let's assume the "Previous Balance" is the starting point.
    // Then we add ALL payments and subtract ALL expenses since creation?
    // Or is "Previous Balance" just a static field and we look at monthly?
    // The user request puts emphasis on "payment we gave" vs "spent".
    // Let's do a running balance for the *viewable* context or better, 
    // if we want a true ledger, we need all time.
    // However, to keep it simple and consistent with the month view, let's show:
    // Opening Balance (Person.previous_balance) + Net Change (All Time? Or just this month?).
    // A confusing part of the original app was "Salary Limit".
    // Let's treat "Salary Limit" as just a reference limit, but "Balance" as actual cash in hand.
    // Cash In Hand = Total Payments Given - Total Expenses Made.
    // If we want to include Previous Balance as "Initial Cash":
    // Cash In Hand = Previous Balance + Payments - Expenses.

    // Let's calculate All-Time Balance for accurate "Remaining/Debt".
    const currentBalance = useMemo(() => {
        if (!person) return 0;
        const allPayments = entries.filter(e => e.type === 'PAYMENT').reduce((sum, e) => sum + e.amount, 0);
        const allExpenses = entries.filter(e => e.type === 'EXPENSE' || e.type === 'RECEIVED' || !e.type).reduce((sum, e) => sum + e.amount, 0);
        return (person.previous_balance || 0) + allPayments - allExpenses;
    }, [person, entries]);

    const downloadReport = async () => {
        if (!person) return;
        try {
            const doc = await PdfGenerator.initPDF();
            const monthName = new Date(selectedMonth + "-01").toLocaleString('default', { month: 'long', year: 'numeric' });

            PdfGenerator.addHeader(
                doc,
                person.name.toUpperCase(),
                `LEDGER: ${monthName.toUpperCase()}`,
                `CURRENT BALANCE: ${currentBalance.toLocaleString()}`
            );

            // Statement Summary
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, 45, 180, 20, 2, 2, 'FD');

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text('Payments (Given)', 25, 53);
            doc.text('Expenses (Spent)', 85, 53);
            doc.text('Net Change', 145, 53);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(16, 185, 129); // Green
            doc.text(stats.payments.toLocaleString(), 25, 60);

            doc.setTextColor(225, 29, 72); // Red
            doc.text(stats.expenses.toLocaleString(), 85, 60);

            const net = stats.payments - stats.expenses;
            net >= 0 ? doc.setTextColor(16, 185, 129) : doc.setTextColor(225, 29, 72);
            doc.text(net.toLocaleString(), 145, 60);

            // Table
            doc.setTextColor(30, 41, 59);
            doc.text('Detailed Transactions', 14, 80);

            // Sort by date OLD to NEW for ledger flow? Or New to Old?
            // Usually ledgers are chronological. Filtered view is Newest first?
            // Let's stick to list order (Newest First) or sort. Newest first is standard for dashboards.
            const tableRows = monthlyEntries.map(e => {
                const isPayment = e.type === 'PAYMENT';
                const isReceived = e.type === 'RECEIVED';
                return [
                    e.date,
                    isPayment ? 'Payment Given' : isReceived ? 'Payment Received' : 'Expense',
                    e.description,
                    isPayment ? `${e.amount.toLocaleString()}` : '-',
                    !isPayment ? `${e.amount.toLocaleString()}` : '-'
                ];
            });

            autoTable(doc, {
                startY: 85,
                head: [['Date', 'Type', 'Description', 'Credit (Given)', 'Debit (Spent)']],
                body: tableRows,
                theme: 'grid',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
                columnStyles: {
                    3: { halign: 'right', textColor: [16, 185, 129] },
                    4: { halign: 'right', textColor: [225, 29, 72] }
                }
            });

            PdfGenerator.addFooter(doc);
            doc.save(`${person.name}_Ledger_${selectedMonth}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error generating PDF");
        }
    };

    const openModal = (type: 'PAYMENT' | 'EXPENSE') => {
        setEntryType(type);
        setAmount('');
        setDescription('');
        setDate(new Date().toISOString().split('T')[0]);
        setIsModalOpen(true);
    };

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setIsSubmitting(true);
        try {
            await db.savePersonExpense({
                id: crypto.randomUUID(),
                person_id: id,
                date,
                description,
                amount: Number(amount),
                type: entryType
            });
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert('Error saving entry: ' + (error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (entryId: string) => {
        if (window.confirm('Delete this entry? کیا آپ اسے حذف کرنا چاہتے ہیں؟')) {
            try {
                await db.deletePersonExpense(entryId);
                fetchData();
            } catch (error) {
                console.error("Error deleting entry:", error);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!person) {
        return (
            <div className="p-4 text-center">
                <h2 className="text-xl font-bold text-slate-800">Person not found</h2>
                <Link to="/people" className="text-indigo-600 hover:underline mt-2 inline-block">Go Back</Link>
            </div>
        );
    }

    // Determine balance color
    const isNegativeBalance = currentBalance < 0;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link to="/people" className="text-slate-400 hover:text-indigo-600 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">{person.name}</h1>
                    </div>
                    <p className="text-sm text-slate-500 font-bold">Ledger Management</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto flex-wrap sm:flex-nowrap">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm"
                    />

                    <button
                        onClick={downloadReport}
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Report
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => openModal('PAYMENT')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl shadow-lg shadow-emerald-200 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
                >
                    <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest">Give Payment (رقم دی)</span>
                </button>

                <button
                    onClick={() => openModal('EXPENSE')}
                    className="bg-rose-600 hover:bg-rose-700 text-white p-4 rounded-2xl shadow-lg shadow-rose-200 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 group"
                >
                    <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                        </svg>
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest">Add Expense (خرچہ ہوا)</span>
                </button>
            </div>

            {/* Financial Statement Summary - Simplified */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6 p-6">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">

                    {/* Main Balance Display */}
                    <div className="flex-1 w-full md:w-auto">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Current Balance (موجودہ بیلنس)</p>
                        <div className="flex items-baseline gap-3">
                            <h2 className={`text-4xl md:text-5xl font-black tracking-tight ${isNegativeBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {currentBalance.toLocaleString()}
                            </h2>
                            <span className="text-sm font-bold text-slate-400">PKR</span>
                        </div>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg mt-3 text-[10px] font-black uppercase tracking-widest ${isNegativeBalance ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isNegativeBalance ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                            {isNegativeBalance ? 'We Owe (Liability)' : 'Advance (Asset)'}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto lg:flex-1">

                        {/* Monthly Limit */}
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Monthly Limit</p>
                            <p className="font-mono font-bold text-slate-700">{(person?.salary_limit || 0).toLocaleString()}</p>
                        </div>

                        {/* Remaining Limit */}
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Remaining</p>
                            <p className={`font-mono font-bold ${((person?.salary_limit || 0) - (stats.expenses + stats.payments)) < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                                {((person?.salary_limit || 0) - (stats.expenses + stats.payments)).toLocaleString()}
                            </p>
                        </div>

                        {/* Total Paid */}
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Paid (Given)</p>
                            <p className="font-mono font-bold text-emerald-600">+{allTimeStats.payments.toLocaleString()}</p>
                        </div>

                        {/* Total Spent */}
                        <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Spent (Exp)</p>
                            <p className="font-mono font-bold text-rose-600">-{allTimeStats.expenses.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Ledger List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Transaction History</h3>
                    <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {monthlyEntries.length} Records
                    </span>
                </div>

                {monthlyEntries.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <p className="mb-2">No transactions recorded for this month.</p>
                        <p className="font-urdu opacity-70">اس مہینے کا کوئی ریکارڈ موجود نہیں ہے</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile View */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {monthlyEntries.map((entry) => {
                                const isPayment = entry.type === 'PAYMENT';
                                const isReceived = entry.type === 'RECEIVED';
                                return (
                                    <div key={entry.id} className="p-4 hover:bg-slate-50 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className={`font-black text-lg ${isPayment ? 'text-emerald-600' : isReceived ? 'text-indigo-600' : 'text-rose-600'}`}>
                                                    {isPayment ? '+' : '-'} {entry.amount.toLocaleString()}
                                                </span>
                                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                                    {new Date(entry.date).toLocaleDateString('en-GB', {
                                                        weekday: 'short', day: 'numeric', month: 'short'
                                                    })} • {isPayment ? 'PAYMENT' : isReceived ? 'RECEIVED' : 'EXPENSE'}
                                                </span>
                                            </div>
                                            <button onClick={() => handleDeleteEntry(entry.id)} className="text-slate-300 hover:text-rose-500">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">{entry.description}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50/50 font-black">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {monthlyEntries.map((entry) => {
                                        const isPayment = entry.type === 'PAYMENT';
                                        const isReceived = entry.type === 'RECEIVED';
                                        return (
                                            <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                                                    {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isPayment ? 'bg-emerald-100 text-emerald-700' :
                                                        isReceived ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {isPayment ? 'Payment' : isReceived ? 'Received' : 'Expense'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={entry.description}>
                                                    {entry.description || '-'}
                                                </td>
                                                <td className={`px-6 py-4 text-right font-mono font-bold ${isPayment ? 'text-emerald-600' :
                                                    isReceived ? 'text-indigo-600' : 'text-rose-600'
                                                    }`}>
                                                    {entry.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => handleDeleteEntry(entry.id)} className="text-slate-400 hover:text-rose-500 p-2">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Entry Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                        {/* Modal Header */}
                        <div className={`px-6 py-5 flex justify-between items-center ${entryType === 'PAYMENT' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">
                                    {entryType === 'PAYMENT' ? 'Add Payment' : 'Add Expense'}
                                </h2>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-widest mt-0.5">
                                    {entryType === 'PAYMENT' ? 'See Payment Detail' : 'See Expense Detail'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-xl transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveEntry} className="p-6 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Date (تاریخ)
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Amount (رقم)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">PKR</span>
                                        <input
                                            type="number"
                                            required
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                    Description (تفصیل)
                                </label>
                                <textarea
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all resize-none"
                                    placeholder="Enter details here..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full text-white font-black py-4 rounded-xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 ${entryType === 'PAYMENT' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                                    }`}
                            >
                                {isSubmitting ? 'Saving...' : 'Save Entry'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonLedgerPage;
