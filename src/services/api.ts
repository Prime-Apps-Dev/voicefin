// src/services/api.ts
// ВАШЕ "МЕНЮ" ДЛЯ СВЯЗИ С РЕАЛЬНЫМ БЭКЕНДОМ
// Мы заменяем все "заглушки" (MOCK_DB) на реальные вызовы Supabase.

import { supabase } from './supabase';
import { Transaction, Account, SavingsGoal, Budget, Category, TransactionType, AccountType } from '../types';
import { ICON_NAMES } from '../components/icons';

// --- Auth ---
/**
 * Шаг 1: Аутентификация
 * Вызываем нашу бэкенд-функцию 'telegram-auth'.
 * Она проверяет данные Telegram и возвращает "пропуск" (JWT-токен).
 */
export async function authenticateWithTelegram(initData: string) {
  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { initData },
  });

  if (error) {
    throw new Error(`Auth function error: ${error.message}`);
  }

  if (!data || !data.token) {
    throw new Error('No token returned from auth function');
  }

  return data; // Возвращаем { token: '...', user: {...} }
}

/**
 * Шаг 2: Загрузка всех данных пользователя
 * После аутентификации, мы запрашиваем ВСЕ данные.
 * SQL-политики (которые мы создали) сами отфильтруют и вернут
 * только те данные, которые принадлежат этому пользователю.
 */
export const initializeUser = async () => {
  const [transactionsRes, accountsRes, categoriesRes, savingsGoalsRes, budgetsRes] = await Promise.all([
    supabase.from('transactions').select('*'),
    supabase.from('accounts').select('*'),
    supabase.from('categories').select('*'),
    supabase.from('savings_goals').select('*'),
    supabase.from('budgets').select('*'),
  ]);

  // Обрабатываем ошибки
  if (transactionsRes.error) throw transactionsRes.error;
  if (accountsRes.error) throw accountsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (savingsGoalsRes.error) throw savingsGoalsRes.error;
  if (budgetsRes.error) throw budgetsRes.error;

  // Если у пользователя нет категорий (первый вход), создаем стандартные
  let categories = categoriesRes.data as Category[];
  if (categories.length === 0) {
    categories = await createDefaultCategories();
  }

  // Если нет счетов, создаем "Наличные"
  let accounts = accountsRes.data as Account[];
  if (accounts.length === 0) {
    accounts = [await createDefaultAccount()];
  }

  return {
    transactions: transactionsRes.data as Transaction[],
    accounts,
    categories,
    savingsGoals: savingsGoalsRes.data as SavingsGoal[],
    budgets: budgetsRes.data as Budget[],
  };
};

/**
 * Вспомогательная функция: создание категорий по умолчанию
 */
const createDefaultCategories = async (): Promise<Category[]> => {
  const DEFAULT_CATEGORIES = [
    { name: 'Food & Drink', icon: 'UtensilsCrossed', type: TransactionType.EXPENSE, isdefault: true, isfavorite: false },
    { name: 'Shopping', icon: 'ShoppingCart', type: TransactionType.EXPENSE, isdefault: true, isfavorite: false },
    { name: 'Transport', icon: 'Bus', type: TransactionType.EXPENSE, isdefault: true, isfavorite: false },
    { name: 'Home', icon: 'Home', type: TransactionType.EXPENSE, isdefault: true, isfavorite: false },
    { name: 'Bills & Utilities', icon: 'Lightbulb', type: TransactionType.EXPENSE, isdefault: true, isfavorite: false },
    { name: 'Savings', icon: 'PiggyBank', type: TransactionType.EXPENSE, isdefault: true, isfavorite: false },
    { name: 'Salary', icon: 'Banknote', type: TransactionType.INCOME, isdefault: true, isfavorite: false },
    { name: 'Gifts', icon: 'Gift', type: TransactionType.INCOME, isdefault: true, isfavorite: false },
  ];

  // Получаем ID пользователя
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated for creating categories");
  
  const categoriesToInsert = DEFAULT_CATEGORIES.map(c => ({
    ...c,
    telegram_user_id: user.id, // Связываем с пользователем
  }));
  
  const { data, error } = await supabase.from('categories').insert(categoriesToInsert).select();
  if (error) throw error;
  
  return data as Category[];
};

/**
 * Вспомогательная функция: создание счета "Наличные"
 */
const createDefaultAccount = async (): Promise<Account> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated for creating account");

    const defaultAccount = {
      name: 'Cash',
      currency: 'USD',
      type: AccountType.CASH,
      gradient: 'from-gray-700 to-gray-800',
      telegram_user_id: user.id,
    };

    const { data, error } = await supabase.from('accounts').insert(defaultAccount).select().single();
    if (error) throw error;
    
    return data as Account;
};


// --- CRUD Operations ---

// Получаем ID пользователя ОДИН раз, чтобы добавлять его во все запросы
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");
  return user.id;
};

/**
 * Вызывает Edge Function для генерации финансового анализа
 */
export async function generateFinancialAnalysis(
  transactions: Transaction[], 
  language: string
): Promise<string> {
  
  const { data, error } = await supabase.functions.invoke('generate-financial-analysis', {
    body: { 
      transactions, 
      language 
    },
  });

  if (error) {
    throw new Error(`Failed to generate financial analysis: ${error.message}`);
  }

  // Бэкенд, вероятно, возвращает объект { analysis: "..." }
  if (!data || !data.analysis) {
    throw new Error('Invalid response from analysis function');
  }

  return data.analysis;
}

