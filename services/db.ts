import { supabase } from './supabaseClient';
import { Transaction, User, TransactionType, Person, PersonExpense, MonthlyNote } from '../types';

export const db = {
  // Transaction Methods
  getTransactions: async (): Promise<Transaction[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return (data || []).map(t => ({
      ...t,
      amount: Number(t.amount) // Ensure amount is number
    })) as Transaction[];
  },

  saveTransaction: async (transaction: Transaction): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('transactions')
      .upsert({
        id: transaction.id,
        user_id: user.id,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        remarks: transaction.remarks,
        source: transaction.source
      });

    if (error) throw error;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Auth Methods
  // Note: We are using Supabase Auth which manages users differently.
  // We no longer need manually managed "users" list in local storage.

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    return {
      id: session.user.id,
      name: session.user.user_metadata.name || session.user.email?.split('@')[0] || 'User',
      username: session.user.email || '',
    };
  },

  signIn: async (email: string, password: string): Promise<User> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    if (!data.user) throw new Error('Login failed');

    return {
      id: data.user.id,
      name: data.user.user_metadata.name || email.split('@')[0],
      username: email
    };
  },

  signUp: async (email: string, password: string, name: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (error) throw error;
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Person Methods
  getPersons: async (): Promise<Person[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('persons')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching persons:', error);
      return [];
    }
    return data as Person[];
  },

  savePerson: async (person: Person): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('persons')
      .upsert({
        id: person.id,
        user_id: user.id,
        name: person.name,
        previous_balance: person.previous_balance,
        salary_limit: person.salary_limit
      });

    if (error) throw error;
  },

  deletePerson: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Person Expense Methods
  getPersonExpenses: async (personId: string): Promise<PersonExpense[]> => {
    const { data, error } = await supabase
      .from('person_expenses')
      .select('*')
      .eq('person_id', personId)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching person expenses:', error);
      return [];
    }
    return data as PersonExpense[];
  },

  getAllPersonExpenses: async (): Promise<PersonExpense[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('person_expenses')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching all person expenses:', error);
      return [];
    }
    return data as PersonExpense[];
  },

  savePersonExpense: async (expense: PersonExpense): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('person_expenses')
      .upsert({
        id: expense.id,
        person_id: expense.person_id,
        user_id: user.id,
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        type: expense.type || 'EXPENSE'
      });

    if (error) throw error;
  },

  deletePersonExpense: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('person_expenses')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
  ,

  // Monthly Notes Methods
  getMonthlyNotes: async (month: string): Promise<MonthlyNote[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('monthly_notes')
      .select('*')
      .eq('month', month)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching monthly notes:', error);
      return [];
    }
    return data as MonthlyNote[];
  },

  getAllMonthlyNotes: async (): Promise<MonthlyNote[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('monthly_notes')
      .select('*');

    if (error) {
      console.error('Error fetching all monthly notes:', error);
      return [];
    }
    return data as MonthlyNote[];
  },

  saveMonthlyNote: async (note: MonthlyNote): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('monthly_notes')
      .upsert({
        id: note.id,
        user_id: user.id,
        month: note.month,
        title: note.title,
        amount: note.amount
      });

    if (error) throw error;
  },

  deleteMonthlyNote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('monthly_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
