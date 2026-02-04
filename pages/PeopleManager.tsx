import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { Person } from '../types';

const PeopleManager: React.FC = () => {
    const [persons, setPersons] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [previousBalance, setPreviousBalance] = useState('');
    const [salaryLimit, setSalaryLimit] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchPersons();
    }, []);

    const fetchPersons = async () => {
        setIsLoading(true);
        try {
            const data = await db.getPersons();
            setPersons(data);
        } catch (error) {
            console.error("Error fetching persons:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await db.savePerson({
                id: crypto.randomUUID(),
                name,
                previous_balance: Number(previousBalance) || 0,
                salary_limit: Number(salaryLimit) || 0
            });
            setIsModalOpen(false);
            resetForm();
            fetchPersons();
        } catch (error) {
            alert('Error saving person: ' + (error as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); // Prevent navigation
        if (window.confirm('Delete this person and all their records? This cannot be undone.')) {
            try {
                await db.deletePerson(id);
                fetchPersons();
            } catch (error) {
                console.error("Error deleting person:", error);
            }
        }
    };

    const resetForm = () => {
        setName('');
        setPreviousBalance('');
        setSalaryLimit('');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Staff / Persons
                    </h1>
                    <p className="text-slate-500 mt-1 font-urdu">
                        Manage staff members and their expense ledgers. (اسٹاف اور ان کے اخراجات کا انتظام کریں)
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow hover:brightness-105 active:scale-95 transition-all"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Person (نیا فرد شامل کریں)
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : persons.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <p className="text-slate-500 mb-4">No persons added yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {persons.map((person) => (
                        <Link
                            key={person.id}
                            to={`/people/${person.id}`}
                            className="group relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all hover:border-indigo-100"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                                        {person.name}
                                    </h3>
                                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                                        <p className="flex items-center gap-2">
                                            <span className="w-20 text-[10px] uppercase tracking-wider font-black opacity-70">Limit (حد):</span>
                                            <span className="font-mono font-bold text-slate-700">{person.salary_limit.toLocaleString()}</span>
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <span className="w-20 text-[10px] uppercase tracking-wider font-black opacity-70">Bal (بقیہ):</span>
                                            <span className="font-mono font-bold text-slate-700">{person.previous_balance.toLocaleString()}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                    <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>

                            <button
                                onClick={(e) => handleDelete(e, person.id)}
                                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Person"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </Link>
                    ))}
                </div>
            )}

            {/* Add Person Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">Add Person</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">نیا فرد شامل کریں</p>
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
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                    Name (نام)
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                    placeholder="Enter person's name"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Previous Balance (سابقہ بیلنس)
                                    </label>
                                    <input
                                        type="number"
                                        value={previousBalance}
                                        onChange={(e) => setPreviousBalance(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                        Salary Limit (حد)
                                    </label>
                                    <input
                                        type="number"
                                        value={salaryLimit}
                                        onChange={(e) => setSalaryLimit(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
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
                                    <span>Save Person (محفوظ کریں)</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PeopleManager;
