// src/App.tsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Импорты утилит и сервисов
import { getExchangeRates, convertCurrency } from './services/currency';
import { useLocalization } from './context/LocalizationContext';


// --- КОНСТАНТА ДЛЯ ОТСТУПА TELEGRAM MINI APP ---
// Устанавливает отступ сверху 85px для всех основных экранов
const TG_HEADER_OFFSET_CLASS = 'pt-[85px]'; 

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
  
  // Состояние пользователя Telegram
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

  // Refs для записи аудио
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);


  // --- Data Fetching и Аутентификация ---
  useEffect(() => {
    // @ts-ignore
    const tg = window.Telegram.WebApp;

    const initializeApp = async (initData: string) => {
      try {
        const authResponse = await api.authenticateWithTelegram(initData);
        
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

        const teleUser = authResponse.user; 
        const supUser = sessionData.user;   

        const appUser: User = {
            id: supUser.id,
            name: teleUser.first_name || teleUser.username || supUser.email || 'User',
            email: supUser.email
        };
        
        setTgUser(appUser);
        
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
        console.error("Initialization failed:", err);
        setError(`Failed to load app data: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    tg.ready();
    tg.expand();

    if (tg.initData) {
      initializeApp(tg.initData);
    } else {
      setError(t('telegramError'));
      setIsLoading(false);
    }
  }, [t]); 
  
  // --- Memoized Calculations ---
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
  

  // --- Handlers for Data Mutation ---
  const handleConfirmTransaction = async (transactionData: Omit<Transaction, 'id'> | Transaction) => {
    if (transactionData.category && !categories.some(c => c.name.toLowerCase() === transactionData.category.toLowerCase())) {
        const iconName = await api.getIconForCategory(transactionData.category);
        const newCategoryData: Omit<Category, 'id'> = {
            name: transactionData.category,
            icon: iconName,
            isfavorite: false,
            isdefault: false,
            type: transactionData.type,
        };
        const newCategory = await api.addCategory(newCategoryData);
        setCategories(prev => [...prev, newCategory]);
    }

    const originalTransaction = 'id' in transactionData ? transactions.find(t => t.id === transactionData.id) : null;
    if (transactionData.goalid || originalTransaction?.goalId) {
        setSavingsGoals(prevGoals => prevGoals.map(g => {
            let newCurrentAmount = g.currentAmount;
            if (originalTransaction?.goalId === g.id) {
                // Отмена старого депозита
                newCurrentAmount -= convertCurrency(originalTransaction.amount, originalTransaction.currency, g.currency, rates);
            }
            if (transactionData.goalid === g.id && transactionData.type === TransactionType.EXPENSE) {
                // Добавление нового депозита
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
    
    setPotentialTransaction(null);
    setEditingTransaction(null);
    setGoalForDeposit(null);
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

  const handleSaveCategory = async (categoryData: Omit<Category, 'id'> | Category) => {
    let savedCategory: Category;
    if ('id' in categoryData) {
        savedCategory = await api.updateCategory(categoryData);
        setCategories(prev => prev.map(cat => cat.id === savedCategory.id ? savedCategory : cat));
    } else {
        savedCategory = await api.addCategory({ ...categoryData, isdefault: false });
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
        const newGoal = await api.addSavingsGoal({ ...goalData, currentamount: 0 });
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


  // --- Audio Recording Handlers ---
  const handleStartRecording = async () => {
    if (isRecording) return;
    
    try {
      // 1. Создаем AudioContext
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioCtxRef.current.state === 'suspended') {
          await audioCtxRef.current.resume();
        }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream); // 2. Сохраняем поток в state
      setIsRecording(true);
      
      // Выбираем поддерживаемый MIME-тип
      const mimeType = [
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm',
          'audio/mp4',
        ].find(type => MediaRecorder.isTypeSupported(type)) || 'audio/webm';
        
      const recorder = new MediaRecorder(mediaStream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = []; // Очищаем старые куски

      recorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      // 3. Устанавливаем обработчик для onstop
      recorder.onstop = handleRecordingStop; 

      recorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(t('micError'));
    }
  };

  // Вызывается при нажатии кнопки "Стоп"
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsProcessing(true); // Показываем индикатор обработки
  };

  // Вызывается автоматически, когда запись физически остановилась
  const handleRecordingStop = async () => {
    // 4. Останавливаем треки
    stream?.getTracks().forEach(track => track.stop());
    setStream(null); // Очищаем state

    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    audioChunksRef.current = [];
    
    // Отправляем Blob на бэкенд для обработки
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

  
  // --- UI Handlers ---
  const handleCancelTransaction = () => {
    setPotentialTransaction(null);
    setEditingTransaction(null);
    setGoalForDeposit(null);
    setIsCategoryLockedInForm(false);
  };
  

  // --- Render Logic (ОБНОВЛЕНО: ДОБАВЛЕН TG_HEADER_OFFSET_CLASS) ---
  const renderContent = () => {
    switch (activeScreen) {
      case 'savings': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
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
        </div>
      );
      case 'analytics': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
          <AnalyticsScreen 
            transactions={transactions} 
            savingsGoals={savingsGoals} 
            defaultCurrency={displayCurrency} 
            rates={rates} 
          />
        </div>
      );
      case 'profile': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
          <ProfileScreen 
            user={tgUser || { name: 'User', email: '...' }} 
            daysActive={daysActive} 
            onNavigate={setActiveScreen} 
          />
        </div>
      );
      case 'accounts': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
          <AccountsScreen 
            accounts={accounts} 
            transactions={transactions} 
            rates={rates} 
            onBack={() => setActiveScreen('profile')} 
            onOpenAddForm={() => { setEditingAccount(null); setIsAccountFormOpen(true); }} 
            onOpenActions={setAccountForActions} 
          />
        </div>
      );
      case 'categories': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
          <CategoriesScreen 
            categories={categories} 
            onBack={() => setActiveScreen('profile')} 
            onCreateCategory={(type) => setCategoryFormState({ isOpen: true, category: null, context: { type } })} 
            onEditCategory={(cat) => setCategoryFormState({ isOpen: true, category: cat })} 
            onDeleteCategory={(cat) => setItemToDelete({ type: 'category', value: cat })} 
            onToggleFavorite={(cat) => handleSaveCategory({ ...cat, isFavorite: !cat.isFavorite })} 
          />
        </div>
      );
      case 'settings': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
          <SettingsScreen 
            onBack={() => setActiveScreen('profile')} 
            defaultCurrency={defaultCurrency} 
            onSetDefaultCurrency={setDefaultCurrency} 
          />
        </div>
      );
      case 'budgetPlanning': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
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
        </div>
      );
      case 'history': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
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
        </div>
      );
      case 'comingSoon': return (
        <div className={TG_HEADER_OFFSET_CLASS}>
          <ComingSoonScreen onBack={() => setActiveScreen('profile')} />
        </div>
      );
      case 'home': default: return (
        <div className={TG_HEADER_OFFSET_CLASS}> 
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
              /> 
            </div> 
            {error && <p className="text-center text-red-500 mt-2 px-6" onClick={() => setError(null)}>{error}</p>} 
          </main> 
        </div>
      );
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
      {/* Основное содержимое приложения */}
      {renderContent()}

      {/* Оверлей записи аудио */}
      {isRecording && (
        <RecordingOverlay 
          transcription={transcription}
          stream={stream} 
          onStop={handleStopRecording} 
          isRecording={isRecording}
          audioContext={audioCtxRef.current} 
        />
      )}

      {/* Модальное окно/Форма транзакции */}
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
      
      {/* Модальные формы */}
      <AccountForm isOpen={isAccountFormOpen} onClose={() => setIsAccountFormOpen(false)} onSave={handleSaveAccount} account={editingAccount} />
      <SavingsGoalForm isOpen={isGoalFormOpen} onClose={() => { setIsGoalFormOpen(false); setEditingGoal(null); }} onSave={handleSaveGoal} goal={editingGoal} defaultCurrency={displayCurrency} />
      <BudgetForm isOpen={isBudgetFormOpen} onClose={() => { setIsBudgetFormOpen(false); setEditingBudget(null); }} onSave={handleSaveBudget} budget={editingBudget} allCategories={categories} budgetsForMonth={budgets.filter(b => b.monthKey === editingBudget?.monthKey)} onCreateNewCategory={() => setCategoryFormState({ isOpen: true, category: null, context: {type: TransactionType.EXPENSE, from: 'budget'} })} defaultCurrency={displayCurrency} />
      <CategoryForm isOpen={categoryFormState.isOpen} onClose={() => setCategoryFormState({isOpen: false, category: null})} onSave={handleSaveCategory} onDelete={(cat) => setItemToDelete({type: 'category', value: cat})} category={categoryFormState.category} isFavoriteDisabled={!categoryFormState.category?.isFavorite && categories.filter(c => c.isFavorite).length >= 10} categories={categories} />
      <AccountActionsModal isOpen={!!accountForActions} account={accountForActions} onClose={() => setAccountForActions(null)} onAddTransaction={(acc) => { setPotentialTransaction({ accountId: acc.id, name: '', amount: 0, currency: displayCurrency, category: '', date: new Date().toISOString(), type: TransactionType.EXPENSE }); setActiveScreen('home'); setAccountForActions(null); }} onEdit={(acc) => { setEditingAccount(acc); setIsAccountFormOpen(true); setAccountForActions(null); }} onDelete={(acc) => { setItemToDelete({ type: 'account', value: acc }); setAccountForActions(null); }} />
      
      {/* Модальные окна подтверждения */}
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
      
      {/* Модальное окно ввода текста и истории */}
      <TextInputModal isOpen={isTextInputOpen} isProcessing={isProcessingText} onClose={() => setIsTextInputOpen(false)} onSubmit={handleTextTransactionSubmit} text={textInputValue} onTextChange={setTextInputValue} />
      {goalForHistory && <GoalTransactionsModal isOpen={!!goalForHistory} onClose={() => setGoalForHistory(null)} goal={goalForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      {budgetForHistory && <BudgetTransactionsModal isOpen={!!budgetForHistory} onClose={() => setBudgetForHistory(null)} budget={budgetForHistory} transactions={transactions} accounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={(tx) => setItemToDelete(tx)} rates={rates} />}
      
      {/* Нижняя навигационная панель */}
      <BottomNavBar 
        activeScreen={activeScreen} 
        onNavigate={setActiveScreen} 
        isRecording={isRecording} 
        isProcessing={isProcessing} 
        onToggleRecording={isRecording ? handleStopRecording : handleStartRecording} 
        onLongPressAdd={() => setIsTextInputOpen(true)} 
      />
    </div>
  );
};

export default App;