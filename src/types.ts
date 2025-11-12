// src/types.ts

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum AccountType {
  CARD = 'CARD',
  CASH = 'CASH',
}

export interface Account {
  id: string;
  name: string;
  currency: string;
  gradient: string;
  type: AccountType;
}

export interface Transaction {
  id:string;
  accountId: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // Storing as ISO string e.g., '2023-10-27'
  type: TransactionType;
  description?: string;
  goalId?: string;
}

export interface ExchangeRates {
  [key: string]: number;
}

// --- ИЗМЕНЕНИЯ ЗДЕСЬ ---
// Этот интерфейс теперь отражает данные, которые мы собираем
// из auth.users и public.profiles
export interface User {
  id: string; // из auth.users
  email: string | undefined; // из auth.users
  name: string; // Имя, которое мы конструируем (напр., full_name или telegram first_name)
  
  // Поля из вашей таблицы profiles
  updated_at: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  telegram_id: number | null;
  has_completed_onboarding: boolean; // Наша новая колонка
}
// --- КОНЕЦ ИЗМЕНЕНИЙ ---


export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  icon: string;
  currency: string;
}

export interface Budget {
  id: string;
  monthKey: string; // "YYYY-MM"
  category: string;
  limit: number;
  icon: string;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isFavorite: boolean;
  isDefault: boolean;
  type: TransactionType;
}