export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum AccountType {
  CARD = 'CARD',
  CASH = 'CASH',
}

/**
 * Account (Счет): Хранится в profiles.data.accounts (JSONB)
 */
export interface Account {
  id: string; // Уникальный ID счета, используется как логическая связь
  name: string;
  currency: string;
  gradient: string;
  type: AccountType;
}

/**
 * Transaction (Транзакция): Хранится в отдельной реляционной таблице 'transactions'
 */
export interface Transaction {
  id: string; // UUID из БД
  accountid: string; // Логическая связь с Account ID в JSONB (account_id в БД)
  name: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // Storing as ISO string e.g., '2023-10-27'
  type: TransactionType;
  description?: string;
  goalid?: string; // Логическая связь с SavingsGoal ID в JSONB (goal_id в БД)
}

export interface ExchangeRates {
  [key: string]: number;
}

/**
 * SavingsGoal (Копилка/Цель сбережений): Хранится в profiles.data.savingsGoals (JSONB)
 */
export interface SavingsGoal {
  id: string; // Уникальный ID цели, используется как логическая связь
  name: string;
  targetamount: number;
  currentamount: number;
  icon: string;
  currency: string;
}

/**
 * Budget (Бюджет): Хранится в отдельной реляционной таблице 'budgets'
 */
export interface Budget {
  id: string; // UUID из БД
  monthkey: string; // "YYYY-MM" (month_key в БД)
  category: string;
  limit: number; // Лимит (limit_amount в БД)
  icon: string;
  currency: string;
}

/**
 * BudgetCreation - Тип для создания бюджета (без ID, ID генерируется БД)
 */
export type BudgetCreation = Omit<Budget, 'id'>;

/**
 * BudgetUpdate - Тип для обновления бюджета (частичные данные)
 */
export type BudgetUpdate = Partial<BudgetCreation>;

/**
 * Category (Категория): Хранится в profiles.data.categories (JSONB)
 */
export interface Category {
  id: string; // Уникальный ID категории, используется как логическая связь
  name: string;
  icon: string;
  isfavorite: boolean;
  isdefault: boolean;
  type: TransactionType;
}

// ------------------------------------------------------------------
// НОВЫЕ ТИПЫ ДЛЯ ГИБРИДНОЙ МОДЕЛИ
// ------------------------------------------------------------------

/**
 * Структура, хранящаяся в поле 'data' (JSONB) в таблице 'profiles'.
 * Содержит Accounts, Categories, SavingsGoals.
 */
export interface UserDataJsonB {
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  categories: Category[];
}

/**
 * Полный профиль пользователя, загружаемый из таблицы 'profiles'.
 * Включает метаданные и поле 'data' (JSONB).
 */
export interface UserProfile {
  id: string; // uuid пользователя Supabase
  name: string;
  email: string;
  telegram_id?: string; // Поле для Telegram ID
  data: UserDataJsonB; // JSONB-данные (Accounts, Categories, SavingsGoals)
}

/**
 * Интерфейс, описывающий состояние данных пользователя в приложении.
 * Может содержать профиль, транзакции и бюджеты.
 */
export interface AppDataState {
  profile: UserProfile | null;
  transactions: Transaction[];
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;
}