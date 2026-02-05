
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/db';
import { Person, PersonExpense } from '../types';
import { jsPDF } from 'jspdf';
import { PdfGenerator } from '../services/pdfGenerator';

const PersonLedgerPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [person, setPerson] = useState<Person | null>(null);
    const [expenses, setExpenses] = useState<PersonExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
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

            const fetchedExpenses = await db.getPersonExpenses(id);
            setExpenses(fetchedExpenses);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const monthlyExpenses = useMemo(() => {
        return expenses.filter(e => e.date.startsWith(selectedMonth));
    }, [expenses, selectedMonth]);

    const totalMonthlyExpense = useMemo(() => {
        return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
    }, [monthlyExpenses]);

    const remainingBalance = useMemo(() => {
        if (!person) return 0;
        return person.salary_limit - totalMonthlyExpense;
    }, [person, totalMonthlyExpense]);

    const downloadReport = async () => {
        try {
            const doc = await PdfGenerator.initPDF();

            PdfGenerator.addHeader(
                doc,
                `LEDGER: ${person.name}`,
                '',
                `SALARY LIMIT: ${person.salary_limit.toLocaleString()}`
            );

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Previous Balance: ${person.previous_balance.toLocaleString()}`, 14, 42); // Adjust Y if needed based on header
            doc.text(`Current Month Total: ${totalMonthlyExpense.toLocaleString()}`, 14, 48);

            let y = 60;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Transaction History', 14, 55);

            doc.setFontSize(10);
            doc.setFillColor(240, 240, 240);
            doc.rect(14, y - 6, 180, 8, 'F');
            doc.text('Date', 16, y);
            doc.text('Description', 50, y);
            doc.text('Amount', 170, y, { align: 'right' });

            y += 10;
            // Switch to Urdu font for body content (descriptions)
            doc.setFont('Amiri');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);

            expenses.forEach((e, i) => {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }

                // Helper to draw text with possible Urdu
                doc.text(e.date, 16, y);

                const desc = e.description.length > 50 ? e.description.substring(0, 47) + '...' : e.description;
                doc.text(desc, 50, y); // This will now support Urdu because font is Amiri

                doc.text(e.amount.toLocaleString(), 170, y, { align: 'right' });
                y += 8;
            });

            PdfGenerator.addFooter(doc);

            doc.save(`${person.name}_Ledger.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error generating PDF");
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setIsSubmitting(true);
        try {
            await db.savePersonExpense({
                id: crypto.randomUUID(),
                person_id: id,
                date,
                description,
                amount: Number(amount)
            });
            setIsModalOpen(false);
            setDescription('');
            setAmount('');
            fetchData(); // Refresh list
        } catch (error) {
            alert('Error adding expense: ' + (error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExpense = async (expenseId: string) => {
        if (window.confirm('Delete this expense? کیا آپ اسے حذف کرنا چاہتے ہیں؟')) {
            try {
                await db.deletePersonExpense(expenseId);
                fetchData();
            } catch (error) {
                console.error("Error deleting expense:", error);
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

    const isOverLimit = remainingBalance < 0;

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
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={downloadReport}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow hover:brightness-105 active:scale-95 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Report
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow hover:brightness-105 active:scale-95 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Entry (نیا اندراج)
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards - Compact Mobile View */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {/* Total Expense - Full width on mobile to emphasize */}
                <div className="col-span-2 md:col-span-1 bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Total Expenses (کل خرچہ)</p>
                    <p className="text-2xl md:text-3xl font-black text-slate-900">
                        {totalMonthlyExpense.toLocaleString()}
                    </p>
                </div>

                {/* Salary Limit */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">Limit (حد)</p>
                    <p className="text-xl md:text-2xl font-black text-slate-700">
                        {person.salary_limit.toLocaleString()}
                    </p>
                </div>

                {/* Remaining Balance */}
                <div className={`p - 4 md: p - 5 rounded - 2xl border shadow - sm transition - colors ${isOverLimit ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'
                    } `}>
                    <p className={`text - [10px] uppercase tracking - widest font - black mb - 1 ${isOverLimit ? 'text-rose-500' : 'text-emerald-500'
                        } `}>
                        {isOverLimit ? 'Over Limit (حد سے زیادہ)' : 'Remaining (باقی)'}
                    </p>
                    <p className={`text - xl md: text - 2xl font - black ${isOverLimit ? 'text-rose-600' : 'text-emerald-600'
                        } `}>
                        {Math.abs(remainingBalance).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Expense History (اخراجات کی تفصیل)</h3>
                    <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {monthlyExpenses.length} Records
                    </span>
                </div>

                {monthlyExpenses.length === 0 ? (
                    <div className="p-12 text-center text-slate-500">
                        <p className="mb-2">No expenses recorded for this month.</p>
                        <p className="font-urdu opacity-70">اس مہینے کا کوئی خرچہ موجود نہیں ہے</p>
                    </div>
                ) : (
                    <>
                        {/* Mobile View (Cards) */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {monthlyExpenses.map((expense) => (
                                <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-900 text-lg">
                                                {expense.amount.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                                                {new Date(expense.date).toLocaleDateString('en-GB', {
                                                    weekday: 'short', day: 'numeric', month: 'short'
                                                })}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteExpense(expense.id)}
                                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            title="Delete"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div
                                        className="overflow-hidden cursor-pointer transition-all duration-200"
                                        onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
                                    >
                                        <div className={`font - medium text - slate - 900 ${expandedId === expense.id ? 'whitespace-pre-wrap break-words' : 'truncate'} `}>
                                            {expense.description}
                                        </div>
                                        <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mt-0.5">
                                            {expandedId === expense.id ? 'Show Less' : 'Show More'}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[10px] text-slate-500 uppercase tracking-widest bg-slate-50/50 font-black">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">Amount</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {monthlyExpenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">
                                                {new Date(expense.date).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td
                                                className="px-6 py-4 text-slate-600 max-w-xs truncate cursor-pointer hover:whitespace-normal hover:overflow-visible hover:bg-white hover:shadow-lg hover:z-10 relative"
                                                title={expense.description}
                                            >
                                                {expense.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-slate-900">
                                                {expense.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteExpense(expense.id)}
                                                    className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-lg hover:bg-rose-50"
                                                    title="Delete"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* Add Expense Modal - Styled like TransactionModal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                        {/* Modal Header */}
                        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">New Entry</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">نیا ریکارڈ</p>
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
                        <form onSubmit={handleAddExpense} className="p-6 space-y-5">
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
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl shadow-slate-200 active:scale-95 transition-all text-sm uppercase tracking-widest disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <span>Save Entry (محفوظ کریں)</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonLedgerPage;
