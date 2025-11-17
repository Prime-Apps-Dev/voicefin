// src/App.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Eye, EyeOff } from 'lucide-react';
import * as api from './services/api';
import { supabase } from './services/supabase';
// Импорты типов
import { Transaction, TransactionType, Account, ExchangeRates, User, SavingsGoal, Budget, Category } from './types';
// Импорты компонентов
import { TransactionList } from './components/TransactionList';
import { TransactionForm } from './components/TransactionForm';
import { ProfileScreen } from './components/ProfileScreen';
import { SavingsScreen } from './components/SavingsScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { BottomNavBar } from './components/BottomNavBar';
import { AccountList } from './components/AccountList';
import { FinancialOverview } from './components/FinancialOverview';
import { RecordingOverlay } from './components/RecordingOverlay';
import { ConfirmationModal } from './components/ConfirmationModal';
import { TextInputModal } from './components/TextInputModal';
import { AccountsScreen } from './components/AccountsScreen';
import { AccountForm } from './components/AccountForm';
import { AccountActionsModal } from './components/AccountActionsModal';
import { SavingsGoalForm } from './components/SavingsGoalForm';
import { GoalTransactionsModal } from './components/GoalTransactionsModal';
import { BudgetPlanningScreen } from './components/BudgetPlanningScreen';
import { BudgetForm } from './components/BudgetForm';
import { BudgetTransactionsModal } from './components/BudgetTransactionsModal';
import { CategoriesScreen } from './components/CategoriesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CategoryForm } from './components/CategoryForm';
import { ComingSoonScreen } from './components/ComingSoonScreen';
import { TransactionHistoryScreen } from './components/TransactionHistoryScreen';
import { OnboardingGuide } from './components/OnboardingGuide';
import { LoadingScreen } from './components/LoadingScreen'; 
import { AboutScreen } from './components/AboutScreen'; 

// Импорты утилит и сервисов
import { getExchangeRates, convertCurrency } from './services/currency';
import { useLocalization } from './context/LocalizationContext';

// --- КОНСТАНТА ДЛЯ ОТСТУПА TELEGRAM MINI APP ---
const TG_HEADER_OFFSET_CLASS = 'pt-[85px]';

// --- КОМПОНЕНТ: ФОРМА ЛОГИНА ДЛЯ РАЗРАБОТКИ ---
const DevLoginForm: React.FC<{
  onSubmit: (email: string, pass: string) => Promise<void>;
  error: string | null;
  isLoading: boolean;
}> = ({ onSubmit, error, isLoading }) => {
  const [email, setEmail] = useState('test@example.com'); 
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const { t } = useLocalization();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-8 bg-gray-800 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-center text-white mb-2">
          VoiceFin
        </h1>
        <p className="text-center text-brand-purple mb-6 text-sm font-medium">
          {t('devLoginTitle')}
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-400 block mb-2" htmlFor="email">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-purple"
              placeholder="user@supabase.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400 block mb-2" htmlFor="password">
              {t('password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-purple"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-green text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
            ) : (
              t('login')
            )}
          </button>
        </form>
      </div>
    </div>
  );
};


