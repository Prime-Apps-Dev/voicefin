import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from './services/api';
import { supabase } from './services/supabase'; 
// ... (все ваши импорты компонентов) ...
import { Transaction, TransactionType, Account, ExchangeRates, AccountType, User, SavingsGoal, Budget, Category } from './types';
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

import { getExchangeRates, convertCurrency } from './services/currency';
import { useLocalization } from './context/LocalizationContext';


// --- App State & Backend Interaction ---
// usePersistentState удален. Все получаем с бэкенда.

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
  
  // --- НОВОЕ: Состояние пользователя и Telegram ---
  const [tgUser, setTgUser] = useState<User | null>(null);

  // UI State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // ... (остальное UI State) ...
  const [transcription, setTranscription] = useState(''); // Мы можем удалить это, если не будем показывать транскрипцию
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
  // ... (остальное UI State, как в вашем файле) ...
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

  // --- НОВОЕ: Refs для записи аудио ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- НОВОЕ: Data Fetching и Аутентификация ---
  useEffect(() => {
    // Получаем объект Telegram
    // @ts-ignore (Telegram SDK добавляется в index.html)
    const tg = window.Telegram.WebApp;

    const initializeApp = async (initData: string) => {
      try {
        // 1. Аутентификация: получаем токен и данные TG
        // authResponse = { token: "...", user: { (объект пользователя Telegram) } }
        const authResponse = await api.authenticateWithTelegram(initData);
        
        if (!authResponse || !authResponse.token || !authResponse.user) {
            throw new Error("Invalid auth response from server");
        }

        // 2. Устанавливаем сессию в Supabase И ЖДЕМ РЕЗУЛЬТАТ
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: authResponse.token,
          refresh_token: authResponse.token,
        });

        if (sessionError) {
          throw new Error(`Failed to set session: ${sessionError.message}`);
        }
        
        // 3. Убеждаемся, что сессия и пользователь установлены
        if (!sessionData || !sessionData.user) {
          // Если setSession вернул null, значит токен невалидный
          // (хотя наша функция telegram-auth должна была это поймать)
          throw new Error("Auth session missing after setSession!");
        }

        // 4. Формируем объект пользователя для ProfileScreen
        // (sessionData.user - это пользователь Supabase)
        // (authResponse.user - это пользователь Telegram)
        const teleUser = authResponse.user; // { id, first_name, ... }
        const supUser = sessionData.user;   // { id (UUID), email, ... }

        const appUser: User = {
            id: supUser.id, // Используем настоящий UUID из Supabase
            name: teleUser.first_name || teleUser.username || supUser.email || 'User',
            email: supUser.email
        };
        
        // Сохраняем пользователя в стейт
        setTgUser(appUser);
        
        // 5. Загрузка данных
        // Теперь api.initializeUser() будет вызван ПОСЛЕ
        // того, как клиент Supabase 100% получил сессию.
        const [exchangeRates, initialData] = await Promise.all([
          getExchangeRates(),
          api.initializeUser(), // Вызываем API (уже с токеном)
        ]);
        
        setRates(exchangeRates);
        setTransactions(initialData.transactions);
        setAccounts(initialData.accounts);
        setCategories(initialData.categories);
        setSavingsGoals(initialData.savingsGoals);
        setBudgets(initialData.budgets);
        
        // (Опционально) Устанавливаем валюту пользователя
        // setDefaultCurrency(initialData.settings.defaultCurrency);

      } catch (err: any) {
        console.error("Initialization failed:", err);
        setError(`Failed to load app data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    // --- Логика "Охранника" (без изменений) ---
    tg.ready();
    tg.expand();

    if (tg.initData) {
      // Если "пропуск" (initData) есть, запускаем приложение
      initializeApp(tg.initData);
    } else {
      // Если "пропуска" нет (открыли в обычном браузере)
      setError(t('telegramError')); // "Пожалуйста, откройте приложение из Telegram"
      setIsLoading(false);
    }
  }, [t]); // t - зависимость от языка
  
  // --- Memoized Calculations (без изменений) ---
  // ... (весь ваш код useMemo для totalBalance, summary и т.д. остается здесь) ...
  const displayCurrency = useMemo(() => defaultCurrency === 'DEFAULT' ? 'USD' : defaultCurrency, [defaultCurrency]);

  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') return transactions;
    return transactions.filter(tx => tx.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);
  
  // (и так далее... все ваши useMemo)
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
  

  // --- Handlers for Data Mutation (ОБНОВЛЕНЫ) ---

  const handleConfirmTransaction = async (transactionData: Omit<Transaction, 'id'> | Transaction) => {
    // 1. Обработка новой категории
    if (transactionData.category && !categories.some(c => c.name.toLowerCase() === transactionData.category.toLowerCase())) {
        // Вызываем бэкенд-функцию для подбора иконки
        const iconName = await api.getIconForCategory(transactionData.category);
        const newCategoryData: Omit<Category, 'id'> = {
            name: transactionData.category,
            icon: iconName,
            isFavorite: false,
            isDefault: false,
            type: transactionData.type,
        };
        // Сохраняем категорию в БД
        const newCategory = await api.addCategory(newCategoryData);
        setCategories(prev => [...prev, newCategory]);
    }

    // 2. Обновление целей (остается на клиенте для скорости)
    const originalTransaction = 'id' in transactionData ? transactions.find(t => t.id === transactionData.id) : null;
    if (transactionData.goalId || originalTransaction?.goalId) {
        // (Этот код можно оставить, он обновляет UI)
        setSavingsGoals(prevGoals => prevGoals.map(g => {
            let newCurrentAmount = g.currentAmount;
            if (originalTransaction?.goalId === g.id) {
                newCurrentAmount -= convertCurrency(originalTransaction.amount, originalTransaction.currency, g.currency, rates);
            }
            if (transactionData.goalId === g.id && transactionData.type === TransactionType.EXPENSE) {
                newCurrentAmount += convertCurrency(transactionData.amount, transactionData.currency, g.currency, rates);
            }
            return { ...g, currentAmount: Math.max(0, newCurrentAmount) };
        }));
    }

    // 3. Сохранение транзакции в БД
    if ('id' in transactionData) {
      const updatedTx = await api.updateTransaction(transactionData);
      setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    } else {
      const newTx = await api.addTransaction(transactionData);
      setTransactions(prev => [newTx, ...prev]);
    }
    
    // 4. Сброс UI
    setPotentialTransaction(null);
    setEditingTransaction(null);
    setGoalForDeposit(null);
  };

  const handleTextTransactionSubmit = async (inputText: string) => {
    if (!inputText.trim()) return;
    setIsProcessingText(true);
    setError(null);
    try {
        // Вызываем бэкенд-функцию
        const newTransaction = await api.parseTransactionFromText(
          inputText,
          displayCurrency,
          categories,
          savingsGoals,
          language
        );
        setPotentialTransaction(newTransaction);
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
        // Вызываем бэкенд-функцию
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

    // Этот код почти не меняется, т.к. мы уже вызываем api.delete...
    try {
      if ('type' in itemToDelete) {
          const { type, value } = itemToDelete;
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
      } else { // It's a transaction
          await api.deleteTransaction(itemToDelete.id);
          setTransactions(prev => prev.filter(t => t.id !== itemToDelete.id));
      }
    } catch (err: any) {
       console.error("Delete failed:", err);
       setError(err.message);
    }
    
    setItemToDelete(null);
  };

  // Все остальные handleSave... и handle...
  // ОСТАЮТСЯ БЕЗ ИЗМЕНЕНИЙ, потому что они УЖЕ
  // вызывают `api.addCategory`, `api.updateAccount` и т.д.
  // Мы "подменили" начинку api.ts, а App.tsx этого даже не заметил.
  // ... (handleSaveCategory, handleSaveAccount, handleSaveGoal, handleSaveBudget) ...
  const handleSaveCategory = async (categoryData: Omit<Category, 'id'> | Category) => {
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
    setCategoryFormState({ isOpen: false, category: null });
  };
  
  const handleSaveAccount = async (accountData: Omit<Account, 'id'> | Account) => {
    if ('id' in accountData) {
        const updated = await api.updateAccount(accountData);
        setAccounts(prev => prev.map(acc => acc.id === updated.id ? updated : acc));
    } else {
        const newAcc = await api.addAccount(accountData);
        setAccounts(prev => [...prev, newAcc]);
    }
    setIsAccountFormOpen(false);
    setEditingAccount(null);
  };
  
  const handleSaveGoal = async (goalData: Omit<SavingsGoal, 'id'> | SavingsGoal) => {
    if ('id' in goalData) {
        const updated = await api.updateSavingsGoal(goalData);
        setSavingsGoals(prev => prev.map(g => g.id === updated.id ? updated : g));
    } else {
        const newGoal = await api.addSavingsGoal({ ...goalData, currentAmount: 0 });
        setSavingsGoals(prev => [...prev, newGoal]);
    }
    setIsGoalFormOpen(false);
    setEditingGoal(null);
  };

  const handleSaveBudget = async (budgetData: Omit<Budget, 'id'> | Budget) => {
    if ('id' in budgetData) {
        const updated = await api.updateBudget(budgetData);
        setBudgets(prev => prev.map(b => b.id === updated.id ? updated : b));
    } else {
        const newBudget = await api.addBudget(budgetData);
        setBudgets(prev => [...prev, newBudget]);
    }
    setIsBudgetFormOpen(false);
    setEditingBudget(null);
  };


  // --- НОВАЯ ЛОГИКА ЗАПИСИ АУДИО ---
  const handleToggleRecording = async () => {
    if (isRecording) {
      // --- Остановка записи ---
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        // (Обработка произойдет в событии 'onstop')
      }
      setIsRecording(false);
      setIsProcessing(true); // Показываем индикатор обработки
    } else {
      // --- Начало записи ---
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Определяем лучший mimeType
        const mimeType = [
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/webm',
            'audio/mp4',
          ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
          
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = []; // Очищаем старые куски

        recorder.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        recorder.onstop = async () => {
          // Запись остановлена, создаем единый файл (Blob)
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Очищаем поток
          stream.getTracks().forEach(track => track.stop());
          
          // Отправляем Blob на бэкенд
          try {
            const newTransaction = await api.processAudioTransaction(
              audioBlob,
              categories,
              savingsGoals,
              language
            );
            // Успех! Показываем форму
            setPotentialTransaction(newTransaction);
          } catch (err: any) {
            console.error('Failed to process audio:', err);
            setError(err.message || t('connectionError'));
          } finally {
            setIsProcessing(false);
          }
        };

        recorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError(t('micError'));
      }
    }
  };
  
  // --- UI Handlers (без изменений) ---
  const handleCancelTransaction = () => {
    setPotentialTransaction(null);
    setEditingTransaction(null);
    setGoalForDeposit(null);
    setIsCategoryLockedInForm(false);
  };
  

  // --- Render Logic (без изменений) ---
  const renderContent = () => {
    // Весь ваш `switch (activeScreen) { ... }` остается здесь
    // ...
    switch (activeScreen) {
      case 'savings': return <SavingsScreen goals={savingsGoals} onAddGoal={() => setIsGoalFormOpen(true)} onAddToGoal={(goal) => { setGoalForDeposit(goal); setPotentialTransaction({ accountId: accounts[0].id, name: `Deposit to "${goal.name}"`, amount: 0, currency: displayCurrency, category: 'Savings', date: new Date().toISOString(), type: TransactionType.EXPENSE, goalId: goal.id }); }} onViewGoalHistory={setGoalForHistory} onEditGoal={(goal) => { setEditingGoal(goal); setIsGoalFormOpen(true); }} onDeleteGoal={(goal) => setItemToDelete({ type: 'savingsGoal', value: goal })} />;
      case 'analytics': return <AnalyticsScreen transactions={transactions} savingsGoals={savingsGoals} defaultCurrency={displayCurrency} rates={rates} />;
      case 'profile': return <ProfileScreen user={tgUser || { name: 'User', email: '...' }} daysActive={daysActive} onNavigate={setActiveScreen} />;
      case 'accounts': return <AccountsScreen accounts={accounts} transactions={transactions} rates={rates} onBack={() => setActiveScreen('profile')} onOpenAddForm={() => { setEditingAccount(null); setIsAccountFormOpen(true); }} onOpenActions={setAccountForActions} />;
      case 'categories': return <CategoriesScreen categories={categories} onBack={() => setActiveScreen('profile')} onCreateCategory={(type) => setCategoryFormState({ isOpen: true, category: null, context: { type } })} onEditCategory={(cat) => setCategoryFormState({ isOpen: true, category: cat })} onDeleteCategory={(cat) => setItemToDelete({ type: 'category', value: cat })} onToggleFavorite={(cat) => handleSaveCategory({ ...cat, isFavorite: !cat.isFavorite })} />;
      case 'settings': return <SettingsScreen onBack={() => setActiveScreen('profile')} defaultCurrency={defaultCurrency} onSetDefaultCurrency={setDefaultCurrency} />;
      case 'budgetPlanning': return <BudgetPlanningScreen budgets={budgets} transactions={transactions} categories={categories} onBack={() => setActiveScreen('profile')} onAddBudget={(monthKey) => { setEditingBudget({ monthKey, currency: displayCurrency }); setIsBudgetFormOpen(true); }} onEditBudget={(budget) => { setEditingBudget(budget); setIsBudgetFormOpen(true); }} onDeleteBudget={(budget) => setItemToDelete({ type: 'budget', value: budget })} onAddTransaction={(budget) => { setIsCategoryLockedInForm(true); setPotentialTransaction({ accountId: accounts[0].id, name: '', amount: 0, currency: displayCurrency, category: budget.category, date: new Date().toISOString(), type: TransactionType.EXPENSE }); }} onViewHistory={setBudgetForHistory} onCarryOver={(from, to) => setCarryOverInfo({ from, to })} rates={rates} defaultCurrency={displayCurrency} />;
      case 'history': return <TransactionHistoryScreen transactions={transactions} accounts={accounts} categories={categories} rates={rates} defaultCurrency={displayCurrency} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} onBack={() => setActiveScreen('home')} />;
      case 'comingSoon': return <ComingSoonScreen onBack={() => setActiveScreen('profile')} />;
      case 'home': default: return (<> <main className="max-w-4xl mx-auto flex flex-col gap-4 pb-32 pt-6"> <AccountList accounts={accounts} transactions={transactions} rates={rates} selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} totalBalance={totalBalance} defaultCurrency={displayCurrency} /> <FinancialOverview monthlyIncome={summary.monthlyIncome} monthlyExpense={summary.monthlyExpense} totalBalance={summary.selectedBalance} totalSavings={totalSavings} defaultCurrency={displayCurrency} onNavigate={setActiveScreen} onGenerateTips={handleGenerateSavingsTips} /> <div className="px-6"> <TransactionList transactions={filteredTransactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} onViewAll={() => setActiveScreen('history')} rates={rates} /> </div> {error && <p className="text-center text-red-500 mt-2 px-6" onClick={() => setError(null)}>{error}</p>} </main> </>);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-t-transparent border-brand-green rounded-full animate-spin"></div>
        <p className="ml-4 text-lg text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {renderContent()}

      {/* Оверлей записи. 
        Мы УБРАЛИ `stream={audioStream}` и `isReviewing`, т.к. новая логика в них не нуждается.
        [cite: App.tsx (original)]
      */}
      {isRecording && (
        <RecordingOverlay 
          transcription={transcription} // Можно оставить, если хотите показывать live-транскрипцию (но это сложно)
          onStop={handleToggleRecording}
          isRecording={isRecording}
        />
      )}

      {/* Вся остальная часть return (формы, модальные окна) остается БЕЗ ИЗМЕНЕНИЙ */}
      {/* ... (ваш код <TransactionForm ...>, <AccountForm ...> и т.д.) ... */}
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
      <ConfirmationModal isOpen={!!itemToDelete} onCancel={() => setItemToDelete(null)} onConfirm={handleDeleteItem} title={ itemToDelete ? ('id' in itemToDelete ? t('confirmDeleteTitle') : itemToDelete.type === 'account' ? t('confirmDeleteAccountTitle') : itemToDelete.type === 'savingsGoal' ? t('confirmDeleteGoalTitle') : itemToDelete.type === 'budget' ? t('confirmDeleteBudgetTitle') : t('confirmDeleteCategoryTitle')) : '' } message={ itemToDelete ? ('id' in itemToDelete ? t('confirmDelete', { name: itemToDelete.name }) : itemToDelete.type === 'category' ? t('confirmDeleteCategoryMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'account' ? t('confirmDeleteAccountMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'savingsGoal' ? t('confirmDeleteGoalMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'budget' ? t('confirmDeleteBudgetMessage', { name: itemToDelete.value.category }) : '') : '' } />
      <ConfirmationModal isOpen={!!carryOverInfo} onCancel={() => setCarryOverInfo(null)} onConfirm={() => { if(carryOverInfo) { const prevBudgets = budgets.filter(b => b.monthKey === carryOverInfo.from); prevBudgets.forEach(b => handleSaveBudget({...b, monthKey: carryOverInfo.to})); } setCarryOverInfo(null); }} title={t('carryOverBudgetsTitle')} message={t('carryOverBudgetsMessage')} />
      <TextInputModal isOpen={isTextInputOpen} isProcessing={isProcessingText} onClose={() => setIsTextInputOpen(false)} onSubmit={handleTextTransactionSubmit} text={textInputValue} onTextChange={setTextInputValue} />
      {goalForHistory && <GoalTransactionsModal isOpen={!!goalForHistory} onClose={() => setGoalForHistory(null)} goal={goalForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      {budgetForHistory && <BudgetTransactionsModal isOpen={!!budgetForHistory} onClose={() => setBudgetForHistory(null)} budget={budgetForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      
      <BottomNavBar activeScreen={activeScreen} onNavigate={setActiveScreen} isRecording={isRecording} isProcessing={isProcessing} onToggleRecording={handleToggleRecording} onLongPressAdd={() => setIsTextInputOpen(true)} />
    </div>
  );
};

export default App;