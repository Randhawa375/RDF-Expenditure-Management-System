
import React, { useState } from 'react';
import { User } from '../types';
import { db } from '../services/db';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isLogin) {
      // Login Logic
      const users = db.getUsers();
      const user = users.find(u => u.username === formData.username && u.password === formData.password);
      if (user) {
        db.setCurrentUser(user);
        onLogin(user);
      } else {
        setError('Invalid username or password. (غلط صارف نام یا پاس ورڈ)');
      }
    } else {
      // Signup Logic
      if (!formData.name || !formData.username || !formData.password) {
        setError('Please fill all fields. (براہ کرم تمام خانے پُر کریں)');
        return;
      }
      
      const users = db.getUsers();
      if (users.find(u => u.username === formData.username)) {
        setError('Username already exists. (صارف نام پہلے سے موجود ہے)');
        return;
      }

      const newUser: User = {
        id: crypto.randomUUID(),
        name: formData.name,
        username: formData.username,
        password: formData.password
      };

      // Save user to DB but DO NOT set current session
      db.saveUser(newUser);
      
      // Provide success feedback and switch to login
      setSuccess('Account created successfully! Please login. (اکاؤنٹ بن گیا ہے! براہ کرم لاگ ان کریں)');
      setIsLogin(true);
      
      // Clear password for security, keep username for convenience
      setFormData(prev => ({ ...prev, password: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">
            Randhawa Dairy Expenditure Management System
          </h1>
         
        </div>

        {/* Auth Card */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-2xl shadow-indigo-500/5 flex flex-col items-center">
          <h2 className="text-2xl font-black text-slate-900 mb-2">
            {isLogin ? 'Login' : 'Sign Up'}
          </h2>
          <p className="font-urdu text-slate-400 mb-8 leading-none">
            {isLogin ? 'سسٹم میں لاگ ان کریں' : 'نیا اکاؤنٹ بنائیں'}
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name (پورا نام)</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Name"
                  className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Username (صارف نام)</label>
              <input
                type="text"
                required
                placeholder="Enter Username"
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Password (پاس ورڈ)</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-100 outline-none transition-all font-bold"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {error && (
              <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 animate-pulse">
                <p className="text-xs text-rose-600 font-bold text-center">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 animate-in fade-in zoom-in duration-300">
                <p className="text-xs text-emerald-600 font-bold text-center">{success}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-lg font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex flex-col items-center gap-0.5"
            >
              <span>{isLogin ? 'Enter System' : 'Register Account'}</span>
              <span className="font-urdu text-sm opacity-70 leading-none">
                {isLogin ? 'سسٹم میں داخل ہوں' : 'اکاؤنٹ بنائیں'}
              </span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => { 
              setIsLogin(!isLogin); 
              setError(''); 
              setSuccess(''); 
            }}
            className="mt-6 text-slate-400 hover:text-indigo-600 transition-colors flex flex-col items-center group"
          >
            <span className="text-[10px] font-black uppercase tracking-widest group-hover:underline">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <span className="font-urdu text-sm mt-1">
              {isLogin ? 'نیا اکاؤنٹ بنائیں' : 'پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
