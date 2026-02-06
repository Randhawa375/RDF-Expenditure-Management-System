
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
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
  type?: 'PAYMENT' | 'EXPENSE';
  created_at?: string;
}

export interface MonthlyNote {
  id: string;
  month: string;
  title: string;
  amount: number;
}
