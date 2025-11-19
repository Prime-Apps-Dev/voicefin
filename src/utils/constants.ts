// src/utils/constants.ts

import { TransactionType, Debt, DebtType, DebtCategory } from '../core/types';

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

// Системные категории для долгов
export const DEBT_SYSTEM_CATEGORIES = {
  // Расходы (когда я даю в долг)
  LENDING: 'Debt: Lending',                    // Я дал в долг
  REPAYMENT_SENT: 'Debt: Repayment Sent',     // Я вернул долг
  
  // Доходы (когда мне дают в долг или возвращают)
  BORROWING: 'Debt: Borrowing',               // Я взял в долг
  REPAYMENT_RECEIVED: 'Debt: Repayment Received', // Мне вернули
} as const;

// Словарь переводов для системных категорий
export const SYSTEM_CATEGORY_TRANSLATIONS: Record<string, { ru: string; en: string }> = {
  [DEBT_SYSTEM_CATEGORIES.LENDING]: {
    ru: 'Дал в долг',
    en: 'Lending'
  },
  [DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT]: {
    ru: 'Вернул долг',
    en: 'Repayment Sent'
  },
  [DEBT_SYSTEM_CATEGORIES.BORROWING]: {
    ru: 'Взял в долг',
    en: 'Borrowing'
  },
  [DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED]: {
    ru: 'Мне вернули',
    en: 'Repayment Received'
  },
  // Можно добавить перевод для стандартной системной категории Savings, если нужно
  'Savings': {
    ru: 'Накопления',
    en: 'Savings'
  }
};

/**
 * Получает локализованное название категории.
 * Если категория системная, возвращает перевод.
 * Иначе возвращает оригинальное название.
 */
export const getLocalizedCategoryName = (categoryName: string, language: string): string => {
  const translation = SYSTEM_CATEGORY_TRANSLATIONS[categoryName];
  if (translation) {
    return language === 'ru' ? translation.ru : translation.en;
  }
  return categoryName;
};

// Дефолтные категории долгов (создаются при первом использовании)
export const DEFAULT_DEBT_CATEGORIES: Omit<DebtCategory, 'id'>[] = [
  { name: 'Personal', icon: 'User', color: '#3B82F6' },      // Личные
  { name: 'Family', icon: 'Users', color: '#10B981' },       // Семья
  { name: 'Friends', icon: 'Heart', color: '#F59E0B' },      // Друзья
  { name: 'Business', icon: 'Briefcase', color: '#8B5CF6' }, // Бизнес
  { name: 'Emergency', icon: 'AlertCircle', color: '#EF4444' }, // Экстренные
];

// Градиенты для карточек долгов
export const DEBT_GRADIENTS = {
  I_OWE: {
    DEFAULT: 'from-red-500 via-red-600 to-red-700',
    WARNING: 'from-orange-500 via-orange-600 to-orange-700',
    OVERDUE: 'from-red-700 via-red-800 to-red-900',
  },
  OWED_TO_ME: {
    DEFAULT: 'from-emerald-500 via-emerald-600 to-emerald-800',
    WARNING: 'from-yellow-500 via-yellow-600 to-yellow-700',
    OVERDUE: 'from-orange-600 via-orange-700 to-orange-800',
  },
  NEUTRAL: 'from-blue-500 via-blue-600 to-blue-800',
  ARCHIVED: 'from-gray-600 via-gray-700 to-gray-800',
} as const;

