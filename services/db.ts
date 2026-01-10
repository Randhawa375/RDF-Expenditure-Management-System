
import { Transaction, User } from '../types';

const STORAGE_KEY = 'fintrack_pro_transactions';
const USERS_KEY = 'rdf_system_users';
const SESSION_KEY = 'rdf_active_session';

export const db = {
  // Transaction Methods
  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveTransaction: (transaction: Transaction): void => {
    const transactions = db.getTransactions();
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index > -1) {
      transactions[index] = transaction;
    } else {
      transactions.push(transaction);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  },

  deleteTransaction: (id: string): void => {
    const transactions = db.getTransactions();
    const filtered = transactions.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Auth Methods
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User): void => {
    const users = db.getUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User): void => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  logout: (): void => {
    localStorage.removeItem(SESSION_KEY);
  }
};
