import { TransactionType } from '../core/types';

export const COMMON_CURRENCIES = [
  'USD', // United States Dollar
  'EUR', // Euro
  'JPY', // Japanese Yen
  'GBP', // British Pound Sterling
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
  'CNY', // Chinese Yuan
  'INR', // Indian Rupee
  'BRL', // Brazilian Real
  // Added Eurasian and Central Asian currencies
  'RUB', // Russian Ruble
  'TRY', // Turkish Lira
  'KZT', // Kazakhstani Tenge
  'UAH', // Ukrainian Hryvnia
  'UZS', // Uzbekistani Som
  'AZN', // Azerbaijani Manat
  'GEL', // Georgian Lari
  'AMD', // Armenian Dram
  'KGS', // Kyrgyzstani Som
  'TJS', // Tajikistani Somoni
  'TMT', // Turkmenistani Manat
];

export const DEFAULT_CATEGORIES: { name: string; icon: string; type: TransactionType }[] = [
  // Expenses
  { name: 'Food & Drink', icon: 'UtensilsCrossed', type: TransactionType.EXPENSE },
  { name: 'Shopping', icon: 'ShoppingCart', type: TransactionType.EXPENSE },
  { name: 'Transport', icon: 'Bus', type: TransactionType.EXPENSE },
  { name: 'Home', icon: 'Home', type: TransactionType.EXPENSE },
  { name: 'Bills & Utilities', icon: 'Lightbulb', type: TransactionType.EXPENSE },
  { name: 'Entertainment', icon: 'Clapperboard', type: TransactionType.EXPENSE },
  { name: 'Health', icon: 'HeartPulse', type: TransactionType.EXPENSE },
  { name: 'Groceries', icon: 'Apple', type: TransactionType.EXPENSE },
  { name: 'Savings', icon: 'PiggyBank', type: TransactionType.EXPENSE },
  { name: 'General', icon: 'LayoutGrid', type: TransactionType.EXPENSE },
  // Incomes
  { name: 'Salary', icon: 'Banknote', type: TransactionType.INCOME },
  { name: 'Gifts', icon: 'Gift', type: TransactionType.INCOME },
  { name: 'Freelance', icon: 'Briefcase', type: TransactionType.INCOME },
];

export const ACCOUNT_GRADIENTS = [
    { name: 'Default', class: 'from-gray-700 to-gray-800' },
    { name: 'Sunrise', class: 'from-yellow-400 to-orange-500' },
    { name: 'Ocean', class: 'from-blue-500 to-teal-400' },
    { name: 'Forest', class: 'from-green-500 to-emerald-600' },
    { name: 'Grape', class: 'from-purple-500 to-indigo-600' },
    { name: 'Sunset', class: 'from-pink-500 to-rose-500' },
    { name: 'Midnight', class: 'from-gray-800 to-black' },
];

// --- НОВЫЕ КОНСТАНТЫ ДЛЯ ЭКРАНА "О ПРИЛОЖЕНИИ" ---

/**
 * Текущая версия приложения.
 */
export const APP_VERSION = '1.2.0';

/**
 * История изменений в приложении (Changelog).
 * Changes теперь содержит ключи локализации.
 */
export const CHANGELOG = [
  { 
    version: '1.0.2', 
    date: '2025-11-16', 
    changes: [
      'changelog_v1_0_2_change_1',
      'changelog_v1_0_2_change_2', 
    ] 
  },
  { 
    version: '1.0.1', 
    date: '2025-11-13', 
    changes: [
      'changelog_v1_0_1_change_1',
    ] 
  },
  { 
    version: '1.0.0', 
    date: '2025-11-11', 
    changes: [
      'changelog_v1_0_0_change_1',
    ] 
  },
];