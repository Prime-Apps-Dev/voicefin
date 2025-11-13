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

// --- НОВЫЕ ИМПОРТЫ ВЫНЕСЕННЫХ КОМПОНЕНТОВ ---
import { DevLoginForm } from './components/DevLoginForm';
import { HomeScreen } from './components/HomeScreen';

// Импорты утилит и сервисов
import { getExchangeRates, convertCurrency } from './services/currency';
import { useLocalization } from './context/LocalizationContext';

// --- КОНСТАНТА ДЛЯ ОТСТУПА TELEGRAM MINI APP ---
const TG_HEADER_OFFSET_CLASS = 'pt-[85px]';

// --- КОМПОНЕНТ ФОРМЫ ЛОГИНА (DevLoginForm) УДАЛЕН ОТСЮДА ---


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
  const [activeScreen, setActiveScreen] = useState<'home' | 'savings' | 'analytics' | 'profile' | 'accounts' | 'budgetPlanning' | 'categories' | 'settings' | 'comingSoon' | 'history'>('home');
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

  // --- НОВОЕ СОСТОЯНИЕ ДЛЯ ОТСЛЕЖИВАНИЯ РАЗВЕРТЫВАНИЯ ---
  const [isAppExpanded, setIsAppExpanded] = useState(false); 

  // Refs для записи аудио
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);


  // --- НОВАЯ УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЗАГРУЗКИ ДАННЫХ ---
  /**
   * Эта функция вызывается ПОСЛЕ того, как пользователь аутентифицирован
   * (либо через Telegram, либо через Dev-логин).
   * @param authUserId - ID пользователя из Supabase Auth (session.user.id)
   * @param teleUser - Объект пользователя из Telegram (если есть, для имени)
   */
  const loadAppData = async (authUserId: string, teleUser?: { first_name?: string }) => {
    try {
      // 1. Загружаем профиль пользователя из таблицы 'profiles'
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (profileError) {
        throw new Error(`Не удалось загрузить профиль пользователя: ${profileError.message}`);
      }

      // 2. Собираем полный объект User для приложения
      const appUser: User = {
          id: authUserId,
          email: profileData.email, // Предполагаем, что email есть в профиле
          name: profileData.full_name || teleUser?.first_name || profileData.username || 'User',
          updated_at: profileData.updated_at,
          username: profileData.username,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          telegram_id: profileData.telegram_id,
          has_completed_onboarding: profileData.has_completed_onboarding
      };
      
      setTgUser(appUser); // Сохраняем ПОЛНЫЙ объект пользователя в state

      // 3. Проверяем, нужно ли показать онбординг
      if (!appUser.has_completed_onboarding) {
          setShowOnboarding(true);
      }
      
      // 4. Загружаем остальные данные приложения (транзакции, счета и т.д.)
      const [exchangeRates, initialData] = await Promise.all([
        getExchangeRates(),
        api.initializeUser(), // initializeUser теперь просто грузит данные для auth-юзера
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
      setIsLoading(false); // Загрузка завершена (успешно или с ошибкой)
    }
  };


  // --- ОБНОВЛЕННЫЙ ХУК АУТЕНТИФИКАЦИИ И ИНИЦИАЛИЗАЦИИ ---
  useEffect(() => {
    // Vite-переменная, true если `npm run dev`
    const isDev = import.meta.env.DEV;
    
    // @ts-ignore (Наш mock-файл создаст этот объект в dev-режиме)
    const tg = window.Telegram.WebApp;

    // --- НОВЫЙ ОБРАБОТЧИК ДЛЯ VIEWPORT ---
    const handleViewportChange = () => {
      if (tg) {
        // Устанавливаем состояние React в 
        // соответствие с состоянием Telegram
        setIsAppExpanded(tg.isExpanded); 
      }
    };

    const startApp = async () => {
      try {
        if (isDev) {
          // --- 1. DEV PATH (РЕЖИМ РАЗРАБОТКИ) ---
          console.log('DEV MODE: Checking Supabase session...');
          
          // Проверяем, есть ли уже активная сессия в localStorage
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Сессия есть, отлично. Просто загружаем данные.
            console.log('DEV MODE: Session found. Loading app data...');
            await loadAppData(session.user.id, { first_name: 'Dev' });
          } else {
            // Сессии нет. Показываем нашу форму Dev-логина.
            console.log('DEV MODE: No session. Showing dev login form.');
            setIsDevLoggingIn(true);
            setIsLoading(false);
          }

        } else {
          // --- 2. PROD PATH (РЕЖИМ TELEGRAM) ---
          
          // --- ПРОВЕРКА #1: ЗАПУСК В TELEGRAM ---
          if (!tg) {
              throw new Error(t('telegramErrorNotTelegram'));
          }

          // --- ПРОВЕРКА #2: НАЛИЧИЕ ДАННЫХ АУТЕНТИФИКАЦИИ ---
          if (!tg.initData) {
              throw new Error(t('telegramErrorNoData'));
          }
          
          tg.ready();
          tg.expand();

          // --- НОВАЯ ЛОГИКА: ПОДПИСКА НА СОБЫТИЕ ---
          tg.onEvent('viewportChanged', handleViewportChange);
          
          // --- НОВАЯ ЛОГИКА: УСТАНОВКА НАЧАЛЬНОГО ЗНАЧЕНИЯ ---
          // Вызываем один раз при запуске, чтобы 
          // получить актуальное состояние
          handleViewportChange();

          // Шаг 1: Аутентификация через Telegram
          const authResponse = await api.authenticateWithTelegram(tg.initData);
          if (!authResponse || !authResponse.token || !authResponse.user) {
              throw new Error("Invalid auth response from server");
          }

          // Шаг 2: Установка сессии Supabase
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
          
          // Шаг 3: Загрузка данных приложения
          await loadAppData(sessionData.user.id, authResponse.user);
        }

      } catch (err: any) {
        console.error("Initialization failed:", err);
        const errorMsg = (err instanceof Error) ? err.message : String(err);
        
        // Отлавливаем наши "блокирующие" ошибки
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

    // --- НОВАЯ ЛОГИКА: ОЧИСТКА ПОДПИСКИ ---
    return () => {
      if (tg) {
        tg.offEvent('viewportChanged', handleViewportChange);
      }
    };

  }, [t]); // t (перевод) добавлен в зависимости
  

  // --- НОВЫЙ ОБРАБОТЧИК: ЛОГИН В РЕЖИМЕ РАЗРАБОТКИ ---
  const handleDevLogin = async (email: string, password: string) => {
    setIsLoading(true); // Показываем спиннер на кнопке
    setError(null);
    
    try {
      // Пытаемся войти с помощью email/password
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      if (!data.user) throw new Error("Login successful but no user data returned.");
      
      // Успех! Загружаем данные приложения
      await loadAppData(data.user.id, { first_name: 'Dev' });
      
      // Прячем форму логина
      setIsDevLoggingIn(false);
      
    } catch (err: any) {
      console.error("Dev login failed:", err);
      setError(err.message || t('loginError'));
      setIsLoading(false); // Выключаем спиннер (т.к. мы остались на форме)
    }
  };

  
  // --- Memoized Calculations (без изменений) ---
  const displayCurrency = useMemo(() => defaultCurrency === 'DEFAULT' ? 'USD' : defaultCurrency, [defaultCurrency]);

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter(tx => tx.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);
  
  const totalBalance = useMemo(() => {
    return transactions.reduce((balance, tx) => {
      const amountInDefaultCurrency = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
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
  
  const summary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    for (const tx of filteredTransactions) {
      const txDate = new Date(tx.date);
      if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
        const amountInDefaultCurrency = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
        if (tx.type === TransactionType.INCOME) {
          monthlyIncome += amountInDefaultCurrency;
        } else {
          monthlyExpense += amountInDefaultCurrency;
        }
      }
    }
    
    const selectedBalance = filteredTransactions.reduce((balance, tx) => {
       const amountInDefaultCurrency = convertCurrency(tx.amount, tx.currency, displayCurrency, rates);
       return balance + (tx.type === TransactionType.INCOME ? amountInDefaultCurrency : -amountInDefaultCurrency);
    }, 0)

    return { monthlyIncome, monthlyExpense, selectedBalance };
  }, [filteredTransactions, rates, displayCurrency]);

  const daysActive = useMemo(() => {
    if (transactions.length === 0) return 1;
    const firstDate = new Date(transactions[transactions.length - 1].date);
    const diffTime = new Date().getTime() - firstDate.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [transactions]);
  

  // --- Handlers for Data Mutation (без изменений) ---

  const handleConfirmTransaction = async (transactionData: Omit<Transaction, 'id'> | Transaction) => {
    try {
      // 1. (Авто-создание категории, если ее нет)
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

      // 2. (Обновление баланса Копилки, если транзакция к ней привязана)
      const originalTransaction = 'id' in transactionData ? transactions.find(t => t.id === transactionData.id) : null;
      const currentGoalId = (transactionData as Transaction).goalId; 

      if (currentGoalId || originalTransaction?.goalId) {
          setSavingsGoals(prevGoals => prevGoals.map(g => {
              let newCurrentAmount = g.currentAmount;
              if (originalTransaction?.goalId === g.id) {
                  // Отмена старого депозита (при редактировании)
                  newCurrentAmount -= convertCurrency(originalTransaction.amount, originalTransaction.currency, g.currency, rates);
              }
              if (currentGoalId === g.id && transactionData.type === TransactionType.EXPENSE) {
                  // Добавление нового депозита
                  newCurrentAmount += convertCurrency(transactionData.amount, transactionData.currency, g.currency, rates);
              }
              return { ...g, currentAmount: Math.max(0, newCurrentAmount) };
          }));
      }

      // 3. (Сохранение самой транзакции - обновление или создание)
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
        // 4. (Закрытие модальных окон)
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
          // Удаление Счета, Категории, Копилки или Бюджета
          const { type, value } = itemToDelete as { type: string, value: { id: string, name?: string, category?: string } }; 
          
          switch(type) {
              case 'account':
                  await api.deleteAccount(value.id);
                  setAccounts(prev => prev.filter(a => a.id !== value.id));
                  setTransactions(prev => prev.filter(tx => tx.accountId !== value.id));
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
          // Удаление Транзакции
          const transactionToDelete = itemToDelete as Transaction;
          
          // Если транзакция была вкладом в копилку, откатываем баланс копилки
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
    
    setItemToDelete(null); // Закрываем модальное окно
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


  // --- Audio Recording Handlers (без изменений) ---
  const handleStartRecording = async () => {
    if (isRecording) return;
    
    try {
      // 1. (Инициализация AudioContext)
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
      }

      // 2. (Запрос доступа к микрофону)
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream); 
      setIsRecording(true);
      
      // 3. (Выбор кодека)
      const mimeType = [
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm',
          'audio/mp4',
        ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
        
      // 4. (Начало записи)
      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = []; 

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      recorder.onstop = handleRecordingStop; // Указываем, что делать после остановки

      recorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(t('micError'));
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // Это вызовет .onstop и handleRecordingStop
    }
    setIsRecording(false);
    setIsProcessing(true); // Показываем индикатор обработки
  };

  const handleRecordingStop = async () => {
    // 1. (Очистка)
    stream?.getTracks().forEach(track => track.stop());
    setStream(null); 

    // 2. (Сборка аудио-файла)
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    audioChunksRef.current = [];
    
    // 3. (Отправка в API)
    try {
      const newTransaction = await api.processAudioTransaction(
        audioBlob,
        categories,
        savingsGoals,
        language
      );
      // 4. (Показ окна подтверждения)
      setPotentialTransaction({
          ...newTransaction,
          accountId: newTransaction.accountId || accounts[0].id,
      });
    } catch (err: any) {
      console.error('Failed to process audio:', err);
      setError(err.message || t('connectionError'));
    } finally {
      setIsProcessing(false); // Убираем индикатор обработки
    }
  };

  
  // --- UI Handlers (без изменений) ---
  const handleCancelTransaction = () => {
    setPotentialTransaction(null);
    setEditingTransaction(null);
    setGoalForDeposit(null);
    setIsCategoryLockedInForm(false);
  };
  
  // --- ONBOARDING HANDLERS (без изменений) ---
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


  // --- Render Logic (Рендеринг Контента) (ИЗМЕНЕНИЯ ЗДЕСЬ) ---
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
              has_completed_onboarding: true 
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
          onSetDefaultCurrency={setDefaultCurrency}
          onShowOnboarding={handleShowOnboarding}
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
      
      // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
      // Вместо верстки <main>...</main> мы вызываем новый компонент
      case 'home': 
      default: 
        return (
          <HomeScreen
            accounts={accounts}
            transactions={transactions}
            rates={rates}
            selectedAccountId={selectedAccountId}
            onSelectAccount={setSelectedAccountId}
            totalBalance={totalBalance}
            defaultCurrency={displayCurrency}
            summary={summary}
            totalSavings={totalSavings}
            onNavigate={setActiveScreen}
            onGenerateTips={handleGenerateSavingsTips}
            filteredTransactions={filteredTransactions}
            onSelectTransaction={setEditingTransaction}
            onDeleteTransaction={(tx) => setItemToDelete(tx)}
            error={error}
            isDevLoggingIn={isDevLoggingIn}
          />
        );
    }
  }


  // --- ЭКРАН ЗАГРУЗКИ ---
  // (Логика была перенесена в LoadingScreen)

  // --- НОВЫЙ ЭКРАН: ФОРМА ЛОГИНА ДЛЯ РАЗРАБОТКИ ---
  if (isDevLoggingIn) {
      return (
          <DevLoginForm 
              onSubmit={handleDevLogin} 
              error={error} 
              isLoading={isLoading} // Передаем isLoading для спиннера на кнопке
          />
      );
  }

  // --- ЭКРАН БЛОКИРОВКИ (Если не в Telegram и не в Dev-режиме) ---
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

  // --- ОСНОВНОЙ РЕНДЕРИНГ ПРИЛОЖЕНИЯ (ИЗМЕНЕНИЯ ЗДЕСЬ) ---
  const isDev = import.meta.env.DEV;
  
  // --- ДИНАМИЧЕСКАЯ ЛОГИКА ОТСТУПА (ПЕРЕМЕЩЕНА СЮДА) ---
  // Отступ (pt-[85px]) будет применен, ТОЛЬКО если:
  // 1. Мы НЕ в режиме разработки (isDev = false)
  // 2. И приложение развернуто (isAppExpanded = true)
  const headerOffsetClass = !isDev && isAppExpanded ? TG_HEADER_OFFSET_CLASS : '';

  return (
    <div className="min-h-screen bg-gray-900">
      
      {/* --- НОВЫЙ ЭКРАН ЗАГРУЗКИ --- */}
      <LoadingScreen isLoading={isLoading && !isDevLoggingIn} />

      {/* --- РЕНДЕР ONBOARDING (поверх всего) --- */}
      <AnimatePresence>
        {showOnboarding && <OnboardingGuide onFinish={handleFinishOnboarding} />}
      </AnimatePresence>

      {/* --- ИЗМЕНЕННАЯ ЛОГИКА "МАСКИ" (ШИР-МЫ) --- */}
      {/* Эта "маска" (визуальный блок) будет 
        показана при тех же условиях, что и отступ */}
      {!isDev && isAppExpanded && (
        <div className="fixed top-0 left-0 right-0 h-[85px] bg-gray-900 z-20"></div>
      )}

      {/* --- ИЗМЕНЕНИЕ ЗДЕСЬ: ОБЕРТКА ДЛЯ ВСЕХ ЭКРАНОВ --- */}
      {/* Основное содержимое экрана (которое мы выбрали в renderContent) */}
      {!isLoading && (
        // Применяем динмический класс отступа ЗДЕСЬ
        <div className={headerOffsetClass}>
          {renderContent()}
        </div>
      )}

      {/* Оверлей записи аудио (поверх всего) */}
      {isRecording && (
        <RecordingOverlay 
          transcription={transcription}
          stream={stream} 
          onStop={handleStopRecording} 
          isRecording={isRecording}
          audioContext={audioCtxRef.current} 
        />
      )}
      
      {/* Модальное окно/Форма транзакции (поверх всего) */}
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
      
      {/* Остальные модальные окна (поверх всего) */}
      <AccountForm isOpen={isAccountFormOpen} onClose={() => setIsAccountFormOpen(false)} onSave={handleSaveAccount} account={editingAccount} />
      <SavingsGoalForm isOpen={isGoalFormOpen} onClose={() => { setIsGoalFormOpen(false); setEditingGoal(null); }} onSave={handleSaveGoal} goal={editingGoal} defaultCurrency={displayCurrency} />
      <BudgetForm isOpen={isBudgetFormOpen} onClose={() => { setIsBudgetFormOpen(false); setEditingBudget(null); }} onSave={handleSaveBudget} budget={editingBudget} allCategories={categories} budgetsForMonth={budgets.filter(b => b.monthKey === editingBudget?.monthKey)} onCreateNewCategory={() => setCategoryFormState({ isOpen: true, category: null, context: {type: TransactionType.EXPENSE, from: 'budget'} })} defaultCurrency={displayCurrency} />
      <CategoryForm isOpen={categoryFormState.isOpen} onClose={() => setCategoryFormState({isOpen: false, category: null})} onSave={handleSaveCategory} onDelete={(cat) => setItemToDelete({type: 'category', value: cat})} category={categoryFormState.category} isFavoriteDisabled={!categoryFormState.category?.isFavorite && categories.filter(c => c.isFavorite).length >= 10} categories={categories} />
      <AccountActionsModal isOpen={!!accountForActions} account={accountForActions} onClose={() => setAccountForActions(null)} onAddTransaction={(acc) => { setPotentialTransaction({ accountId: acc.id, name: '', amount: 0, currency: displayCurrency, category: '', date: new Date().toISOString(), type: TransactionType.EXPENSE }); setActiveScreen('home'); setAccountForActions(null); }} onEdit={(acc) => { setEditingAccount(acc); setIsAccountFormOpen(true); setAccountForActions(null); }} onDelete={(acc) => { setItemToDelete({ type: 'account', value: acc }); setAccountForActions(null); }} />
      
      {/* Модальные окна подтверждения (поверх всего) */}
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
      
      {/* Модальное окно ввода текста и истории (поверх всего) */}
      <TextInputModal isOpen={isTextInputOpen} isProcessing={isProcessingText} onClose={() => setIsTextInputOpen(false)} onSubmit={handleTextTransactionSubmit} text={textInputValue} onTextChange={setTextInputValue} />
      {goalForHistory && <GoalTransactionsModal isOpen={!!goalForHistory} onClose={() => setGoalForHistory(null)} goal={goalForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      {budgetForHistory && <BudgetTransactionsModal isOpen={!!budgetForHistory} onClose={() => setBudgetForHistory(null)} budget={budgetForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      
      {/* Нижняя навигационная панель (поверх всего) */}
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