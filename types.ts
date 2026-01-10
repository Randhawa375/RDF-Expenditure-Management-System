
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
