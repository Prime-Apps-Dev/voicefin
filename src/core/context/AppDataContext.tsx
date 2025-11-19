// src/core/context/AppDataContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as api from '../services/api';
import { getExchangeRates, convertCurrency } from '../services/currency';
import { 
  Transaction, Account, Category, SavingsGoal, Budget, Debt, ExchangeRates, 
  TransactionType, DebtType, DebtStatus, DebtCategory
} from '../types';
import { useAuth } from './AuthContext';
import { useLocalization } from './LocalizationContext';
import { 
  getDebtTransactionType, 
  getDebtTransactionCategory, 
  DEBT_SYSTEM_CATEGORIES, 
  DEFAULT_CATEGORIES 
} from '../../utils/constants';

interface SummaryData {
  monthlyIncome: number;
  monthlyExpense: number;
  selectedBalance: number;
}

interface AppDataContextType {
  // Data
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  debts: Debt[];
  debtCategories: DebtCategory[];
  rates: ExchangeRates;
  isDataLoading: boolean;
  dataError: string | null;
  
  // Derived Data
  displayCurrency: string;
  totalBalance: number;
  totalSavings: number;
  summary: SummaryData;
  daysActive: number;
  
  // Actions
  refreshData: () => Promise<void>;
  handleAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  handleUpdateTransaction: (tx: Transaction) => Promise<void>;
  handleDeleteTransaction: (txId: string) => Promise<void>;
  
  handleSaveAccount: (acc: Omit<Account, 'id'> | Account) => Promise<void>;
  handleDeleteAccount: (accId: string) => Promise<void>;
  
  handleSaveCategory: (cat: Omit<Category, 'id'> | Category) => Promise<void>;
  handleDeleteCategory: (catId: string) => Promise<void>;
  
  handleSaveGoal: (goal: Omit<SavingsGoal, 'id'> | SavingsGoal) => Promise<void>;
  handleDeleteGoal: (goalId: string) => Promise<void>;
  
  handleSaveBudget: (budget: Omit<Budget, 'id'> | Budget) => Promise<void>;
  handleDeleteBudget: (budgetId: string) => Promise<void>;
  
  handleSaveDebt: (debt: Omit<Debt, 'id'> | Debt, createInitialTransaction?: boolean, accountId?: string) => Promise<void>;
  handleDeleteDebt: (debtId: string) => Promise<void>;
  handleArchiveDebt: (debtId: string) => Promise<void>;
  
  updateDefaultCurrency: (currency: string) => Promise<void>;
  
  // Filters
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) throw new Error('useAppData must be used within an AppDataProvider');
  return context;
};

