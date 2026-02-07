import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { Person, PersonExpense } from '../types';
import { jsPDF } from 'jspdf';
import { PdfGenerator } from '../services/pdfGenerator';

const PeopleManager: React.FC = () => {
    const [persons, setPersons] = useState<Person[]>([]);
    const [allExpenses, setAllExpenses] = useState<PersonExpense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentMonth] = useState(() => new Date().toISOString().slice(0, 7));

    // Form State
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [previousBalance, setPreviousBalance] = useState('');
    const [balanceType, setBalanceType] = useState<'ADVANCE' | 'DUE'>('ADVANCE'); // ADVANCE (+), DUE (-)
    const [salaryLimit, setSalaryLimit] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [personsData, expensesData] = await Promise.all([
                db.getPersons(),
                db.getAllPersonExpenses()
            ]);
            setPersons(personsData);
            setAllExpenses(expensesData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const monthlyTotal = useMemo(() => {
        return allExpenses
            .filter(e => e.date.startsWith(currentMonth))
            .reduce((sum, e) => sum + e.amount, 0);
    }, [allExpenses, currentMonth]);

    const downloadReport = async () => {
        try {
            const doc = await PdfGenerator.initPDF();

            PdfGenerator.addHeader(
                doc,
                'STAFF REPORT',
                'RDF EMS',
                `GENERATED: ${new Date().toLocaleDateString()}`
            );

            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Current Month Total Expenses:`, 14, 48);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(225, 29, 72);
            doc.text(`PKR ${monthlyTotal.toLocaleString()}`, 70, 48);

            let y = 65;
            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.text('Staff List', 14, 58);

            doc.setFontSize(10);
            doc.setFillColor(15, 23, 42);
            doc.setTextColor(255, 255, 255);
            doc.rect(14, y - 7, 180, 9, 'F');
            doc.text('Name', 16, y);
            doc.text('Salary Limit', 80, y);
            doc.text('Prev Balance', 120, y);
            doc.text('Total Expense (Month)', 190, y, { align: 'right' });

            y += 10;
            // Switch to Urdu font for names potentially containing Urdu
            doc.setFont('Amiri', 'normal');
            doc.setFont('normal');
            doc.setTextColor(30, 41, 59);

            persons.forEach((p, i) => {
                if (y > 270) {
                    doc.addPage();
                    y = 30;
                    // Header (reprint)
                    doc.setFont('helvetica', 'bold');
                    doc.setFillColor(15, 23, 42);
                    doc.setTextColor(255, 255, 255);
                    doc.rect(14, y - 7, 180, 9, 'F');
                    doc.text('Name', 16, y);
                    doc.text('Salary Limit', 80, y);
                    doc.text('Prev Balance', 120, y);
                    doc.text('Total Expense (Month)', 190, y, { align: 'right' });

                    doc.setFont('Amiri', 'normal');
                    doc.setTextColor(30, 41, 59);
                    y += 10;
                }

                if (i % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(14, y - 6, 180, 9, 'F');
                }

                const personExpenses = allExpenses
                    .filter(e => e.person_id === p.id && e.date.startsWith(currentMonth))
                    .reduce((sum, e) => sum + e.amount, 0);

                doc.text(p.name, 16, y); // Name might be Urdu
                doc.text(p.salary_limit.toLocaleString(), 80, y);
                doc.text(p.previous_balance.toLocaleString(), 120, y);
                doc.text(personExpenses.toLocaleString(), 190, y, { align: 'right' });
                y += 10;
            });

            PdfGenerator.addFooter(doc);

            doc.save('Staff_Report.pdf');
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Error generating PDF");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const rawBalance = Number(previousBalance) || 0;
            // Advance = Positive (Asset), Due (We have to give) = Negative (Liability)
            const finalBalance = balanceType === 'ADVANCE' ? Math.abs(rawBalance) : -Math.abs(rawBalance);

            await db.savePerson({
                id: editingPerson ? editingPerson.id : crypto.randomUUID(),
                name,
                previous_balance: finalBalance,
                salary_limit: Number(salaryLimit) || 0
            });
            setIsModalOpen(false);
            setIsModalOpen(false);
            resetForm();
            setEditingPerson(null);
            fetchData();
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
                fetchData();
            } catch (error) {
                console.error("Error deleting person:", error);
            }
        }
    };

    const resetForm = () => {
        setName('');
        setPreviousBalance('');
        setSalaryLimit('');
        setBalanceType('ADVANCE');
        setEditingPerson(null);
    };

    const handleEdit = (e: React.MouseEvent, person: Person) => {
        e.preventDefault(); // Prevent navigation
        setEditingPerson(person);
        setName(person.name);
        setPreviousBalance(Math.abs(person.previous_balance).toString());
        setBalanceType(person.previous_balance >= 0 ? 'ADVANCE' : 'DUE');
        setSalaryLimit(person.salary_limit.toString());
        setIsModalOpen(true);
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
                        onClick={() => { resetForm(); setIsModalOpen(true); }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow hover:brightness-105 active:scale-95 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Person (نیا فرد شامل کریں)
                    </button>
                </div>
            </div>

            {/* Total Expense Card */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <div className="relative z-10">
                    <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs mb-1">Total Staff Expenses (This Month)</p>
                    <h2 className="text-4xl font-black tracking-tight">PKR {monthlyTotal.toLocaleString()}</h2>
                    <p className="text-indigo-300 font-urdu mt-2 text-lg">اس مہینے کا کل اسٹاف خرچہ</p>
                </div>
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
                    {persons.map((person) => {
                        const personExpenses = allExpenses
                            .filter(e => e.person_id === person.id && e.date.startsWith(currentMonth))
                            .reduce((sum, e) => sum + e.amount, 0);

                        return (
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
                                                <span className={`font-mono font-bold ${person.previous_balance >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                    {Math.abs(person.previous_balance).toLocaleString()}
                                                    {person.previous_balance < 0 && ' (Dr)'}
                                                </span>
                                            </p>
                                            <p className="flex items-center gap-2 text-rose-600">
                                                <span className="w-20 text-[10px] uppercase tracking-wider font-black opacity-70">Exp (خرچہ):</span>
                                                <span className="font-mono font-bold">{personExpenses.toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                        <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => handleEdit(e, person)}
                                        className="p-1.5 rounded-lg text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                                        title="Edit Person"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={(e) => handleDelete(e, person.id)}
                                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                        title="Delete Person"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            {/* Add Person Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight">{editingPerson ? 'Edit Person' : 'Add Person'}</h2>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">{editingPerson ? 'معلومات تبدیل کریں' : 'نیا فرد شامل کریں'}</p>
                            </div>
                            <button
                                onClick={() => { setIsModalOpen(false); resetForm(); }}
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
                                        Opening Balance (سابقہ بیلنس)
                                    </label>
                                    <input
                                        type="number"
                                        value={previousBalance}
                                        onChange={(e) => setPreviousBalance(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex flex-col justify-end pb-1">
                                    {/* Balance Type Selector */}
                                    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setBalanceType('ADVANCE')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${balanceType === 'ADVANCE'
                                                ? 'bg-white shadow text-emerald-600'
                                                : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            Advance (Advance / Asset)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setBalanceType('DUE')}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${balanceType === 'DUE'
                                                ? 'bg-white shadow text-rose-600'
                                                : 'text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            Payable (Denay hain / Liability)
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                    Salary Limit (تنخواہ کی حد)
                                </label>
                                <input
                                    type="number"
                                    value={salaryLimit}
                                    onChange={(e) => setSalaryLimit(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all"
                                    placeholder="0"
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
                                    <span>{editingPerson ? 'Update Person (تبدیل کریں)' : 'Save Person (محفوظ کریں)'}</span>
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
