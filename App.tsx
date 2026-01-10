
import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Transaction, TransactionType, User } from './types';
import { db } from './services/db';
import TransactionModal from './components/TransactionModal';
import Dashboard from './pages/Dashboard';
import TransactionsPage from './pages/TransactionsPage';
import DailyLedgerPage from './pages/DailyLedgerPage';
import Reports from './pages/Reports';
import Auth from './pages/Auth';

interface NavigationProps {
  user: User;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Overview', urdu: 'جائزہ' },
    { path: '/expenses', label: 'Expenses', urdu: 'اخراجات' },
    { path: '/receipts', label: 'Payment Received', urdu: 'ادائیگی موصول ہوئی' }
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-[100] px-4 shadow-sm">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between h-auto md:h-20 py-4 md:py-0 items-center gap-4">
          {/* Brand & Logout Section */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <Link to="/" className="flex flex-col items-start group">
              <span className="font-black text-slate-900 tracking-tighter text-lg sm:text-xl leading-none max-w-[200px] sm:max-w-none">
                Randhawa Dairy Expenditure Management System<span className="text-indigo-600"></span> 
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {user.name}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              title="Logout (لاگ آؤٹ)"
              className="p-2.5 text-rose-500 bg-rose-50 hover:bg-rose-500 hover:text-white rounded-xl transition-all active:scale-90 border border-rose-100/50 shadow-sm shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
          
          {/* Navigation Items */}
          <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0 justify-center md:justify-end">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-[10px] font-black transition-all flex flex-col items-center gap-0.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="uppercase tracking-widest leading-none">{item.label}</span>
                  <span className="text-[9px] font-urdu opacity-70 leading-none">{item.urdu}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [forcedType, setForcedType] = useState<TransactionType | undefined>(undefined);

  useEffect(() => {
    if (user) {
      setTransactions(db.getTransactions());
    }
  }, [user]);

  const handleLogout = useCallback(() => {
    if (window.confirm('Are you sure you want to Logout? کیا آپ واقعی لاگ آؤٹ کرنا چاہتے ہیں؟')) {
      db.logout();
      setUser(null);
    }
  }, []);

  const handleSaveTransaction = (transaction: Transaction) => {
    db.saveTransaction(transaction);
    setTransactions(db.getTransactions());
    setEditingTransaction(null);
    setIsModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Delete record? کیا آپ اسے حذف کرنا چاہتے ہیں؟')) {
      db.deleteTransaction(id);
      setTransactions(db.getTransactions());
    }
  };

  const openAddModal = (date?: string, type?: TransactionType) => {
    if (date) setDefaultDate(date);
    setForcedType(type);
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  return (
    <HashRouter>
      <div className="min-h-screen bg-[#fcfdfe] text-slate-900 selection:bg-indigo-100 antialiased font-inter">
        {!user ? (
          <Auth onLogin={(loggedInUser) => setUser(loggedInUser)} />
        ) : (
          <>
            <Navigation user={user} onLogout={handleLogout} />
            <main className="max-w-7xl mx-auto px-4 py-6 md:py-10 pb-24">
              <Routes>
                <Route path="/" element={<Dashboard transactions={transactions} />} />
                <Route 
                  path="/expenses" 
                  element={
                    <TransactionsPage 
                      type={TransactionType.EXPENSE} 
                      transactions={transactions} 
                      onAdd={() => openAddModal(undefined, TransactionType.EXPENSE)}
                    />
                  } 
                />
                <Route 
                  path="/expenses/:date" 
                  element={
                    <DailyLedgerPage 
                      type={TransactionType.EXPENSE} 
                      transactions={transactions} 
                      onEdit={(t) => { setEditingTransaction(t); setForcedType(undefined); setIsModalOpen(true); }}
                      onDelete={handleDeleteTransaction}
                      onAdd={(date) => openAddModal(date, TransactionType.EXPENSE)}
                    />
                  } 
                />
                <Route 
                  path="/receipts" 
                  element={
                    <TransactionsPage 
                      type={TransactionType.INCOME} 
                      transactions={transactions} 
                      onAdd={() => openAddModal(undefined, TransactionType.INCOME)}
                    />
                  } 
                />
                <Route 
                  path="/receipts/:date" 
                  element={
                    <DailyLedgerPage 
                      type={TransactionType.INCOME} 
                      transactions={transactions} 
                      onEdit={(t) => { setEditingTransaction(t); setForcedType(undefined); setIsModalOpen(true); }}
                      onDelete={handleDeleteTransaction}
                      onAdd={(date) => openAddModal(date, TransactionType.INCOME)}
                    />
                  } 
                />
                <Route path="/reports" element={<Reports transactions={transactions} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            <TransactionModal
              isOpen={isModalOpen}
              onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
              onSave={handleSaveTransaction}
              editTransaction={editingTransaction}
              defaultDate={defaultDate}
              defaultType={forcedType}
              isTypeLocked={!!forcedType}
            />
          </>
        )}
      </div>
    </HashRouter>
  );
};

export default App;