// Transactions
// ИСПРАВЛЕНИЕ 2: Это ЕДИНСТВЕННАЯ декларация addTransaction
export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...transaction, telegram_user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateTransaction = async (transaction: Transaction): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .update(transaction)
    .eq('id', transaction.id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteTransaction = async (transactionId: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
  if (error) throw error;
};

// Accounts
export const addAccount = async (account: Omit<Account, 'id'>): Promise<Account> => {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...account, telegram_user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateAccount = async (account: Account): Promise<Account> => {
  const { data, error } = await supabase.from('accounts').update(account).eq('id', account.id).select().single();
  if (error) throw error;
  return data;
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw error;
};

// Categories
export const addCategory = async (category: Omit<Category, 'id'>): Promise<Category> => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('categories').insert({ ...category, telegram_user_id: userId }).select().single();
  if (error) throw error;
  return data;
};

export const updateCategory = async (category: Category): Promise<Category> => {
  const { data, error } = await supabase.from('categories').update(category).eq('id', category.id).select().single();
  if (error) throw error;
  return data;
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase.from('categories').delete().eq('id', categoryId);
  if (error) throw error;
};

// Savings Goals
export const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('savings_goals').insert({ ...goal, telegram_user_id: userId }).select().single();
  if (error) throw error;
  return data;
};

export const updateSavingsGoal = async (goal: SavingsGoal): Promise<SavingsGoal> => {
  const { data, error } = await supabase.from('savings_goals').update(goal).eq('id', goal.id).select().single();
  if (error) throw error;
  return data;
};

export const deleteSavingsGoal = async (goalId: string): Promise<void> => {
  const { error } = await supabase.from('savings_goals').delete().eq('id', goalId);
  if (error) throw error;
};

// Budgets
export const addBudget = async (budget: Omit<Budget, 'id'>): Promise<Budget> => {
  const userId = await getUserId();
  const { data, error } = await supabase.from('budgets').insert({ ...budget, telegram_user_id: userId }).select().single();
  if (error) throw error;
  return data;
};

export const updateBudget = async (budget: Budget): Promise<Budget> => {
  const { data, error } = await supabase.from('budgets').update(budget).eq('id', budget.id).select().single();
  if (error) throw error;
  return data;
};

export const deleteBudget = async (budgetId: string): Promise<void> => {
  const { error } = await supabase.from('budgets').delete().eq('id', budgetId);
  if (error) throw error;
};


// --- Gemini Edge Function Calls ---

/**
 * Парсит транзакцию из текста
 */
export const parseTransactionFromText = async (
  text: string,
  defaultCurrency: string,
  categories: Category[],
  savingsGoals: SavingsGoal[],
  language: string
): Promise<Omit<Transaction, 'id'>> => {
  
  const { data, error } = await supabase.functions.invoke('parse-text-transaction', {
    body: { text, defaultCurrency, categories, savingsGoals, language }
  });

  if (error) throw error;
  return data as Omit<Transaction, 'id'>;
};

/**
 * Получает иконку для категории
 */
export const getIconForCategory = async (categoryName: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('get-icon-for-category', {
    body: { categoryName, iconList: ICON_NAMES }
  });

  if (error) throw error;
  return data.iconName;
};

/**
 * Генерирует советы по экономии
 */
export const generateSavingsTips = async (transactions: Transaction[]): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('generate-savings-tips', {
    body: { transactions }
  });

  if (error) throw error;
  return data.tips;
};

/**
 * НОВАЯ: Обрабатывает аудио-файл
 */
export const processAudioTransaction = async (
  audioBlob: Blob,
  categories: Category[],
  savingsGoals: SavingsGoal[],
  language: string
): Promise<Omit<Transaction, 'id'>> => {

  console.log('API: Starting processAudioTransaction...'); // LOG 1: Начало

  const formData = new FormData();
  formData.append('audio', audioBlob, 'transaction.webm');
  
  const context = { categories, savingsGoals, language };
  console.log('API: Context for AI:', context); // LOG 2: Контекст для ИИ
  
  formData.append('context', JSON.stringify(context));

  // Используем прямой fetch вместо supabase.functions.invoke
  const { data: { session } } = await supabase.auth.getSession();
  
  const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';

  if (!SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL environment variable is missing or empty.");
  }

  const url = `${SUPABASE_URL}/functions/v1/process-audio-transaction`;
  console.log('API: Fetching URL:', url); // LOG 3: URL запроса
  console.log(`API: Audio Blob size: ${audioBlob.size} bytes, type: ${audioBlob.type}`); // LOG 4: Детали Blob

  const response = await fetch(
    url,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token || ''}`,
      },
      body: formData,
    }
  );

  console.log('API: Response status:', response.status); // LOG 5: Статус ответа

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API: Function call failed. Error response text:', errorText); // LOG 6: Текст ошибки
    throw new Error(`Function call failed (Status: ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('API: Successfully received data:', data); // LOG 7: Успешный ответ
  return data as Omit<Transaction, 'id'>;
};