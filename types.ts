
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
}

export enum TransactionCategory {
  MILK_PAYMENT = 'MILK_PAYMENT',
  WORKER_EXPENSE = 'WORKER_EXPENSE',
  FARM_EXPENSE = 'FARM_EXPENSE',
  FOOD = 'FOOD',
  MISC = 'MISC'
}

export const categoryLabels: Record<TransactionCategory, { en: string, ur: string }> = {
  [TransactionCategory.MILK_PAYMENT]: { en: 'Milk Payment', ur: 'دودھ کی ادائیگی' },
  [TransactionCategory.WORKER_EXPENSE]: { en: 'Worker Expense', ur: 'ورکر کا خرچہ' },
  [TransactionCategory.FARM_EXPENSE]: { en: 'Farm Expense', ur: 'فارم کا خرچہ' },
  [TransactionCategory.FOOD]: { en: 'Food', ur: 'خوراک' },
  [TransactionCategory.MISC]: { en: 'Misc Kharcha', ur: 'دیگر اخراجات' }
};

export interface Transaction {
  id: string;
  type: TransactionType;
  category?: TransactionCategory;
  date: string;
  description: string;
  amount: number;
  remarks?: string;
  source?: string;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  month: string;
}

export interface Person {
  id: string;
  user_id?: string;
  name: string;
  previous_balance: number;
  salary_limit: number;
  created_at?: string;
}

export interface PersonExpense {
  id: string;
  person_id: string;
  user_id?: string;
  date: string;
  description: string;
  amount: number;
  type?: 'PAYMENT' | 'EXPENSE' | 'RECEIVED';
  created_at?: string;
}

export interface MonthlyNote {
  id: string;
  month: string;
  title: string;
  amount: number;
}

export interface WandaRecord {
  id: string;
  user_id?: string;
  date: string;
  bags: number;
  price_per_bag: number;
  payment_given: number;
  description: string;
  slip_url?: string;
  created_at?: string;
}

export interface ToriRecord {
  id: string;
  user_id?: string;
  date: string;
  mun: number;
  price_per_mun: number;
  payment_given: number;
  description: string;
  slip_url?: string;
  created_at?: string;
}