// --- App State & Backend Interaction ---
const App: React.FC = () => {
  const { t, language } = useLocalization();

  // App State
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState<string>('DEFAULT');
  const [rates, setRates] = useState<ExchangeRates>({});

  // Состояние пользователя (из Supabase/Telegram)
  const [tgUser, setTgUser] = useState<User | null>(null);

  // UI State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [transcription, setTranscription] = useState('');
  const [potentialTransaction, setPotentialTransaction] = useState<Omit<Transaction, 'id'> | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [savingsTips, setSavingsTips] = useState<string | null>(null);
  const [isGeneratingTips, setIsGeneratingTips] = useState(false);
  
  const [activeScreen, setActiveScreen] = useState<'home' | 'savings' | 'analytics' | 'profile' | 'accounts' | 'budgetPlanning' | 'categories' | 'settings' | 'comingSoon' | 'history' | 'about'>('home');
  const [error, setError] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [itemToDelete, setItemToDelete] = useState<Transaction | { type: 'category'; value: Category } | { type: 'account', value: Account } | { type: 'savingsGoal', value: SavingsGoal } | { type: 'budget', value: Budget } | null>(null);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [isProcessingText, setIsProcessingText] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountForActions, setAccountForActions] = useState<Account | null>(null);
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalForDeposit, setGoalForDeposit] = useState<SavingsGoal | null>(null);
  const [goalForHistory, setGoalForHistory] = useState<SavingsGoal | null>(null);
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Partial<Budget> | null>(null);
  const [budgetForHistory, setBudgetForHistory] = useState<Budget | null>(null);
  const [isCategoryLockedInForm, setIsCategoryLockedInForm] = useState(false);
  const [carryOverInfo, setCarryOverInfo] = useState<{ from: string, to: string } | null>(null);
  const [categoryFormState, setCategoryFormState] = useState<{ isOpen: boolean; category: Category | null; context?: { type: TransactionType; from?: 'budget' } }>({ isOpen: false, category: null });
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // UI-состояния для блокировки и Dev-логина
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false); 

  const [isAppExpanded, setIsAppExpanded] = useState(false); 
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);

  // Refs для записи аудио
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);


  // --- ФУНКЦИЯ ЗАГРУЗКИ ДАННЫХ ---
  const loadAppData = async (authUserId: string, teleUser?: { first_name?: string }) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (profileError) {
        throw new Error(`Не удалось загрузить профиль пользователя: ${profileError.message}`);
      }

      const appUser: User = {
          id: authUserId,
          email: profileData.email,
          name: profileData.full_name || teleUser?.first_name || profileData.username || 'User',
          updated_at: profileData.updated_at,
          username: profileData.username,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          telegram_id: profileData.telegram_id,
          has_completed_onboarding: profileData.has_completed_onboarding,
          default_currency: profileData.default_currency || 'USD'
      };
      
      setTgUser(appUser);

      if (profileData.default_currency) {
        setDefaultCurrency(profileData.default_currency);
      } else if (defaultCurrency === 'DEFAULT') {
        setDefaultCurrency('USD');
      }

      if (!appUser.has_completed_onboarding) {
          setShowOnboarding(true);
      }
      
      const [exchangeRates, initialData] = await Promise.all([
        getExchangeRates(),
        api.initializeUser(),
      ]);
      
      setRates(exchangeRates);
      setTransactions(initialData.transactions);
      setAccounts(initialData.accounts);
      setCategories(initialData.categories);
      setSavingsGoals(initialData.savingsGoals);
      setBudgets(initialData.budgets);

    } catch (err: any) {
      console.error("Data loading failed:", err);
      setError(`Failed to load app data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  // --- ХУК АУТЕНТИФИКАЦИИ ---
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    
    // @ts-ignore
    const tg = window.Telegram.WebApp;

    const handleViewportChange = () => {
      if (tg) {
        setIsAppExpanded(tg.isExpanded);
        setIsAppFullscreen(tg.isFullscreen || false); 
      }
    };

    const startApp = async () => {
      try {
        if (isDev) {
          console.log('DEV MODE: Checking Supabase session...');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('DEV MODE: Session found. Loading app data...');
            await loadAppData(session.user.id, { first_name: 'Dev' });
          } else {
            console.log('DEV MODE: No session. Showing dev login form.');
            setIsDevLoggingIn(true);
            setIsLoading(false);
          }

        } else {
          if (!tg) {
              throw new Error(t('telegramErrorNotTelegram'));
          }
          if (!tg.initData) {
              throw new Error(t('telegramErrorNoData'));
          }
          
          tg.ready();
          tg.expand();
          if (tg.requestFullscreen) {
            tg.requestFullscreen();
          }

          tg.onEvent('viewportChanged', handleViewportChange);
          handleViewportChange();

          const authResponse = await api.authenticateWithTelegram(tg.initData);
          if (!authResponse || !authResponse.token || !authResponse.user) {
              throw new Error("Invalid auth response from server");
          }

          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: authResponse.token,
            refresh_token: authResponse.token,
          });

          if (sessionError) {
            throw new Error(`Failed to set session: ${sessionError.message}`);
          }
          if (!sessionData || !sessionData.user) {
            throw new Error("Auth session missing after setSession!");
          }
          
          await loadAppData(sessionData.user.id, authResponse.user);
        }

      } catch (err: any) {
        console.error("Initialization failed:", err);
        const errorMsg = (err instanceof Error) ? err.message : String(err);
        
        if (errorMsg === t('telegramErrorNotTelegram') || errorMsg === t('telegramErrorNoData')) {
            setBlockMessage(errorMsg);
            setIsBlocked(true);
        } else {
            setError(`Failed to load app data: ${errorMsg}`);
        }
        setIsLoading(false);
      }
    };

    startApp();

    return () => {
      if (tg) {
        tg.offEvent('viewportChanged', handleViewportChange);
      }
    };

  }, [t]);
  

  const handleDevLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      if (!data.user) throw new Error("Login successful but no user data returned.");
      
      await loadAppData(data.user.id, { first_name: 'Dev' });
      setIsDevLoggingIn(false);
      
    } catch (err: any) {
      console.error("Dev login failed:", err);
      setError(err.message || t('loginError'));
      setIsLoading(false);
    }
  };

  
  // --- РАСЧЕТЫ (ИСПРАВЛЕНО ДЛЯ ПЕРЕВОДОВ) ---
  const displayCurrency = useMemo(() => defaultCurrency === 'DEFAULT' ? 'USD' : defaultCurrency, [defaultCurrency]);

  // 1. Фильтрация транзакций
  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    // ИСПРАВЛЕНИЕ: Показываем транзакцию, если выбранный счет является ИСТОЧНИКОМ или НАЗНАЧЕНИЕМ
    return transactions.filter(tx => tx.accountId === selectedAccountId || tx.toAccountId === selectedAccountId);
  }, [transactions, selectedAccountId]);
  
  // 2. Расчет ОБЩЕГО баланса (Net Worth)
  const totalBalance = useMemo(() => {
    return transactions.reduce((balance, tx) => {
      const amountInDefaultCurrency = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
      
      // ИСПРАВЛЕНИЕ: Переводы между своими счетами не меняют общий баланс
      if (tx.type === TransactionType.TRANSFER) {
          return balance; 
      }

      return balance + (tx.type === TransactionType.INCOME ? amountInDefaultCurrency : -amountInDefaultCurrency);
    }, 0);
  }, [transactions, rates, displayCurrency]);

  const totalSavings = useMemo(() => {
    return savingsGoals.reduce((total, goal) => {
        const goalCurrency = goal.currency || displayCurrency;
        const amountInDefaultCurrency = convertCurrency(goal.currentAmount, goalCurrency, displayCurrency, rates);
        return total + amountInDefaultCurrency;
    }, 0);
  }, [savingsGoals, rates, displayCurrency]);
  
  // 3. Расчет статистики и баланса выбранного счета
  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    // Считаем доходы/расходы только для отображения статистики
    for (const tx of filteredTransactions) {
      const txDate = new Date(tx.date);
      // Статистика учитывает только этот месяц
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        const amountInDefaultCurrency = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
        
        if (tx.type === TransactionType.INCOME) {
          monthlyIncome += amountInDefaultCurrency;
        } else if (tx.type === TransactionType.EXPENSE) {
          monthlyExpense += amountInDefaultCurrency;
        }
        // Переводы (TRANSFER) не включаем в статистику доходов/расходов
      }
    }
    
    // Считаем текущий баланс (Всех счетов или выбранного)
    const selectedBalance = filteredTransactions.reduce((balance, tx) => {
       const amountInDefaultCurrency = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
       
       if (tx.type === TransactionType.INCOME) {
           return balance + amountInDefaultCurrency;
       } 
       else if (tx.type === TransactionType.EXPENSE) {
           return balance - amountInDefaultCurrency;
       }
       else if (tx.type === TransactionType.TRANSFER) {
           // Логика для переводов
           if (selectedAccountId === 'all') {
               // Если смотрим "Все счета", внутренний перевод не меняет сумму
               return balance;
           } else {
               // Если смотрим конкретный счет:
               if (tx.accountId === selectedAccountId) {
                   // Если мы отправитель - вычитаем
                   return balance - amountInDefaultCurrency;
               } else if (tx.toAccountId === selectedAccountId) {
                   // Если мы получатель - прибавляем
                   return balance + amountInDefaultCurrency;
               }
           }
       }
       return balance;
    }, 0)

    return { monthlyIncome, monthlyExpense, selectedBalance };
  }, [filteredTransactions, rates, displayCurrency, selectedAccountId]); // Добавил selectedAccountId в зависимости

  const daysActive = useMemo(() => {
    if (transactions.length === 0) return 1;
    const firstDate = new Date(transactions[transactions.length - 1].date);
    const diffTime = new Date().getTime() - firstDate.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [transactions]);
  

  // --- Handlers for Data Mutation ---

  const handleConfirmTransaction = async (transactionData: Omit<Transaction, 'id'> | Transaction) => {
    try {
      if (transactionData.category && !categories.some(c => c.name.toLowerCase() === transactionData.category.toLowerCase())) {
          const iconName = await api.getIconForCategory(transactionData.category);
          const newCategoryData: Omit<Category, 'id'> = {
              name: transactionData.category,
              icon: iconName,
              isFavorite: false,
              isDefault: false,
              type: transactionData.type,
          };
          const newCategory = await api.addCategory(newCategoryData);
          setCategories(prev => [...prev, newCategory]);
      }

      const originalTransaction = 'id' in transactionData ? transactions.find(t => t.id === transactionData.id) : null;
      const currentGoalId = (transactionData as Transaction).goalId; 

      if (currentGoalId || originalTransaction?.goalId) {
          setSavingsGoals(prevGoals => prevGoals.map(g => {
              let newCurrentAmount = g.currentAmount;
              if (originalTransaction?.goalId === g.id) {
                  newCurrentAmount -= convertCurrency(originalTransaction.amount, originalTransaction.currency, g.currency, rates);
              }
              if (currentGoalId === g.id && transactionData.type === TransactionType.EXPENSE) {
                  newCurrentAmount += convertCurrency(transactionData.amount, transactionData.currency, g.currency, rates);
              }
              return { ...g, currentAmount: Math.max(0, newCurrentAmount) };
          }));
      }

      if ('id' in transactionData) {
        const updatedTx = await api.updateTransaction(transactionData);
        setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
      } else {
        const newTx = await api.addTransaction(transactionData);
        setTransactions(prev => [newTx, ...prev]);
      }
    
    } catch (err: any) {
        console.error("Transaction save failed:", err);
        setError(err.message || t('connectionError'));
    } finally {
        setPotentialTransaction(null);
        setEditingTransaction(null);
        setGoalForDeposit(null);
        setIsCategoryLockedInForm(false);
    }
  };

  const handleTextTransactionSubmit = async (inputText: string) => {
    if (!inputText.trim()) return;
    setIsProcessingText(true);
    setError(null);
    try {
        const newTransaction = await api.parseTransactionFromText(
          inputText,
          displayCurrency,
          categories,
          savingsGoals,
          language
        );

        setPotentialTransaction({
            ...newTransaction,
            accountId: newTransaction.accountId || accounts[0].id,
        });
        setTextInputValue('');
    } catch (err: any) {
        console.error('Failed to process text transaction:', err);
        setError(err.message || t('connectionError'));
    } finally {
        setIsProcessingText(false);
        setIsTextInputOpen(false);
    }
  };
  
  const handleGenerateSavingsTips = async () => {
    setIsGeneratingTips(true);
    setSavingsTips(null);
    try {
        const tips = await api.generateSavingsTips(transactions);
        setSavingsTips(tips);
    } catch (error: any) {
        console.error("Failed to generate tips:", error);
        setSavingsTips("Sorry, could not generate tips right now: " + error.message);
    } finally {
        setIsGeneratingTips(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete && 'value' in itemToDelete) {
          const { type, value } = itemToDelete as { type: string, value: { id: string, name?: string, category?: string } }; 
          
          switch(type) {
              case 'account':
                  await api.deleteAccount(value.id);
                  setAccounts(prev => prev.filter(a => a.id !== value.id));
                  // ИСПРАВЛЕНИЕ: Удаляем транзакции, где этот счет был или отправителем, или получателем
                  setTransactions(prev => prev.filter(tx => tx.accountId !== value.id && tx.toAccountId !== value.id));
                  if(selectedAccountId === value.id) setSelectedAccountId('all');
                  break;
              case 'category':
                  await api.deleteCategory(value.id);
                  setCategories(prev => prev.filter(c => c.id !== value.id));
                  break;
              case 'savingsGoal':
                  await api.deleteSavingsGoal(value.id);
                  setSavingsGoals(prev => prev.filter(g => g.id !== value.id));
                  break;
              case 'budget':
                  await api.deleteBudget(value.id);
                  setBudgets(prev => prev.filter(b => b.id !== value.id));
                  break;
          }
      } else { 
          const transactionToDelete = itemToDelete as Transaction;
          
          if (transactionToDelete.goalId && transactionToDelete.type === TransactionType.EXPENSE) {
             setSavingsGoals(prevGoals => prevGoals.map(g => {
                if (g.id === transactionToDelete.goalId) {
                    const amountInGoalCurrency = convertCurrency(transactionToDelete.amount, transactionToDelete.currency, g.currency, rates);
                    return { ...g, currentAmount: Math.max(0, g.currentAmount - amountInGoalCurrency) };
                }
                return g;
             }));
          }

          await api.deleteTransaction(transactionToDelete.id);
          setTransactions(prev => prev.filter(t => t.id !== transactionToDelete.id));
      }
    } catch (err: any) {
       console.error("Delete failed:", err);
       setError(err.message);
    }
    
    setItemToDelete(null);
  };

  const handleSaveCategory = async (categoryData: Omit<Category, 'id'> | Category) => {
    try {
        let savedCategory: Category;
        if ('id' in categoryData) {
            savedCategory = await api.updateCategory(categoryData);
            setCategories(prev => prev.map(cat => cat.id === savedCategory.id ? savedCategory : cat));
        } else {
            savedCategory = await api.addCategory({ ...categoryData, isDefault: false });
            setCategories(prev => [...prev, savedCategory]);
        }
        if (categoryFormState.context?.from === 'budget') {
            setEditingBudget(prev => ({...prev, category: savedCategory.name, icon: savedCategory.icon}));
        }
    } catch (err: any) {
        console.error("Category save failed:", err);
        setError(err.message || t('connectionError'));
    } finally {
        setCategoryFormState({ isOpen: false, category: null });
    }
  };
  
  const handleSaveAccount = async (accountData: Omit<Account, 'id'> | Account) => {
    try {
        if ('id' in accountData) {
            const updated = await api.updateAccount(accountData);
            setAccounts(prev => prev.map(acc => acc.id === updated.id ? updated : acc));
        } else {
            const newAcc = await api.addAccount(accountData);
            setAccounts(prev => [...prev, newAcc]);
        }
    } catch (err: any) {
        console.error("Account save failed:", err);
        setError(err.message || t('connectionError'));
    } finally {
        setIsAccountFormOpen(false);
        setEditingAccount(null);
    }
  };
  
  const handleSaveGoal = async (goalData: Omit<SavingsGoal, 'id'> | SavingsGoal) => {
    try {
        if ('id' in goalData) {
            const updated = await api.updateSavingsGoal(goalData);
            setSavingsGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
        } else {
            const newGoal = await api.addSavingsGoal({ ...goalData, currentAmount: 0 });
            setSavingsGoals(prev => [...prev, newGoal]);
        }
    } catch (err: any) {
        console.error("Goal save failed:", err);
        setError(err.message || t('connectionError'));
    } finally {
        setIsGoalFormOpen(false);
        setEditingGoal(null);
    }
  };

  const handleSaveBudget = async (budgetData: Omit<Budget, 'id'> | Budget) => {
    try {
        if ('id' in budgetData) {
            const updated = await api.updateBudget(budgetData);
            setBudgets(prev => prev.map(b => b.id === updated.id ? updated : b));
        } else {
            const newBudget = await api.addBudget(budgetData);
            setBudgets(prev => [...prev, newBudget]);
        }
    } catch (err: any) {
        console.error("Budget save failed:", err);
        setError(err.message || t('connectionError'));
    } finally {
        setIsBudgetFormOpen(false);
        setEditingBudget(null);
    }
  };


  const handleSetDefaultCurrency = async (currency: string) => {
    if (!tgUser) {
        setError(t('userNotAuthenticated'));
        throw new Error("User not authenticated for currency update.");
    }
    
    setError(null);
    try {
        await api.updateDefaultCurrency(tgUser.id, currency); 

        setDefaultCurrency(currency);
        
        setTgUser(prev => prev ? ({ ...prev, default_currency: currency }) : null); 

        const exchangeRates = await getExchangeRates();
        setRates(exchangeRates);
        
        console.log(`Default currency updated to: ${currency}`);
    } catch (err: any) {
        console.error("Failed to update default currency:", err);
        setError(err.message || t('connectionError'));
        throw err; 
    }
  };


  // --- Audio Recording Handlers ---
  const handleStartRecording = async () => {
    if (isRecording) return;
    
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream); 
      setIsRecording(true);
      
      const mimeType = [
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm',
          'audio/mp4',
        ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
        
      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = []; 

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = handleRecordingStop;

      recorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(t('micError'));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); 
    }
    setIsRecording(false);
    setIsProcessing(true); 
  };

  const handleRecordingStop = async () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null); 

    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    audioChunksRef.current = [];
    
    try {
      const newTransaction = await api.processAudioTransaction(
        audioBlob,
        categories,
        savingsGoals,
        language
      );
      setPotentialTransaction({
          ...newTransaction,
          accountId: newTransaction.accountId || accounts[0].id,
      });
    } catch (err: any) {
      console.error('Failed to process audio:', err);
      setError(err.message || t('connectionError'));
    } finally {
      setIsProcessing(false); 
    }
  };

  
  // --- UI Handlers ---
  const handleCancelTransaction = () => {
    setPotentialTransaction(null);
    setEditingTransaction(null);
    setGoalForDeposit(null);
    setIsCategoryLockedInForm(false);
  };
  
  const handleFinishOnboarding = async () => {
    setShowOnboarding(false); 
    if (tgUser) {
        try {
            await api.markOnboardingAsCompleted(tgUser.id);
            setTgUser(prevUser => prevUser ? ({ ...prevUser, has_completed_onboarding: true }) : null);
        } catch (err) {
            console.error("Не удалось обновить статус онбординга:", err);
        }
    }
  };

  const handleShowOnboarding = () => {
    setShowOnboarding(true);
  };


  // --- Render Logic ---
  const globalStyle = `
    .min-h-screen, 
    .min-h-screen * { 
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }

    input[type="text"], 
    input[type="number"], 
    input[type="email"], 
    input[type="password"], 
    input:not([type]),
    textarea,
    .text-input-field {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
    }
    
    @media (hover: none) {
      a:hover, 
      button:hover, 
      input:hover,
      .hover\\:bg-*,
      .hover\\:text-*,
      .hover\\:opacity-*,
      .hover\\:shadow-*,
      .hover\\:border-*,
      .group:hover .group-hover\\:*,
      .peer:hover ~ .peer-hover\\:*
      {
        color: inherit !important;
        background-color: inherit !important;
        opacity: 1 !important;
        box-shadow: none !important;
        border-color: inherit !important;
        transform: none !important;
        transition-property: none !important;
        cursor: default !important;
        text-decoration: none !important;
      }
    }
  `;
  
  const renderContent = () => {
    switch (activeScreen) {
      case 'savings': return (
        <SavingsScreen 
          goals={savingsGoals} 
          onAddGoal={() => setIsGoalFormOpen(true)} 
          onAddToGoal={(goal) => { 
            setGoalForDeposit(goal); 
            setPotentialTransaction({ accountId: accounts[0].id, name: `Deposit to "${goal.name}"`, amount: 0, currency: displayCurrency, category: 'Savings', date: new Date().toISOString(), type: TransactionType.EXPENSE, goalId: goal.id }); 
          }} 
          onViewGoalHistory={setGoalForHistory} 
          onEditGoal={(goal) => { setEditingGoal(goal); setIsGoalFormOpen(true); }} 
          onDeleteGoal={(goal) => setItemToDelete({ type: 'savingsGoal', value: goal })} 
        />
      );
      case 'analytics': return (
        <AnalyticsScreen 
          transactions={transactions} 
          savingsGoals={savingsGoals} 
          defaultCurrency={displayCurrency} 
          rates={rates} 
        />
      );
      case 'profile': return (
        <ProfileScreen 
          user={tgUser || { 
              id: '...', 
              email: '...', 
              name: 'User', 
              updated_at: null, 
              username: null, 
              full_name: null, 
              avatar_url: null, 
              telegram_id: null, 
              has_completed_onboarding: true,
              default_currency: 'USD' 
          }}
          daysActive={daysActive} 
          onNavigate={setActiveScreen} 
        />
      );
      case 'accounts': return (
        <AccountsScreen 
          accounts={accounts} 
          transactions={transactions} 
          rates={rates} 
          onBack={() => setActiveScreen('profile')} 
          onOpenAddForm={() => { setEditingAccount(null); setIsAccountFormOpen(true); }} 
          onOpenActions={setAccountForActions} 
        />
      );
      case 'categories': return (
        <CategoriesScreen 
          categories={categories} 
          onBack={() => setActiveScreen('profile')} 
          onCreateCategory={(type) => setCategoryFormState({ isOpen: true, category: null, context: { type } })} 
          onEditCategory={(cat) => setCategoryFormState({ isOpen: true, category: cat })} 
          onDeleteCategory={(cat) => setItemToDelete({ type: 'category', value: cat })} 
          onToggleFavorite={(cat) => handleSaveCategory({ ...cat, isFavorite: !cat.isFavorite })} 
        />
      );
      case 'settings': return (
        <SettingsScreen 
          onBack={() => setActiveScreen('profile')} 
          defaultCurrency={defaultCurrency} 
          onSetDefaultCurrency={handleSetDefaultCurrency}
          onShowOnboarding={handleShowOnboarding}
        />
      );
      case 'about': return (
        <AboutScreen 
          onBack={() => setActiveScreen('profile')} 
        />
      );
      case 'budgetPlanning': return (
        <BudgetPlanningScreen 
          budgets={budgets} 
          transactions={transactions} 
          categories={categories} 
          onBack={() => setActiveScreen('profile')} 
          onAddBudget={(monthKey) => { setEditingBudget({ monthKey, currency: displayCurrency }); setIsBudgetFormOpen(true); }} 
          onEditBudget={(budget) => { setEditingBudget(budget); setIsBudgetFormOpen(true); }} 
          onDeleteBudget={(budget) => setItemToDelete({ type: 'budget', value: budget })} 
          onAddTransaction={(budget) => { 
            setIsCategoryLockedInForm(true); 
            setPotentialTransaction({ accountId: accounts[0].id, name: '', amount: 0, currency: displayCurrency, category: budget.category, date: new Date().toISOString(), type: TransactionType.EXPENSE }); 
          }} 
          onViewHistory={setBudgetForHistory} 
          onCarryOver={(from, to) => setCarryOverInfo({ from, to })} 
          rates={rates} 
          defaultCurrency={displayCurrency} 
        />
      );
      case 'history': return (
        <TransactionHistoryScreen 
          transactions={transactions} 
          accounts={accounts} 
          categories={categories} 
          rates={rates} 
          defaultCurrency={displayCurrency} 
          onSelectTransaction={setEditingTransaction} 
          onDeleteTransaction={(tx) => setItemToDelete(tx)} 
          onBack={() => setActiveScreen('home')} 
        />
      );
      case 'comingSoon': return (
        <ComingSoonScreen onBack={() => setActiveScreen('profile')} />
      );
      case 'home': default: return (
        <main className="max-w-4xl mx-auto flex flex-col gap-4 pb-32"> 
          <AccountList 
            accounts={accounts} 
            transactions={transactions} 
            rates={rates} 
            selectedAccountId={selectedAccountId} 
            onSelectAccount={setSelectedAccountId} 
            totalBalance={totalBalance} 
            defaultCurrency={displayCurrency} 
          /> 
          <FinancialOverview 
            monthlyIncome={summary.monthlyIncome} 
            monthlyExpense={summary.monthlyExpense} 
            totalBalance={summary.selectedBalance} 
            totalSavings={totalSavings} 
            defaultCurrency={displayCurrency} 
            onNavigate={setActiveScreen} 
            onGenerateTips={handleGenerateSavingsTips} 
          /> 
          <div className="px-6"> 
            <TransactionList 
              transactions={filteredTransactions} 
              accounts={accounts} 
              onSelectTransaction={setEditingTransaction} 
              onDeleteTransaction={(tx) => setItemToDelete(tx)} 
              onViewAll={() => setActiveScreen('history')} 
              rates={rates} 
              // ПЕРЕДАЕМ ВСЕ СЧЕТА, ЧТОБЫ ЭЛЕМЕНТ СПИСКА МОГ НАЙТИ ИМЯ ПОЛУЧАТЕЛЯ
              allAccounts={accounts}
            /> 
          </div> 
          {error && !isDevLoggingIn && <p className="text-center text-red-500 mt-2 px-6" onClick={() => setError(null)}>{error}</p>} 
        </main> 
      );
    }
  }


  if (isDevLoggingIn) {
      return (
          <DevLoginForm 
              onSubmit={handleDevLogin} 
              error={error} 
              isLoading={isLoading}
          />
      );
  }

  if (isBlocked) {
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center p-6">
            <div className="text-red-500 mb-6">
                <AlertTriangle className="w-16 h-16" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t('error')}</h1>
            <p className="text-lg text-gray-300 max-w-sm">{blockMessage}</p>
            <p className="text-sm text-gray-500 mt-6 max-w-sm">{t('telegramErrorHint')}</p>
        </div>
    );
  }

  const isDev = import.meta.env.DEV;

  let paddingTopClass = '';
  let showMask = false;
  
  if (!isDev) {
    if (isAppFullscreen) {
      paddingTopClass = TG_HEADER_OFFSET_CLASS;
      showMask = true;

    } else if (isAppExpanded) {
      paddingTopClass = '';
      showMask = false;
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-900">

      <style>{globalStyle}</style>
      
      <LoadingScreen isLoading={isLoading && !isDevLoggingIn} />

      <AnimatePresence>
        {showOnboarding && <OnboardingGuide onFinish={handleFinishOnboarding} />}
      </AnimatePresence>

      {showMask && (
        <div className="fixed top-0 left-0 right-0 h-[85px] bg-gray-900 z-20"></div>
      )}

      {!isLoading && (
        <div className={paddingTopClass}>
          {renderContent()}
        </div>
      )}


      {isRecording && (
        <RecordingOverlay 
          transcription={transcription}
          stream={stream} 
          onStop={handleStopRecording} 
          isRecording={isRecording}
          audioContext={audioCtxRef.current} 
        />
      )}
      
      {(potentialTransaction || editingTransaction) && (
        <TransactionForm
          transaction={potentialTransaction || editingTransaction!}
          categories={categories}
          accounts={accounts}
          savingsGoals={savingsGoals}
          onConfirm={handleConfirmTransaction}
          onCancel={handleCancelTransaction}
          isSavingsDeposit={!!goalForDeposit}
          goalName={goalForDeposit?.name}
          isCategoryLocked={isCategoryLockedInForm}
          budgets={budgets}
          transactions={transactions}
          onCreateBudget={(cat, monthKey) => { setEditingBudget({ monthKey, category: cat, icon: categories.find(c=>c.name===cat)?.icon || 'LayoutGrid', limit: 0, currency: displayCurrency }); setIsBudgetFormOpen(true); }}
          rates={rates}
          defaultCurrency={displayCurrency}
        />
      )}
      
      <AccountForm isOpen={isAccountFormOpen} onClose={() => setIsAccountFormOpen(false)} onSave={handleSaveAccount} account={editingAccount} />
      <SavingsGoalForm isOpen={isGoalFormOpen} onClose={() => { setIsGoalFormOpen(false); setEditingGoal(null); }} onSave={handleSaveGoal} goal={editingGoal} defaultCurrency={displayCurrency} />
      <BudgetForm isOpen={isBudgetFormOpen} onClose={() => { setIsBudgetFormOpen(false); setEditingBudget(null); }} onSave={handleSaveBudget} budget={editingBudget} allCategories={categories} budgetsForMonth={budgets.filter(b => b.monthKey === editingBudget?.monthKey)} onCreateNewCategory={() => setCategoryFormState({ isOpen: true, category: null, context: {type: TransactionType.EXPENSE, from: 'budget'} })} defaultCurrency={displayCurrency} />
      <CategoryForm isOpen={categoryFormState.isOpen} onClose={() => setCategoryFormState({isOpen: false, category: null})} onSave={handleSaveCategory} onDelete={(cat) => setItemToDelete({type: 'category', value: cat})} category={categoryFormState.category} isFavoriteDisabled={!categoryFormState.category?.isFavorite && categories.filter(c => c.isFavorite).length >= 10} categories={categories} />
      <AccountActionsModal isOpen={!!accountForActions} account={accountForActions} onClose={() => setAccountForActions(null)} onAddTransaction={(acc) => { setPotentialTransaction({ accountId: acc.id, name: '', amount: 0, currency: displayCurrency, category: '', date: new Date().toISOString(), type: TransactionType.EXPENSE }); setActiveScreen('home'); setAccountForActions(null); }} onEdit={(acc) => { setEditingAccount(acc); setIsAccountFormOpen(true); setAccountForActions(null); }} onDelete={(acc) => { setItemToDelete({ type: 'account', value: acc }); setAccountForActions(null); }} />
      
      <ConfirmationModal 
        isOpen={!!itemToDelete} 
        onCancel={() => setItemToDelete(null)} 
        onConfirm={handleDeleteItem} 
        title={ itemToDelete ? ('id' in itemToDelete ? t('confirmDeleteTitle') : itemToDelete.type === 'account' ? t('confirmDeleteAccountTitle') : itemToDelete.type === 'savingsGoal' ? t('confirmDeleteGoalTitle') : itemToDelete.type === 'budget' ? t('confirmDeleteBudgetTitle') : t('confirmDeleteCategoryTitle')) : '' } 
        message={ itemToDelete ? ('id' in itemToDelete ? t('confirmDelete', { name: itemToDelete.name }) : itemToDelete.type === 'category' ? t('confirmDeleteCategoryMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'account' ? t('confirmDeleteAccountMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'savingsGoal' ? t('confirmDeleteGoalMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'budget' ? t('confirmDeleteBudgetMessage', { name: itemToDelete.value.category }) : '') : '' } 
      />
      <ConfirmationModal 
        isOpen={!!carryOverInfo} 
        onCancel={() => setCarryOverInfo(null)} 
        onConfirm={() => { 
          if(carryOverInfo) { 
            const prevBudgets = budgets.filter(b => b.monthKey === carryOverInfo.from); 
            prevBudgets.forEach(b => handleSaveBudget({...b, monthKey: carryOverInfo.to})); 
          } 
          setCarryOverInfo(null); 
        }} 
        title={t('carryOverBudgetsTitle')} 
        message={t('carryOverBudgetsMessage')} 
      />
      
      <TextInputModal isOpen={isTextInputOpen} isProcessing={isProcessingText} onClose={() => setIsTextInputOpen(false)} onSubmit={handleTextTransactionSubmit} text={textInputValue} onTextChange={setTextInputValue} />
      {goalForHistory && <GoalTransactionsModal isOpen={!!goalForHistory} onClose={() => setGoalForHistory(null)} goal={goalForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      {budgetForHistory && <BudgetTransactionsModal isOpen={!!budgetForHistory} onClose={() => setBudgetForHistory(null)} budget={budgetForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      
      {!isLoading && (
        <BottomNavBar 
          activeScreen={activeScreen} 
          onNavigate={setActiveScreen} 
          isRecording={isRecording} 
          isProcessing={isProcessing} 
          onToggleRecording={isRecording ? handleStopRecording : handleStartRecording} 
          onLongPressAdd={() => setIsTextInputOpen(true)} 
        />
      )}
    </div>
  );
};

export default App;