export const DEFAULT_CATEGORIES: { name: string; icon: string; type: TransactionType; isSystem?: boolean }[] = [
  // Expenses
  { name: 'Food & Drink', icon: 'UtensilsCrossed', type: TransactionType.EXPENSE },
  { name: 'Shopping', icon: 'ShoppingCart', type: TransactionType.EXPENSE },
  { name: 'Transport', icon: 'Bus', type: TransactionType.EXPENSE },
  { name: 'Home', icon: 'Home', type: TransactionType.EXPENSE },
  { name: 'Bills & Utilities', icon: 'Lightbulb', type: TransactionType.EXPENSE },
  { name: 'Entertainment', icon: 'Clapperboard', type: TransactionType.EXPENSE },
  { name: 'Health', icon: 'HeartPulse', type: TransactionType.EXPENSE },
  { name: 'Groceries', icon: 'Apple', type: TransactionType.EXPENSE },
  { name: 'Savings', icon: 'PiggyBank', type: TransactionType.EXPENSE, isSystem: true },
  { name: 'General', icon: 'LayoutGrid', type: TransactionType.EXPENSE },

  // Debt Related Expenses
  { name: DEBT_SYSTEM_CATEGORIES.LENDING, icon: 'ArrowUpCircle', type: TransactionType.EXPENSE, isSystem: true },
  { name: DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT, icon: 'CheckCircle', type: TransactionType.EXPENSE, isSystem: true },

  // Incomes
  { name: 'Salary', icon: 'Banknote', type: TransactionType.INCOME },
  { name: 'Gifts', icon: 'Gift', type: TransactionType.INCOME },
  { name: 'Freelance', icon: 'Briefcase', type: TransactionType.INCOME },

  // Debt Related Incomes
  { name: DEBT_SYSTEM_CATEGORIES.BORROWING, icon: 'ArrowDownCircle', type: TransactionType.INCOME, isSystem: true },
  { name: DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED, icon: 'CheckCircle', type: TransactionType.INCOME, isSystem: true },
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

/**
 * Определяет градиент для карточки долга на основе статуса и дедлайна
 */
export const getDebtGradient = (debt: Debt): string => {
  if (debt.status === 'ARCHIVED' || debt.status === 'COMPLETED') {
    return DEBT_GRADIENTS.ARCHIVED;
  }

  const progress = debt.amount > 0 ? (debt.current_amount / debt.amount) * 100 : 0;
  const isOverdue = debt.due_date ? new Date(debt.due_date) < new Date() : false;
  const isNearDue = debt.due_date 
    ? (new Date(debt.due_date).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 // 7 дней
    : false;

  if (debt.type === DebtType.I_OWE) {
    if (isOverdue) return DEBT_GRADIENTS.I_OWE.OVERDUE;
    if (isNearDue || progress > 85) return DEBT_GRADIENTS.I_OWE.WARNING;
    return DEBT_GRADIENTS.I_OWE.DEFAULT;
  } else {
    if (isOverdue) return DEBT_GRADIENTS.OWED_TO_ME.OVERDUE;
    if (isNearDue || progress > 85) return DEBT_GRADIENTS.OWED_TO_ME.WARNING;
    return DEBT_GRADIENTS.OWED_TO_ME.DEFAULT;
  }
};

/**
 * Определяет системную категорию для транзакции по долгу
 */
export const getDebtTransactionCategory = (
  debtType: DebtType,
  isInitial: boolean // Первая транзакция или погашение?
): string => {
  if (debtType === DebtType.I_OWE) {
    return isInitial ? DEBT_SYSTEM_CATEGORIES.BORROWING : DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT;
  } else {
    return isInitial ? DEBT_SYSTEM_CATEGORIES.LENDING : DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED;
  }
};

/**
 * Определяет тип транзакции для долга
 */
export const getDebtTransactionType = (
  debtType: DebtType,
  isInitial: boolean
): TransactionType => {
  if (debtType === DebtType.I_OWE) {
    // Я должен: беру в долг (доход), возвращаю (расход)
    return isInitial ? TransactionType.INCOME : TransactionType.EXPENSE;
  } else {
    // Мне должны: даю в долг (расход), возвращают (доход)
    return isInitial ? TransactionType.EXPENSE : TransactionType.INCOME;
  }
};

// --- НОВЫЕ КОНСТАНТЫ ДЛЯ ЭКРАНА "О ПРИЛОЖЕНИИ" ---

/**
 * Текущая версия приложения.
 */
export const APP_VERSION = '1.1.0';

/**
 * История изменений в приложении (Changelog).
 * Changes теперь содержит ключи локализации.
 */
export const CHANGELOG = [
  { 
    version: '1.1.5', 
    date: '2025-11-16', 
    changes: [
      'changelog_v1_1_5_change_1',
      'changelog_v1_1_5_change_2',
    ] 
  },
  { 
    version: '1.1.0', 
    date: '2025-11-16', 
    changes: [
      'changelog_v1_1_0_change_1',
      'changelog_v1_1_0_change_2', 
      'changelog_v1_1_0_change_3', 
    ] 
  },
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