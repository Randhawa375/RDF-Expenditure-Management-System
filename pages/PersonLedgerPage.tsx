import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../services/db';
import { Person, PersonExpense } from '../types';

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
        if (window.confirm('Delete this expense?')) {
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
                    <p className="text-slate-500 text-sm ml-7">
                        Monthly Expense Ledger
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm"
                    />
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Salary Limit</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                        {person.salary_limit.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Expenses ({selectedMonth})</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                        {totalMonthlyExpense.toLocaleString()}
                    </p>
                </div>
                <div className={`p-5 rounded-2xl border shadow-sm transition-colors ${isOverLimit ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'
                    }`}>
                    <p className={`text-xs uppercase tracking-wider font-semibold ${isOverLimit ? 'text-rose-500' : 'text-emerald-500'
                        }`}>
                        {isOverLimit ? 'Limit Exceeded By' : 'Remaining Balance'}
                    </p>
                    <p className={`text-2xl font-black mt-1 ${isOverLimit ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                        {Math.abs(remainingBalance).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">Expense History</h3>
                    <span className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {monthlyExpenses.length} Records
                    </span>
                </div>

                {monthlyExpenses.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        No expenses recorded for this month.
                    </div>
                ) : (
                    <>
                        {/* Mobile View (Cards) */}
                        <div className="block md:hidden divide-y divide-slate-100">
                            {monthlyExpenses.map((expense) => (
                                <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-lg">
                                                {expense.amount.toLocaleString()}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
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
                                    <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 cursor-pointer active:bg-slate-100">
                                        <p className="text-sm text-slate-700 leading-relaxed break-words font-medium">
                                            {expense.description || <span className="text-slate-400 italic">No description</span>}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop View (Table) */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Date</th>
                                        <th className="px-6 py-3 font-semibold">Description</th>
                                        <th className="px-6 py-3 font-semibold text-right">Amount</th>
                                        <th className="px-6 py-3 font-semibold text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {monthlyExpenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                                {new Date(expense.date).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={expense.description}>
                                                {expense.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-medium text-slate-900">
                                                {expense.amount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => handleDeleteExpense(expense.id)}
                                                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
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

            {/* Add Expense Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h2 className="font-bold text-lg text-slate-900">Add Expense</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 rounded-full hover:bg-slate-200 transition-colors"
                            >
                                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Lunch, Transport"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Amount</label>
                                <input
                                    type="number"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="0"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-70 disabled:active:scale-100"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Expense'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonLedgerPage;
