// src/services/api.ts
// ВАШЕ "МЕНЮ" ДЛЯ СВЯЗИ С РЕАЛЬНЫМ БЭКЕНДОМ
// Мы заменяем все "заглушки" (MOCK_DB) на реальные вызовы Supabase.

import { supabase } from './supabase';
import { Transaction, Account, SavingsGoal, Budget, Category, TransactionType, AccountType, Debt, DebtCategory, DebtStatus } from '../types';
import { ICON_NAMES } from '../../shared/ui/icons/icons';
import { DEBT_SYSTEM_CATEGORIES } from '../../utils/constants';

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
  // --- ИЗМЕНЕНИЕ: Добавлены системные категории для долгов ---
  const DEFAULT_CATEGORIES = [
    // Обычные категории (на русском, как было)
    { name: 'Еда и напитки', icon: 'UtensilsCrossed', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Покупки', icon: 'ShoppingCart', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Транспорт', icon: 'Bus', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Дом', icon: 'Home', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Счета и коммуналка', icon: 'Lightbulb', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false },
    { name: 'Накопления', icon: 'PiggyBank', type: TransactionType.EXPENSE, isDefault: true, isFavorite: false, isSystem: true }, // Можно пометить Накопления как системную тоже
    { name: 'Зарплата', icon: 'Banknote', type: TransactionType.INCOME, isDefault: true, isFavorite: false },
    { name: 'Подарки', icon: 'Gift', type: TransactionType.INCOME, isDefault: true, isFavorite: false },
    
    // Новые системные категории для долгов (используем константы для имен, чтобы логика приложения работала)
    { name: DEBT_SYSTEM_CATEGORIES.LENDING, icon: 'ArrowUpCircle', type: TransactionType.EXPENSE, isDefault: false, isFavorite: false, isSystem: true },
    { name: DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT, icon: 'CheckCircle', type: TransactionType.EXPENSE, isDefault: false, isFavorite: false, isSystem: true },
    { name: DEBT_SYSTEM_CATEGORIES.BORROWING, icon: 'ArrowDownCircle', type: TransactionType.INCOME, isDefault: false, isFavorite: false, isSystem: true },
    { name: DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED, icon: 'CheckCircle', type: TransactionType.INCOME, isDefault: false, isFavorite: false, isSystem: true },
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
  // Деструктурируем id, чтобы не отправлять его в теле запроса (он используется только для поиска записи)
  const { id, ...updateData } = transaction;
  
  const { data, error } = await supabase
    .from('transactions')
    .update(updateData)
    .eq('id', id)
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

/**
 * Получить все долги пользователя
 */
export const getDebts = async (): Promise<Debt[]> => {
  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data as Debt[];
};

/**
 * Создать новый долг
 */
export const addDebt = async (debt: Omit<Debt, 'id' | 'created_at' | 'updated_at'>): Promise<Debt> => {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('debts')
    .insert({
      ...debt,
      telegram_user_id: userId,
      status: 'ACTIVE',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Debt;
};

/**
 * Обновить долг
 */
export const updateDebt = async (debt: Debt): Promise<Debt> => {
  const { id, created_at, updated_at, ...updateData } = debt;
  
  const { data, error } = await supabase
    .from('debts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Debt;
};

/**
 * Удалить долг
 */
export const deleteDebt = async (debtId: string): Promise<void> => {
  const { error } = await supabase
    .from('debts')
    .delete()
    .eq('id', debtId);
  
  if (error) throw error;
};

/**
 * Архивировать долг (переместить в архив)
 */
export const archiveDebt = async (debtId: string): Promise<Debt> => {
  const { data, error } = await supabase
    .from('debts')
    .update({ status: 'ARCHIVED' as DebtStatus })
    .eq('id', debtId)
    .select()
    .single();
  
  if (error) throw error;
  return data as Debt;
};

/**
 * Восстановить долг из архива
 */
export const unarchiveDebt = async (debtId: string): Promise<Debt> => {
  const { data, error } = await supabase
    .from('debts')
    .update({ status: 'ACTIVE' as DebtStatus })
    .eq('id', debtId)
    .select()
    .single();
  
  if (error) throw error;
  return data as Debt;
};

/**
 * Обновить остаток долга (вызывается при создании/удалении транзакции)
 */
export const updateDebtBalance = async (
  debtId: string,
  amountChange: number
): Promise<Debt | null> => {
  // 1. Пытаемся найти долг
  const { data: debt, error: fetchError } = await supabase
    .from('debts')
    .select('*')
    .eq('id', debtId)
    .maybeSingle(); // Используем maybeSingle вместо single, чтобы не получать ошибку, если записи нет

  if (fetchError) throw fetchError;
  
  // Если долг не найден (например, удален ранее), просто выходим
  if (!debt) {
    console.warn(`API: Долг с ID ${debtId} не найден. Пропускаем обновление баланса.`);
    return null;
  }
  
  // 2. Вычисляем новый баланс
  const newCurrentAmount = Math.max(0, (debt.current_amount || 0) + amountChange);
  
  // 3. Обновляем
  const { data, error } = await supabase
    .from('debts')
    .update({ current_amount: newCurrentAmount })
    .eq('id', debtId)
    .select()
    .single();
  
  if (error) throw error;
  return data as Debt;
};

// --- DEBT CATEGORIES CRUD ---

/**
 * Получить категории долгов пользователя
 */
export const getDebtCategories = async (): Promise<DebtCategory[]> => {
  const { data, error } = await supabase
    .from('debt_categories')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data as DebtCategory[];
};

/**
 * Создать категорию долга
 */
export const addDebtCategory = async (category: Omit<DebtCategory, 'id'>): Promise<DebtCategory> => {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('debt_categories')
    .insert({
      ...category,
      telegram_user_id: userId,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as DebtCategory;
};

/**
 * Обновить категорию долга
 */
export const updateDebtCategory = async (category: DebtCategory): Promise<DebtCategory> => {
  const { id, ...updateData } = category;
  
  const { data, error } = await supabase
    .from('debt_categories')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as DebtCategory;
};

/**
 * Удалить категорию долга
 */
export const deleteDebtCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase
    .from('debt_categories')
    .delete()
    .eq('id', categoryId);
  
  if (error) throw error;
};

/**
 * Создать дефолтные категории долгов (вызывается при первом входе)
 */
export const createDefaultDebtCategories = async (): Promise<DebtCategory[]> => {
  const userId = await getUserId();
  
  const defaultCategories = [
    { name: 'Personal', icon: 'User', color: '#3B82F6' },
    { name: 'Family', icon: 'Users', color: '#10B981' },
    { name: 'Friends', icon: 'Heart', color: '#F59E0B' },
    { name: 'Business', icon: 'Briefcase', color: '#8B5CF6' },
    { name: 'Emergency', icon: 'AlertCircle', color: '#EF4444' },
  ];
  
  const categoriesToInsert = defaultCategories.map(c => ({
    ...c,
    telegram_user_id: userId,
  }));
  
  const { data, error } = await supabase
    .from('debt_categories')
    .insert(categoriesToInsert)
    .select();
  
  if (error) throw error;
  return data as DebtCategory[];
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

/**
 * Обновляет настройки пользователя
 */
export const updateUserPreferences = async (userId: string, preferences: any): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      preferences,
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);

  if (error) throw error;
};

/**
 * Получить детали долга по ссылке (для входящего пользователя)
 */
export const getSharedDebt = async (debtId: string) => {
  const { data, error } = await supabase.rpc('get_shared_debt', {
    lookup_debt_id: debtId
  });

  if (error) throw error;
  return data?.[0] || null; // Возвращаем первый элемент или null
};

/**
 * Генерация ссылки для шаринга
 */
export const generateDebtShareLink = (debtId: string, amount: number, currency: string, type: string) => {
  // Получаем имя бота из переменных окружения или хардкодом
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'voicefin_bot'; 
  
  const startParam = `debt_${debtId}`;
  const appLink = `https://t.me/${botUsername}?startapp=${startParam}`;
  
  // Формируем текст сообщения
  const isIOwe = type === 'I_OWE'; // Если Я должен
  const text = isIOwe
    ? `Привет! 👋 Я тут записал, что должен тебе ${amount} ${currency}. Глянь, всё ли верно? Если да — можешь принять и отслеживать в приложении, как я возвращаю тебе долг. 👇`
    : `Привет! 👋 Напоминаю про ${amount} ${currency}. Записал в VoiceFin, чтобы мы оба не забыли. Подтверди, пожалуйста, как будет минутка. 👇`;

  // Формат ссылки для шаринга в Telegram
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appLink)}&text=${encodeURIComponent(text)}`;
  
  return { shareUrl, appLink };
};

// --- TRANSACTION REQUESTS (SYNC) ---

/**
 * Связать двух пользователей по долгу (вызывается при принятии инвайта)
 */
export const linkDebtPartners = async (parentDebtId: string, newDebtId: string) => {
  const { error } = await supabase.rpc('link_debt_partners', {
    debt_id_user1: parentDebtId,
    debt_id_user2: newDebtId
  });
  if (error) console.error("Error linking partners:", error);
};

/**
 * Создать запрос на транзакцию (отправляется другу)
 */
export const createTransactionRequest = async (request: {
  receiver_user_id: string;
  related_debt_id: string; 
  amount: number;
  currency: string;
  transaction_type: string; 
  category_name: string;
  description: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not auth");

  const { error } = await supabase
    .from('transaction_requests')
    .insert({
      ...request,
      sender_user_id: user.id
    });
    
  if (error) throw error;

  // --- ОТПРАВКА УВЕДОМЛЕНИЯ В TELEGRAM ---
  try {
    // 1. Получаем telegram_id получателя
    const { data: receiverProfile, error: profileError } = await supabase
      .from('profiles')
      .select('telegram_id')
      .eq('id', request.receiver_user_id)
      .single();

    if (profileError || !receiverProfile?.telegram_id) {
      console.warn('API: Не удалось получить telegram_id получателя для уведомления', profileError);
    } else {
      // 2. Формируем текст уведомления
      const isRequesting = request.transaction_type === 'EXPENSE'; // Если я прошу вернуть (или напоминаю)
      // Логика типов может отличаться в зависимости от того, как вы используете transaction_type в реквестах.
      // Предположим:
      // Если я создаю реквест на "Ты мне должен" -> это напоминание.
      // Если я создаю реквест на "Я тебе возвращаю" -> это уведомление о переводе.
      
      // Для простоты, пока используем универсальный текст, так как контекст "реквеста"
      // обычно означает "Подтверди эту транзакцию".
      
      const notificationText = `<b>Новый запрос в VoiceFin!</b>\n\n` +
        `Пользователь просит подтвердить транзакцию:\n` +
        `<b>${request.amount} ${request.currency}</b>\n` +
        `Категория: ${request.category_name}\n` +
        `${request.description ? `Комментарий: ${request.description}` : ''}`;

      // 3. Отправляем уведомление через Edge Function
      await sendTelegramNotification(
        receiverProfile.telegram_id,
        notificationText,
        `https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'voicefin_bot'}/app`, // Ссылка на открытие приложения
        'Открыть VoiceFin'
      );
    }
  } catch (notifyError) {
    console.error('API: Ошибка при отправке уведомления:', notifyError);
    // Не блокируем основной флоу, если уведомление не ушло
  }
};

/**
 * Отправляет уведомление через Telegram Bot API (Edge Function)
 */
export const sendTelegramNotification = async (
  chatId: number,
  text: string,
  actionUrl?: string,
  actionText?: string
) => {
  const { error } = await supabase.functions.invoke('send-telegram-notification', {
    body: {
      chat_id: chatId,
      text,
      action_url: actionUrl,
      action_text: actionText
    }
  });

  if (error) throw error;
};

/**
 * Получить входящие запросы (PENDING и REJECTED)
 */
export const getPendingRequests = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // ИЗМЕНЕНИЕ: Используем sender_user_id для JOIN
  const { data, error } = await supabase
    .from('transaction_requests')
    .select(`
      *,
      sender_profile:sender_user_id ( full_name )
    `)
    .eq('receiver_user_id', user.id)
    .in('status', ['PENDING', 'REJECTED']) 
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Маппим имя отправителя через псевдоним
  return data.map((item: any) => ({
    ...item,
    sender_name: item.sender_profile?.full_name || 'Пользователь'
  }));
};

/**
 * Обновить статус запроса (Принять/Отклонить)
 */
export const updateRequestStatus = async (requestId: string, status: 'COMPLETED' | 'REJECTED') => {
  const { error } = await supabase
    .from('transaction_requests')
    .update({ status })
    .eq('id', requestId);
    
  if (error) throw error;
};

/**
 * Разорвать связь с другим долгом (сделать независимым)
 */
export const unlinkDebt = async (debtId: string): Promise<void> => {
  const { error } = await supabase
    .from('debts')
    .update({ 
      linked_user_id: null,
      parent_debt_id: null 
    })
    .eq('id', debtId);
  
  if (error) throw error;
};