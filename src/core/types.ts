// src/types.ts

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER', // Новый тип транзакции
}

export enum AccountType {
  CARD = 'CARD',
  CASH = 'CASH',
}

export enum DebtType {
  I_OWE = 'I_OWE',           // Я должен
  OWED_TO_ME = 'OWED_TO_ME', // Мне должны
}

export enum DebtStatus {
  ACTIVE = 'ACTIVE',         // Активный долг
  COMPLETED = 'COMPLETED',   // Погашен (автоматически)
  ARCHIVED = 'ARCHIVED',     // В архиве (вручную)
}

export interface Account {
  id: string;
  name: string;
  currency: string;
  gradient: string;
  type: AccountType;
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string; // ID счета, куда переводятся средства (только для TRANSFER)
  name: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // Storing as ISO string e.g., '2023-10-27'
  type: TransactionType;
  description?: string;
  goalId?: string;
  debtId?: string;
}

export interface ExchangeRates {
  [key: string]: number;
}

/**
 * Интерфейс пользователя, объединяющий данные из auth.users и public.profiles.
 * Валюта по умолчанию (default_currency) теперь сохраняется здесь.
 */
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
  has_completed_onboarding: boolean; // Флаг завершения обучения
  default_currency: string; // <-- ДОБАВЛЕНО: Валюта по умолчанию
}


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
  isSystem?: boolean;
}

export interface Debt {
  id: string;
  person: string;                    // Имя человека/организации
  description?: string;              // Комментарий к долгу
  category?: string;                 // Категория долга (опционально)
  amount: number;                    // Общая сумма долга
  current_amount: number;            // Остаток долга
  currency: string;                  // Валюта долга
  type: DebtType;                    // Тип долга
  status: DebtStatus;                // Статус долга
  date: string;                      // Дата создания (ISO string)
  due_date?: string;                 // Крайний срок (опционально)
  initial_transaction_id?: string;   // ID первой транзакции
  created_at?: string;
  updated_at?: string;
}

export interface DebtCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}