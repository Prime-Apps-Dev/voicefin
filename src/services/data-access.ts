// src/services/data-access.ts
import { supabase } from './supabase'; // Импортируем настроенный клиент Supabase
import { 
    UserProfile, 
    UserDataJsonB, 
    Account, 
    Category, 
    SavingsGoal, 
    Transaction, 
    Budget 
} from '../types';
import { PostgrestResponse } from '@supabase/supabase-js';

// Константы для названий таблиц
const PROFILES_TABLE = 'profiles';
const TRANSACTIONS_TABLE = 'transactions';
const BUDGETS_TABLE = 'budgets';

// ------------------------------------------------------------------
// 1. СЕРВИС ДЛЯ JSONB ДАННЫХ (PROFILES, ACCOUNTS, CATEGORIES, GOALS)
// ------------------------------------------------------------------

/**
 * Получает полный профиль пользователя, включая все данные JSONB.
 * @param userId UUID пользователя.
 * @returns Promise с профилем пользователя или null.
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  console.log(`Fetching profile data for user: ${userId}`);
  
  const { data, error } = await supabase
    .from(PROFILES_TABLE)
    .select('id, name, email, telegram_id, data')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }

  // Приведение данных к типу UserProfile
  return data as UserProfile;
}

/**
 * Общая функция для обновления ТОЛЬКО JSONB-поля 'data'.
 * @param userId UUID пользователя.
 * @param updatedData Частичные данные JSONB для обновления.
 */
export async function updateUserDataJsonB(userId: string, updatedData: Partial<UserDataJsonB>): Promise<void> {
  console.log(`Updating JSONB data for user: ${userId}`);
  
  // Шаг 1: Загрузить текущий профиль, чтобы избежать перезаписи
  const currentProfile = await fetchUserProfile(userId);
  if (!currentProfile) {
      console.error('Cannot update JSONB data: Profile not found.');
      return;
  }

  // Шаг 2: Объединяем старые данные с новыми (частичными)
  const mergedData: UserDataJsonB = {
      ...currentProfile.data,
      ...updatedData
  };

  // Шаг 3: Обновляем только поле 'data' в БД
  const { error } = await supabase
    .from(PROFILES_TABLE)
    .update({ data: mergedData })
    .eq('id', userId);

  if (error) {
    console.error('Error updating JSONB user data:', error.message);
    throw new Error(`Failed to update user data: ${error.message}`);
  }
}

// ---------------------------------
// 1.1. Вспомогательные функции для Счетов (Accounts)
// ---------------------------------

/**
 * Обновляет полный массив счетов в JSONB.
 */
export async function updateAccounts(userId: string, accounts: Account[]): Promise<void> {
    return updateUserDataJsonB(userId, { accounts });
}

/**
 * Добавляет новый счет, обновляя массив в JSONB.
 */
export async function addAccount(userId: string, newAccount: Omit<Account, 'id'>): Promise<Account | null> {
    const accountWithId: Account = { ...newAccount, id: crypto.randomUUID() };
    
    const currentProfile = await fetchUserProfile(userId);
    if (!currentProfile) return null;

    const updatedAccounts = [...currentProfile.data.accounts, accountWithId];
    await updateAccounts(userId, updatedAccounts);
    
    return accountWithId;
}

/**
 * Удаляет счет по ID, обновляя массив в JSONB.
 */
export async function deleteAccount(userId: string, accountId: string): Promise<void> {
    const currentProfile = await fetchUserProfile(userId);
    if (!currentProfile) return;

    const updatedAccounts = currentProfile.data.accounts.filter(acc => acc.id !== accountId);
    await updateAccounts(userId, updatedAccounts);
}

// ------------------------------------------------------------------
// 2. СЕРВИС ДЛЯ РЕЛЯЦИОННЫХ ДАННЫХ (TRANSACTIONS и BUDGETS)
// ------------------------------------------------------------------

