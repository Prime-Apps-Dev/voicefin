// src/services/api.ts
// ВАШЕ "МЕНЮ" ДЛЯ СВЯЗИ С РЕАЛЬНЫМ БЭКЕНДОМ
// Мы заменяем все "заглушки" (MOCK_DB) на реальные вызовы Supabase.

import { supabase } from './supabase';
import { Transaction, Account, SavingsGoal, Budget, Category, TransactionType, AccountType } from '../types';
import { ICON_NAMES } from '../../shared/ui/icons/icons';

// --- Аутентификация ---
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
    throw new Error(`Ошибка функции аутентификации: ${error.message}`);
  }

  if (!data || !data.token) {
    throw new Error('Функция аутентификации не вернула токен');
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
    { name: 'Еда и напитки', icon: 'UtensilsCrossed', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Покупки', icon: 'ShoppingCart', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Транспорт', icon: 'Bus', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Дом', icon: 'Home', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Счета и коммуналка', icon: 'Lightbulb', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Накопления', icon: 'PiggyBank', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Зарплата', icon: 'Banknote', type: TransactionType.INCOME, isDefault: true, isFavorite: false },
    { name: 'Подарки', icon: 'Gift', type: TransactionType.INCOME, isDefault: true, isFavorite: false },
  ];

  // Получаем ID пользователя
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Пользователь не аутентифицирован для создания категорий");
  
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
    if (!user) throw new Error("Пользователь не аутентифицирован для создания счета");

    const defaultAccount = {
      name: 'Наличные',
      currency: 'USD',
      type: AccountType.CASH,
      gradient: 'from-gray-700 to-gray-800',
      telegram_user_id: user.id,
    };

    const { data, error } = await supabase.from('accounts').insert(defaultAccount).select().single();
    if (error) throw error;
    
    return data as Account;
};


// --- Операции CRUD (Создание, Чтение, Обновление, Удаление) ---

// Получаем ID пользователя ОДИН раз, чтобы добавлять его во все запросы
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Пользователь не аутентифицирован");
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
    throw new Error(`Ошибка генерации финансового анализа: ${error.message}`);
  }

  // Бэкенд, вероятно, возвращает объект { analysis: "..." }
  if (!data || !data.analysis) {
    throw new Error('Некорректный ответ от функции анализа');
  }

  return data.analysis;
}

// Транзакции
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

// Счета
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

// *** ИСПРАВЛЕНИЕ ЗДЕСЬ ***
// Мы отделяем 'id' от 'updateData', чтобы не пытаться обновить 'id' в базе данных.
export const updateAccount = async (account: Account): Promise<Account> => {
  // Деструктурируем 'id' из объекта 'account'
  // 'updateData' будет содержать все остальные поля (name, currency, gradient, type)
  const { id, ...updateData } = account;

  const { data, error } = await supabase
    .from('accounts')
    .update(updateData) // Передаем в update() только 'updateData'
    .eq('id', id)       // Используем 'id' для .eq()
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw error;
};

// Категории
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

// Копилки (Цели накоплений)
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

// Бюджеты
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


// --- Вызовы Edge Function (Gemini AI) ---

/**
 * Парсит (распознает) транзакцию из текста
 */
export const parseTransactionFromText = async (
  text: string,
  defaultCurrency: string,
  categories: Category[],
  savingsGoals: SavingsGoal[],
  accounts: Account[],
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
  accounts: Account[], // НОВОЕ: список счетов
  language: string,
  defaultCurrency: string // НОВОЕ: валюта по умолчанию
): Promise<Omit<Transaction, 'id'>> => {

  console.log('API: Начинаем processAudioTransaction...');

  const formData = new FormData();
  formData.append('audio', audioBlob, 'transaction.webm');
  
  const context = { 
    categories, 
    savingsGoals, 
    accounts, // НОВОЕ
    language,
    defaultCurrency // НОВОЕ
  };
  
  console.log('API: Контекст для ИИ:', context);
  
  formData.append('context', JSON.stringify(context));

  // Используем прямой fetch
  const { data: { session } } = await supabase.auth.getSession();
  
  const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || '';

  if (!SUPABASE_URL) {
    throw new Error("VITE_SUPABASE_URL переменная окружения отсутствует или пуста.");
  }

  const url = `${SUPABASE_URL}/functions/v1/process-audio-transaction`;
  console.log('API: Запрос на URL:', url);
  console.log(`API: Размер аудио Blob: ${audioBlob.size} байт, тип: ${audioBlob.type}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session?.access_token || ''}`,
    },
    body: formData,
  });

  console.log('API: Статус ответа:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API: Ошибка вызова функции. Текст ошибки:', errorText);
    throw new Error(`Ошибка вызова функции (Статус: ${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('API: Успешно получены данные:', data);
  
  return data as Omit<Transaction, 'id'>;
};


/**
 * Устанавливает флаг has_completed_onboarding в true для пользователя
 */
export const markOnboardingAsCompleted = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ has_completed_onboarding: true, updated_at: new Date().toISOString() }) // Также обновим updated_at
    .eq('id', userId); // 'id' в таблице profiles совпадает с auth.users 'id'

  if (error) {
    console.error("Ошибка при обновлении статуса онбординга:", error);
    throw error;
  }
};

// <-- НОВАЯ ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ ВАЛЮТЫ -->
/**
 * Обновляет валюту по умолчанию в профиле пользователя
 */
export const updateDefaultCurrency = async (userId: string, currency: string): Promise<void> => {
  console.log(`API: Обновляем валюту по умолчанию для пользователя ${userId} на ${currency}`);
  const { error } = await supabase
    .from('profiles')
    .update({ 
      default_currency: currency, 
      updated_at: new Date().toISOString() 
    }) // Обновляем default_currency и updated_at
    .eq('id', userId); // Ищем пользователя по id

  if (error) {
    console.error("Ошибка при обновлении валюты по умолчанию:", error);
    throw error;
  }
  console.log("API: Валюта по умолчанию успешно обновлена в профиле.");
};
// <-- КОНЕЦ НОВОЙ ФУНКЦИИ -->