export const AppDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading, refreshUserProfile } = useAuth();
  const { t } = useLocalization();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtCategories, setDebtCategories] = useState<DebtCategory[]>([]); 
  const [rates, setRates] = useState<ExchangeRates>({});
  
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  // --- Data Loading & Migration ---
  const loadData = async () => {
    if (!user) return;
    setIsDataLoading(true);
    setDataError(null);
    try {
      const [exchangeRates, initialData, fetchedDebts, fetchedDebtCategories] = await Promise.all([
        getExchangeRates(),
        api.initializeUser(),
        api.getDebts(),
        api.getDebtCategories()
      ]);
      
      // --- МИГРАЦИЯ КАТЕГОРИЙ ---
      let currentCategories = initialData.categories;
      const missingSystemCategories = DEFAULT_CATEGORIES.filter(sysCat => 
        sysCat.isSystem && 
        !currentCategories.some(userCat => userCat.name === sysCat.name && userCat.type === sysCat.type)
      );

      if (missingSystemCategories.length > 0) {
        console.log("Migration: Creating missing system categories...", missingSystemCategories);
        const createdCategories: Category[] = [];
        
        for (const catToCreate of missingSystemCategories) {
          try {
            const newCat = await api.addCategory({
              name: catToCreate.name,
              icon: catToCreate.icon,
              type: catToCreate.type,
              isFavorite: false,
              isDefault: false,
              isSystem: true
            });
            createdCategories.push(newCat);
          } catch (err) {
            console.error(`Migration: Failed to create category ${catToCreate.name}`, err);
          }
        }
        currentCategories = [...currentCategories, ...createdCategories];
      }
      // ---------------------------

      setRates(exchangeRates);
      setTransactions(initialData.transactions);
      setAccounts(initialData.accounts);
      setCategories(currentCategories);
      setSavingsGoals(initialData.savingsGoals);
      setBudgets(initialData.budgets);
      setDebts(fetchedDebts || []);
      setDebtCategories(fetchedDebtCategories || []); 

    } catch (err: any) {
      console.error("AppData: Load failed", err);
      setDataError(err.message || "Failed to load data");
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && user) {
      loadData();
    }
  }, [user, isAuthLoading]);

  // --- Calculations (Derived State) ---
  const displayCurrency = useMemo(() => user?.default_currency || 'USD', [user]);

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter(tx => tx.accountId === selectedAccountId || tx.toAccountId === selectedAccountId);
  }, [transactions, selectedAccountId]);

  const totalBalance = useMemo(() => {
    return transactions.reduce((balance, tx) => {
      const amountInDefaultCurrency = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
      if (tx.type === TransactionType.TRANSFER) return balance;
      return balance + (tx.type === TransactionType.INCOME ? amountInDefaultCurrency : -amountInDefaultCurrency);
    }, 0);
  }, [transactions, rates, displayCurrency]);

  const totalSavings = useMemo(() => {
    return savingsGoals.reduce((total, goal) => {
        const goalCurrency = goal.currency || displayCurrency;
        const amount = convertCurrency(goal.currentAmount, goalCurrency, displayCurrency, rates);
        return total + amount;
    }, 0);
  }, [savingsGoals, rates, displayCurrency]);

  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let monthlyIncome = 0;
    let monthlyExpense = 0;

    for (const tx of filteredTransactions) {
      const txDate = new Date(tx.date);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        const val = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
        if (tx.type === TransactionType.INCOME) monthlyIncome += val;
        else if (tx.type === TransactionType.EXPENSE) monthlyExpense += val;
      }
    }

    const selectedBalance = filteredTransactions.reduce((balance, tx) => {
       const val = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
       if (tx.type === TransactionType.INCOME) return balance + val;
       if (tx.type === TransactionType.EXPENSE) return balance - val;
       if (tx.type === TransactionType.TRANSFER) {
           if (selectedAccountId === 'all') return balance;
           if (tx.accountId === selectedAccountId) return balance - val;
           if (tx.toAccountId === selectedAccountId) return balance + val;
       }
       return balance;
    }, 0);

    return { monthlyIncome, monthlyExpense, selectedBalance };
  }, [filteredTransactions, rates, displayCurrency, selectedAccountId]);

  const daysActive = useMemo(() => {
    if (transactions.length === 0) return 1;
    const firstDate = new Date(transactions[transactions.length - 1].date);
    const diffTime = new Date().getTime() - firstDate.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [transactions]);

  // --- Helpers for Goals and Debts Updates ---

  const updateGoalsFromTransaction = (tx: Transaction | Omit<Transaction, 'id'>, originalTx: Transaction | null = null) => {
    const currentGoalId = 'goalId' in tx ? tx.goalId : undefined;
    
    if (currentGoalId || originalTx?.goalId) {
        setSavingsGoals(prevGoals => prevGoals.map(g => {
            let newCurrentAmount = g.currentAmount;
            // Revert original
            if (originalTx?.goalId === g.id) {
                newCurrentAmount -= convertCurrency(originalTx.amount, originalTx.currency, g.currency, rates);
            }
            // Apply new
            if (currentGoalId === g.id && tx.type === TransactionType.EXPENSE) {
                newCurrentAmount += convertCurrency(tx.amount, tx.currency, g.currency, rates);
            }
            return { ...g, currentAmount: Math.max(0, newCurrentAmount) };
        }));
    }
  };

  // Локальное обновление долга при транзакции (Optimistic UI)
  const updateDebtsFromTransaction = (tx: Transaction | Omit<Transaction, 'id'>, originalTx: Transaction | null = null) => {
    const currentDebtId = 'debtId' in tx ? tx.debtId : undefined;

    if (currentDebtId || originalTx?.debtId) {
      setDebts(prevDebts => prevDebts.map(d => {
        let newCurrentAmount = d.current_amount;
        
        // 1. Если редактируем транзакцию: сначала откатываем влияние старой
        if (originalTx?.debtId === d.id) {
           const amount = convertCurrency(originalTx.amount, originalTx.currency, d.currency, rates);
           if (
               originalTx.category === DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED || 
               originalTx.category === DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT
            ) {
               // Возврат погашения -> долг увеличивается обратно
               newCurrentAmount += amount;
           } else if (
               originalTx.category === DEBT_SYSTEM_CATEGORIES.LENDING ||
               originalTx.category === DEBT_SYSTEM_CATEGORIES.BORROWING
           ) {
                // Отмена выдачи/займа -> долг уменьшается
                newCurrentAmount -= amount;
           }
        }

        // 2. Применяем новую транзакцию
        if (currentDebtId === d.id) {
           const amount = convertCurrency(tx.amount, tx.currency, d.currency, rates);
           
           if (
               tx.category === DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED || 
               tx.category === DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT
           ) {
               // Погашение -> долг уменьшается
               newCurrentAmount -= amount;
           } else if (
               tx.category === DEBT_SYSTEM_CATEGORIES.LENDING ||
               tx.category === DEBT_SYSTEM_CATEGORIES.BORROWING
           ) {
               // Выдача/Займ -> долг увеличивается
               newCurrentAmount += amount;
           }
        }
        
        const updatedDebt = { ...d, current_amount: Math.max(0, newCurrentAmount) };
        return updatedDebt;
      }));
    }
  };

  // --- Transaction Handlers ---

  const handleAddTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
    try {
        // Создаем копию, чтобы можно было удалять служебные поля (newDebtPerson)
        // и модифицировать без побочных эффектов
        let finalTxData: any = { ...transactionData };

        // --- 0. Handle New Debt Creation (ВАЖНОЕ ИСПРАВЛЕНИЕ) ---
        if (finalTxData.newDebtPerson) {
             // Определяем тип долга на основе категории
             let debtType = DebtType.I_OWE;
             if (finalTxData.category === DEBT_SYSTEM_CATEGORIES.LENDING) debtType = DebtType.OWED_TO_ME;
             else if (finalTxData.category === DEBT_SYSTEM_CATEGORIES.BORROWING) debtType = DebtType.I_OWE;
             else if (finalTxData.category === DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED) debtType = DebtType.OWED_TO_ME;
             else if (finalTxData.category === DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT) debtType = DebtType.I_OWE;
             
             // Создаем долг. Начинаем с 0, транзакция добавит сумму сама (через логику обновления баланса)
             // или можно сразу установить amount, но тогда нужно аккуратно с updateDebtsFromTransaction
             const newDebt = await api.addDebt({
                 person: finalTxData.newDebtPerson,
                 amount: finalTxData.amount, // Общая сумма (лимит)
                 current_amount: 0,          // Текущий долг начнем с 0, транзакция его "наполнит"
                 currency: finalTxData.currency,
                 type: debtType,
                 status: DebtStatus.ACTIVE,
                 date: finalTxData.date,
                 description: `Linked to: ${finalTxData.name}`,
                 category: finalTxData.category
             });
             
             setDebts(prev => [newDebt, ...prev]); // Обновляем UI сразу
             
             // Привязываем транзакцию к созданному долгу
             finalTxData.debtId = newDebt.id;
             // УДАЛЯЕМ служебное поле, чтобы не сломать запрос к Supabase
             delete finalTxData.newDebtPerson;
        }

        // --- 1. Handle Category ---
        if (finalTxData.category && !categories.some((c: Category) => c.name.toLowerCase() === finalTxData.category.toLowerCase())) {
            const iconName = await api.getIconForCategory(finalTxData.category);
            const newCategory = await api.addCategory({
                name: finalTxData.category,
                icon: iconName,
                isFavorite: false,
                isDefault: false,
                type: finalTxData.type,
            });
            setCategories(prev => [...prev, newCategory]);
        }

        // --- 2. Handle Dependencies (Goals/Debts) ---
        updateGoalsFromTransaction(finalTxData);
        
        // Обновляем баланс долга (в БД и локально)
        if (finalTxData.debtId) {
            let amountChange = 0;
            
            const isDebtIncrease = 
                finalTxData.category === DEBT_SYSTEM_CATEGORIES.LENDING || 
                finalTxData.category === DEBT_SYSTEM_CATEGORIES.BORROWING;
            
            if (isDebtIncrease) {
                amountChange = finalTxData.amount;
            } else {
                amountChange = -finalTxData.amount;
            }
            
            // 1. Сначала обновляем визуально (чтобы было мгновенно)
            updateDebtsFromTransaction(finalTxData); 

            // 2. Отправляем запрос в Supabase и получаем ОБНОВЛЕННУЮ запись долга
            const updatedDebtFromServer = await api.updateDebtBalance(finalTxData.debtId, amountChange); 
            
            // 3. Если сервер вернул обновленный долг, обновляем его в стейте "начисто"
            // Это заменяет необходимость вызывать api.getDebts()
            if (updatedDebtFromServer) {
                setDebts(prev => prev.map(d => d.id === updatedDebtFromServer.id ? updatedDebtFromServer : d));
            }
        }

        // Создаем транзакцию (без newDebtPerson)
        const newTx = await api.addTransaction(finalTxData);
        setTransactions(prev => [newTx, ...prev]);
        
        // УБРАЛИ ЛИШНИЙ ЗАПРОС api.getDebts()
        // Мы уже обновили debts локально либо через setDebts при создании,
        // либо через updateDebtsFromTransaction при обновлении баланса.
        // Это должно существенно ускорить процесс.

    } catch (e: any) {
        setDataError(e.message);
        throw e;
    }
  };

  const handleUpdateTransaction = async (transactionData: Transaction) => {
      try {
        let finalTxData: any = { ...transactionData };
        const originalTransaction = transactions.find(t => t.id === transactionData.id) || null;

        // --- 0. Handle New Debt on Update (редкий кейс, но возможен) ---
        if (finalTxData.newDebtPerson) {
             let debtType = DebtType.I_OWE;
             if (finalTxData.category === DEBT_SYSTEM_CATEGORIES.LENDING) debtType = DebtType.OWED_TO_ME;
             else if (finalTxData.category === DEBT_SYSTEM_CATEGORIES.BORROWING) debtType = DebtType.I_OWE;
             
             const newDebt = await api.addDebt({
                 person: finalTxData.newDebtPerson,
                 amount: finalTxData.amount,
                 current_amount: 0, 
                 currency: finalTxData.currency,
                 type: debtType,
                 status: DebtStatus.ACTIVE,
                 date: finalTxData.date,
                 description: `Linked to: ${finalTxData.name}`,
                 category: finalTxData.category
             });
             
             setDebts(prev => [newDebt, ...prev]);
             finalTxData.debtId = newDebt.id;
             delete finalTxData.newDebtPerson;
        }

        // Обновляем зависимости
        updateGoalsFromTransaction(finalTxData, originalTransaction);
        updateDebtsFromTransaction(finalTxData, originalTransaction); // Optimistic update
        
        // Синхронизируем балансы долгов в БД (нужно и откатить старое, и применить новое)
        // 1. Откат старой транзакции
        if (originalTransaction?.debtId) {
             let revertChange = 0;
             if (originalTransaction.category === DEBT_SYSTEM_CATEGORIES.LENDING || 
                 originalTransaction.category === DEBT_SYSTEM_CATEGORIES.BORROWING) {
                 revertChange = -originalTransaction.amount; // Откатываем увеличение
             } else {
                 revertChange = originalTransaction.amount; // Откатываем уменьшение (возвращаем долг обратно)
             }
             await api.updateDebtBalance(originalTransaction.debtId, revertChange);
        }

        // 2. Применение новой транзакции
        if (finalTxData.debtId) {
             let applyChange = 0;
             if (finalTxData.category === DEBT_SYSTEM_CATEGORIES.LENDING || 
                 finalTxData.category === DEBT_SYSTEM_CATEGORIES.BORROWING) {
                 applyChange = finalTxData.amount;
             } else {
                 applyChange = -finalTxData.amount;
             }
             await api.updateDebtBalance(finalTxData.debtId, applyChange);
        }
        
        const updatedTx = await api.updateTransaction(finalTxData);
        setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
        
        // УБРАЛИ ЛИШНИЙ ЗАПРОС api.getDebts()
        
      } catch (e: any) {
          setDataError(e.message);
          throw e;
      }
  };

  const handleDeleteTransaction = async (txId: string) => {
      try {
          const txToDelete = transactions.find(t => t.id === txId);
          if (!txToDelete) return;

          // 1. Обработка Целей (Savings Goals) - откат прогресса
          if (txToDelete.goalId && txToDelete.type === TransactionType.EXPENSE) {
             setSavingsGoals(prevGoals => prevGoals.map(g => {
                if (g.id === txToDelete.goalId) {
                    const amount = convertCurrency(txToDelete.amount, txToDelete.currency, g.currency, rates);
                    return { ...g, currentAmount: Math.max(0, g.currentAmount - amount) };
                }
                return g;
             }));
          }
          
          // 2. Обработка Долгов (Debts) - откат баланса
          if (txToDelete.debtId) {
              let amountChange = 0;
              
              // Логика:
              // Если мы удаляем запись о том, что "Я дал в долг" (Lending) -> Долг должен уменьшиться (-).
              // Если мы удаляем запись о том, что "Мне вернули долг" (Repayment) -> Долг должен увеличиться обратно (+).
              
              const isDebtCreation = 
                  txToDelete.category === DEBT_SYSTEM_CATEGORIES.LENDING || 
                  txToDelete.category === DEBT_SYSTEM_CATEGORIES.BORROWING;
              
              if (isDebtCreation) {
                  // Было увеличение долга, значит при удалении уменьшаем
                  amountChange = -txToDelete.amount; 
              } else {
                  // Было погашение (уменьшение), значит при удалении возвращаем сумму обратно
                  amountChange = txToDelete.amount; 
              }
              
              // Вызываем API. Благодаря updateDebtBalance с maybeSingle, 
              // если долг удален, код не упадет, а просто вернет null.
              const updatedDebt = await api.updateDebtBalance(txToDelete.debtId, amountChange);
              
              // Если долг существовал и обновился, обновляем стейт
              if (updatedDebt) {
                  setDebts(prev => prev.map(d => d.id === updatedDebt.id ? updatedDebt : d));
              } else {
                  // Если долг вернулся null, значит он удален в БД.
                  // Можно опционально почистить локальный стейт, если там вдруг остался висячий долг
                  setDebts(prev => prev.filter(d => d.id !== txToDelete.debtId));
              }
          }
          
          // 3. Удаляем саму транзакцию
          await api.deleteTransaction(txId);
          setTransactions(prev => prev.filter(t => t.id !== txId));
          
      } catch (e: any) {
          console.error("Ошибка при удалении транзакции:", e);
          setDataError(e.message);
          // Не пробрасываем ошибку дальше (throw e), чтобы UI не крашился,
          // но показываем пользователю уведомление через dataError
      }
  };

  // --- Account/Category/Goal/Budget Handlers ---
  const handleSaveAccount = async (data: Omit<Account, 'id'> | Account) => {
      if ('id' in data) {
          const updated = await api.updateAccount(data);
          setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
      } else {
          const newAcc = await api.addAccount(data);
          setAccounts(prev => [...prev, newAcc]);
      }
  };

  const handleDeleteAccount = async (id: string) => {
      await api.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      setTransactions(prev => prev.filter(tx => tx.accountId !== id && tx.toAccountId !== id));
      if (selectedAccountId === id) setSelectedAccountId('all');
  };

  const handleSaveCategory = async (data: Omit<Category, 'id'> | Category) => {
      if ('id' in data) {
          const saved = await api.updateCategory(data);
          setCategories(prev => prev.map(c => c.id === saved.id ? saved : c));
      } else {
          const saved = await api.addCategory({ ...data, isDefault: false });
          setCategories(prev => [...prev, saved]);
      }
  };

  const handleDeleteCategory = async (id: string) => {
      await api.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleSaveGoal = async (data: Omit<SavingsGoal, 'id'> | SavingsGoal) => {
      if ('id' in data) {
          const updated = await api.updateSavingsGoal(data);
          setSavingsGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
      } else {
          const newGoal = await api.addSavingsGoal({ ...data, currentAmount: 0 });
          setSavingsGoals(prev => [...prev, newGoal]);
      }
  };

  const handleDeleteGoal = async (id: string) => {
      await api.deleteSavingsGoal(id);
      setSavingsGoals(prev => prev.filter(g => g.id !== id));
  };

  const handleSaveBudget = async (data: Omit<Budget, 'id'> | Budget) => {
      if ('id' in data) {
          const updated = await api.updateBudget(data);
          setBudgets(prev => prev.map(b => b.id === updated.id ? updated : b));
      } else {
          const newBudget = await api.addBudget(data);
          setBudgets(prev => [...prev, newBudget]);
      }
  };

  const handleDeleteBudget = async (id: string) => {
      await api.deleteBudget(id);
      setBudgets(prev => prev.filter(b => b.id !== id));
  };

  // --- DEBT HANDLERS ---
  
  const handleSaveDebt = async ( data: Omit<Debt, 'id'> | Debt, createInitialTransaction: boolean = false, accountId?: string ) => {
      try {
        let savedDebt: Debt;
        if ('id' in data) {
            savedDebt = await api.updateDebt(data);
            setDebts(prev => prev.map(d => d.id === savedDebt.id ? savedDebt : d));
        } else {
            savedDebt = await api.addDebt(data);
            setDebts(prev => [...prev, savedDebt]);
        }
        if (createInitialTransaction && !('id' in data) && accountId) {
            const txType = getDebtTransactionType(savedDebt.type, true); 
            const txCategory = getDebtTransactionCategory(savedDebt.type, true);
            const newTxData: Omit<Transaction, 'id'> = {
                accountId: accountId,
                amount: savedDebt.amount,
                currency: savedDebt.currency,
                date: savedDebt.date,
                name: `Debt: ${savedDebt.person}`,
                type: txType,
                category: txCategory,
                debtId: savedDebt.id,
                description: savedDebt.description || 'Initial debt record'
            };
            // Здесь мы не вызываем handleAddTransaction, чтобы избежать рекурсии или двойного обновления,
            // вызываем api напрямую. Но нужно помнить, что эта транзакция увеличит долг.
            // api.addDebt создает долг с current_amount = amount.
            // api.addTransaction создаст запись.
            // Мы должны обновить initial_transaction_id у долга.
            
            // ВАЖНО: Если мы создали долг с полным amount, то эта транзакция (Lending)
            // не должна увеличивать его еще раз.
            // В текущей логике handleAddTransaction увеличивает долг для Lending.
            // Здесь мы вызываем api.addTransaction напрямую, поэтому updateDebtBalance НЕ вызывается.
            // Это правильно, так как amount уже учтен в самом объекте Debt при создании.
            
            const newTx = await api.addTransaction(newTxData);
            setTransactions(prev => [newTx, ...prev]);
            const debtWithLink = await api.updateDebt({ ...savedDebt, initial_transaction_id: newTx.id });
            setDebts(prev => prev.map(d => d.id === debtWithLink.id ? debtWithLink : d));
        }
      } catch (e: any) {
          setDataError(e.message);
          throw e;
      }
  };

  const handleDeleteDebt = async (id: string) => {
      try {
          await api.deleteDebt(id);
          setDebts(prev => prev.filter(d => d.id !== id));
      } catch (e: any) {
          setDataError(e.message);
          throw e;
      }
  };

  const handleArchiveDebt = async (id: string) => {
      try {
          const updated = await api.archiveDebt(id);
          setDebts(prev => prev.map(d => d.id === updated.id ? updated : d));
      } catch (e: any) {
          setDataError(e.message);
          throw e;
      }
  };

   const updateDefaultCurrency = async (currency: string) => {
      if (!user) return;
      try {
          await api.updateDefaultCurrency(user.id, currency);
          await refreshUserProfile();
          const newRates = await getExchangeRates();
          setRates(newRates);
      } catch (e: any) {
          setDataError(e.message);
          throw e;
      }
  };

  return (
    <AppDataContext.Provider value={{
        transactions, accounts, categories, savingsGoals, budgets, debts, debtCategories, rates, isDataLoading, dataError,
        displayCurrency, totalBalance, totalSavings, summary, daysActive,
        refreshData: loadData,
        handleAddTransaction, handleUpdateTransaction, handleDeleteTransaction,
        handleSaveAccount, handleDeleteAccount,
        handleSaveCategory, handleDeleteCategory,
        handleSaveGoal, handleDeleteGoal,
        handleSaveBudget, handleDeleteBudget,
        handleSaveDebt, handleDeleteDebt, handleArchiveDebt,
        updateDefaultCurrency,
        selectedAccountId, setSelectedAccountId
    }}>
      {children}
    </AppDataContext.Provider>
  );
};