// ---------------------------------
// 2.1. Транзакции (Transactions)
// ---------------------------------

/**
 * Преобразование из snake_case БД в camelCase приложения
 * @param row Строка из БД
 * @returns Объект Transaction
 */
const mapTransactionFromDB = (row: any): Transaction => ({
    ...row,
    accountid: row.account_id,
    goalid: row.goal_id,
});

/**
 * Добавляет новую транзакцию в отдельную таблицу.
 */
export async function addTransaction(userId: string, transaction: Omit<Transaction, 'id'>): Promise<Transaction | null> {
  const { accountid, goalid, ...rest } = transaction;
  
  const { data, error } = await supabase
    .from(TRANSACTIONS_TABLE)
    .insert({ 
        ...rest, 
        user_id: userId,
        account_id: accountid, 
        goal_id: goalid,     
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error inserting transaction:', error.message);
    return null;
  }
  
  return mapTransactionFromDB(data);
}

/**
 * Получает транзакции за указанный период (быстрый запрос благодаря индексам).
 */
export async function fetchTransactionsByPeriod(userId: string, startDate: string, endDate: string): Promise<Transaction[]> {
  const { data, error }: PostgrestResponse<any> = await supabase
    .from(TRANSACTIONS_TABLE)
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error.message);
    return [];
  }

  return data.map(mapTransactionFromDB);
}

// ---------------------------------
// 2.2. Бюджеты (Budgets)
// ---------------------------------

/**
 * Преобразование из snake_case БД в camelCase приложения
 * @param row Строка из БД
 * @returns Объект Budget
 */
const mapBudgetFromDB = (row: any): Budget => ({
    ...row,
    monthkey: row.month_key,
    limit: row.limit_amount,
});

/**
 * Добавляет новый бюджет в отдельную таблицу.
 */
export async function addBudget(userId: string, budgetData: Omit<Budget, 'id'>): Promise<Budget | null> {
    const { monthkey, limit, ...rest } = budgetData;

    const { data, error } = await supabase
        .from(BUDGETS_TABLE)
        .insert({
            ...rest,
            user_id: userId,
            month_key: monthkey,
            limit_amount: limit, 
        })
        .select('*')
        .single();

    if (error) {
        console.error('Error inserting budget:', error.message);
        return null;
    }

    return mapBudgetFromDB(data);
}

/**
 * Обновляет существующий бюджет в отдельной таблице.
 * * @param userId UUID пользователя.
 * @param budgetData Полный объект Budget для обновления (включая id).
 * @returns Promise с обновленным объектом Budget или null.
 */
export async function updateBudget(userId: string, budgetData: Budget): Promise<Budget | null> {
    const { id, monthkey, limit, ...rest } = budgetData;

    const { data, error } = await supabase
        .from(BUDGETS_TABLE)
        .update({
            ...rest,
            user_id: userId,
            month_key: monthkey,
            limit_amount: limit, 
        })
        .eq('id', id)
        .eq('user_id', userId) // Дополнительная проверка, чтобы пользователь мог обновлять только свои бюджеты
        .select('*')
        .single();

    if (error) {
        console.error('Error updating budget:', error.message);
        // В случае ошибки бросаем исключение, чтобы вызвать catch в компоненте
        throw new Error(`Failed to update budget: ${error.message}`);
    }

    return mapBudgetFromDB(data);
}


/**
 * Получает все бюджеты пользователя за конкретный месяц.
 */
export async function fetchBudgetsByMonth(userId: string, monthKey: string): Promise<Budget[]> {
  const { data, error }: PostgrestResponse<any> = await supabase
    .from(BUDGETS_TABLE)
    .select('*') // Выбираем все поля
    .eq('user_id', userId)
    .eq('month_key', monthKey);
    
  if (error) {
    console.error('Error fetching budgets:', error.message);
    return [];
  }
  
  return data.map(mapBudgetFromDB);
}