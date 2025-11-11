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
  accountid: string;
  name: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // Storing as ISO string e.g., '2023-10-27'
  type: TransactionType;
  description?: string;
  goalid?: string;
}

export interface ExchangeRates {
  [key: string]: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetamount: number;
  currentamount: number;
  icon: string;
  currency: string;
}

export interface Budget {
  id: string;
  monthkey: string; // "YYYY-MM"
  category: string;
  limit: number;
  icon: string;
  currency: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  isfavorite: boolean;
  isdefault: boolean;
  type: TransactionType;
}