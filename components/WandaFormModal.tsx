
import React, { useState, useEffect } from 'react';
import { WandaRecord } from '../types';

interface WandaFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (record: WandaRecord) => void;
    editRecord: WandaRecord | null;
}

const WandaFormModal: React.FC<WandaFormModalProps> = ({ isOpen, onClose, onSave, editRecord }) => {
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [bags, setBags] = useState('');
    const [pricePerBag, setPricePerBag] = useState('');
    const [paymentGiven, setPaymentGiven] = useState('');
    const [description, setDescription] = useState('');
    const [slipUrl, setSlipUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (editRecord) {
            setDate(editRecord.date);
            setBags(editRecord.bags.toString());
            setPricePerBag(editRecord.price_per_bag.toString());
            setPaymentGiven(editRecord.payment_given.toString());
            setDescription(editRecord.description);
            setSlipUrl(editRecord.slip_url || '');
        } else {
            resetForm();
        }
    }, [editRecord]);

    const resetForm = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setBags('');
        setPricePerBag('');
        setPaymentGiven('');
        setDescription('');
        setSlipUrl('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: editRecord ? editRecord.id : crypto.randomUUID(),
            date,
            bags: Number(bags),
            price_per_bag: Number(pricePerBag),
            payment_given: Number(paymentGiven) || 0,
            description,
            slip_url: slipUrl
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                <div className="bg-slate-900 px-6 py-5 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-white tracking-tight">
                            {editRecord ? 'Edit Wanda Record' : 'Add Wanda Record'}
                        </h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5 font-urdu">
                            {editRecord ? 'ریکارڈ تبدیل کریں' : 'نیا ریکارڈ شامل کریں'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 text-white hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Date</label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Number of Bags</label>
                            <input
                                type="number"
                                required
                                value={bags}
                                onChange={(e) => setBags(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Price Per Bag</label>
                            <input
                                type="number"
                                required
                                value={pricePerBag}
                                onChange={(e) => setPricePerBag(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Payment Given</label>
                            <input
                                type="number"
                                value={paymentGiven}
                                onChange={(e) => setPaymentGiven(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Slip/Image URL (Optional)</label>
                        <input
                            type="text"
                            value={slipUrl}
                            onChange={(e) => setSlipUrl(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none"
                            placeholder="Paste image URL here"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Description (تفصیل)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none h-20"
                            placeholder="..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest"
                    >
                        Save Record (محفوظ کریں)
                    </button>
                </form>
            </div>
        </div>
    );
};

export default WandaFormModal;
