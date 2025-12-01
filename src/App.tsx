import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import * as api from './core/services/api';

// Context Providers
import { AuthProvider, useAuth } from './core/context/AuthContext';
import { AppDataProvider, useAppData } from './core/context/AppDataContext';
import { useLocalization } from './core/context/LocalizationContext';

// Components
import { DevLoginForm } from './features/auth/DevLoginForm';
import { LoadingScreen } from './shared/ui/screens/LoadingScreen';
import { OnboardingGuide } from './features/onboarding/OnboardingGuide';
import { RecordingOverlay } from './shared/ui/screens/RecordingOverlay';
import { BottomNavBar } from './shared/layout/BottomNavBar';
import { AppModals } from './shared/ui/modals/AppModals';
import { IncomingDebtModal } from './features/debts/IncomingDebtModal';
import { ErrorConsole } from './shared/ui/components/ErrorConsole';

// Screens
import { SavingsScreen } from './features/savings/SavingsScreen';
import { AnalyticsScreen } from './features/analytics/AnalyticsScreen';
import { ProfileScreen } from './features/settings/ProfileScreen';
import { AccountsScreen } from './features/accounts/AccountsScreen';
import { CategoriesScreen } from './features/categories/CategoriesScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { AboutScreen } from './features/settings/AboutScreen';
import { BudgetPlanningScreen } from './features/budget/BudgetPlanningScreen';
import { TransactionHistoryScreen } from './features/transactions/TransactionHistoryScreen';
import { ComingSoonScreen } from './shared/ui/screens/ComingSoonScreen';
import { AccountList } from './features/accounts/AccountList';
import { FinancialOverview } from './features/analytics/FinancialOverview';
import { TransactionList } from './features/transactions/TransactionList';
import { DebtsScreen } from './features/debts/DebtsScreen';

// Types & Hooks
import { Transaction, TransactionType, Account, SavingsGoal, Budget, Category } from './core/types';
import { useAudioTransaction } from './shared/hooks/useAudioTransaction';

const TG_HEADER_OFFSET_CLASS = 'pt-[85px]';

// --- БЕЗОПАСНАЯ ЗАГЛУШКА ДЛЯ ФОНА (Чтобы не крашилось при пустых данных) ---
const SafeBackgroundPlaceholder = () => (
  <main className="max-w-4xl mx-auto flex flex-col gap-4 pb-32 opacity-50 pointer-events-none">
    <div className="px-4 pt-4">
      <div className="h-32 bg-gray-800 rounded-2xl w-full animate-pulse mb-4"></div>
      <div className="flex gap-2 mb-6">
        <div className="h-24 bg-gray-800 rounded-xl flex-1 animate-pulse"></div>
        <div className="h-24 bg-gray-800 rounded-xl flex-1 animate-pulse"></div>
      </div>
      <div className="h-64 bg-gray-800 rounded-2xl w-full animate-pulse"></div>
    </div>
  </main>
);

const AppContent: React.FC = () => {
  const { t, language } = useLocalization();
  const {
    user, isLoading: isAuthLoading, isBlocked, blockMessage,
    isDevLoggingIn, handleDevLogin, isAppExpanded, isAppFullscreen,
    setUser, error: authError
  } = useAuth();

  const {
    transactions, accounts, categories, savingsGoals, budgets, rates,
    isDataLoading, isDataLoaded, dataError, totalBalance, totalSavings, summary, daysActive,
    displayCurrency, selectedAccountId, setSelectedAccountId,
    handleAddTransaction, handleUpdateTransaction, handleDeleteTransaction,
    handleSaveAccount, handleDeleteAccount,
    handleSaveCategory, handleDeleteCategory,
    handleSaveGoal, handleDeleteGoal,
    handleSaveBudget, handleDeleteBudget,
    updateDefaultCurrency,
    debts,
    refreshDebts,
    updateUserPreferences,
    isRolloverModalOpen, setIsRolloverModalOpen, rolloverData, handleConfirmRollover, handleSkipRollover
  } = useAppData();

  const [activeScreen, setActiveScreen] = useState<'home' | 'savings' | 'analytics' | 'profile' | 'accounts' | 'budgetPlanning' | 'categories' | 'settings' | 'comingSoon' | 'history' | 'about' | 'debts'>('home');
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // New State for Error Logging and Force Load
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [forceLoad, setForceLoad] = useState(false);

  // Transaction State
  const [potentialTransaction, setPotentialTransaction] = useState<Omit<Transaction, 'id'> | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [isProcessingText, setIsProcessingText] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');

  // Entities State
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
  const [carryOverInfo, setCarryOverInfo] = useState<{ from: string, to: string } | null>(null);

  const [categoryFormState, setCategoryFormState] = useState<{ isOpen: boolean; category: Category | null; context?: { type: TransactionType; from?: 'budget' } }>({ isOpen: false, category: null });
  const [isCategoryLockedInForm, setIsCategoryLockedInForm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const [incomingDebtId, setIncomingDebtId] = useState<string | null>(null);
  const [initialDebtId, setInitialDebtId] = useState<string | null>(null);

  // Audio Hook
  const {
    isRecording, isProcessing, stream, transcription,
    startRecording, stopRecording, audioContext, processAudioResult
  } = useAudioTransaction((msg) => setError(msg));

  // Force load timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setForceLoad(true);
    }, 5000); // Force load after 5 seconds
    return () => clearTimeout(timer);
  }, []);

  // Error collection
  useEffect(() => {
    if (authError) setErrorLog(prev => [...prev, `Auth Error: ${authError}`]);
    if (dataError) setErrorLog(prev => [...prev, `Data Error: ${dataError}`]);
    if (error) setErrorLog(prev => [...prev, `App Error: ${error}`]);
  }, [authError, dataError, error]);

  // Логика онбординга и Deep Link
  useEffect(() => {
    if (isAuthLoading) return;

    // 1. Приоритет: Онбординг. Если юзер новый - показываем гайд.
    if (user && !user.has_completed_onboarding) {
      setShowOnboarding(true);
    }
    // 2. Если онбординг завершен (или не требуется) И есть отложенный Deep Link -> запускаем его.
    // Важно: проверяем !showOnboarding, чтобы гарантировать последовательность.
    else if (user?.has_completed_onboarding && initialDebtId && !showOnboarding) {
      setIncomingDebtId(initialDebtId);
      setInitialDebtId(null);
    }
  }, [user, initialDebtId, isAuthLoading, showOnboarding]);

  // Deep Link Logic
  useEffect(() => {
    const initData = (window as any).Telegram?.WebApp?.initDataUnsafe;
    const startParam = initData?.start_param;

    if (startParam && startParam.startsWith('debt_')) {
      let rawId = startParam.replace('debt_', '');
      const cleanId = rawId.replace(/[^a-f0-9-]/gi, '');
      if (cleanId.length === 36) setInitialDebtId(cleanId);
    }
  }, []);

  // --- Handlers ---
  const handleRecordingStopLogic = async () => {
    stopRecording();
    try {
      const tx = await processAudioResult(categories, savingsGoals, accounts, displayCurrency);
      if (tx) setPotentialTransaction({ ...tx, accountId: tx.accountId || accounts[0]?.id });
    } catch (e: any) { setError(e.message || t('connectionError')); }
  };

  const handleTextTransactionSubmit = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessingText(true);
    try {
      const newTransaction = await api.parseTransactionFromText(text, displayCurrency, categories, savingsGoals, accounts, language);
      const finalAccountId = newTransaction.accountId || (selectedAccountId !== 'all' ? selectedAccountId : accounts[0]?.id);
      setPotentialTransaction({ ...newTransaction, accountId: finalAccountId });
      setTextInputValue('');
      setIsTextInputOpen(false);
    } catch (e: any) { setError(e.message); } finally { setIsProcessingText(false); }
  };

  const handleConfirmTransactionWrapper = async (tx: Transaction | Omit<Transaction, 'id'>) => {
    try {
      if ('id' in tx) await handleUpdateTransaction(tx);
      else await handleAddTransaction(tx);
      setPotentialTransaction(null); setEditingTransaction(null); setGoalForDeposit(null); setIsCategoryLockedInForm(false);
    } catch (e: any) { setError(e.message); }
  };

  const handleDeleteItemWrapper = async () => {
    if (!itemToDelete) return;
    try {
      if ('value' in itemToDelete) {
        const { type, value } = itemToDelete;
        switch (type) {
          case 'account': await handleDeleteAccount(value.id); break;
          case 'category': await handleDeleteCategory(value.id); break;
          case 'savingsGoal': await handleDeleteGoal(value.id); break;
          case 'budget': await handleDeleteBudget(value.id); break;
        }
      } else { await handleDeleteTransaction(itemToDelete.id); }
    } catch (e: any) { setError(e.message); }
    setItemToDelete(null);
  };

  const handleFinishOnboarding = async () => {
    setShowOnboarding(false);
    if (user) {
      try {
        await api.markOnboardingAsCompleted(user.id);
        setUser(prev => prev ? ({ ...prev, has_completed_onboarding: true }) : null);
      } catch (err) { console.error(err); }
    }
  };

  const handleCategorySaveWrapper = async (catData: any) => {
    await handleSaveCategory(catData);
    setCategoryFormState({ isOpen: false, category: null });
    if (categoryFormState.context?.from === 'budget') {
      setEditingBudget(prev => prev ? ({ ...prev, category: catData.name }) : null);
    }
  };

  // --- RENDER ---

  if (isDevLoggingIn) return <DevLoginForm onSubmit={handleDevLogin} error={error} isLoading={isAuthLoading} />;

  // Экран Блокировки
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center p-6">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
        <h1 className="text-2xl font-bold text-white mb-2">{t('error')}</h1>
        <p className="text-lg text-gray-300 max-w-sm">{blockMessage}</p>
      </div>
    );
  }

  // КРИТИЧЕСКАЯ ОШИБКА АВТОРИЗАЦИИ (Вместо тёмного экрана)
  if (!isAuthLoading && authError) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
        <p className="text-gray-400 mb-6 max-w-xs break-words">{authError || dataError}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 active:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <RefreshCw size={20} /> Retry
        </button>
      </div>
    );
  }

  const isDev = import.meta.env.DEV;
  let paddingTopClass = '';
  let showMask = false;
  if (!isDev && isAppFullscreen) {
    paddingTopClass = TG_HEADER_OFFSET_CLASS;
    showMask = true;
  }

  // --- БЕЗОПАСНЫЙ РЕНДЕР КОНТЕНТА ---
  const renderContent = () => {
    // 1. Если юзера нет (даже если лоадинг прошел), рендерить нечего
    if (!user) return <div className="text-white text-center mt-10">No user data. Please restart.</div>;

    // 2. Безопасные данные (гарантия массивов)
    const safeAccounts = accounts || [];
    const safeTransactions = transactions || [];

    switch (activeScreen) {
      case 'savings': return (
        <SavingsScreen
          goals={savingsGoals}
          onAddGoal={() => setIsGoalFormOpen(true)}
          onAddToGoal={(goal) => {
            setGoalForDeposit(goal);
            setPotentialTransaction({ accountId: safeAccounts[0]?.id, name: `Deposit to "${goal.name}"`, amount: 0, currency: displayCurrency, category: 'Savings', date: new Date().toISOString(), type: TransactionType.EXPENSE, goalId: goal.id });
          }}
          onViewGoalHistory={setGoalForHistory}
          onEditGoal={(goal) => { setEditingGoal(goal); setIsGoalFormOpen(true); }}
          onDeleteGoal={(goal) => setItemToDelete({ type: 'savingsGoal', value: goal })}
        />
      );
      case 'analytics': return <AnalyticsScreen transactions={safeTransactions} savingsGoals={savingsGoals} defaultCurrency={displayCurrency} rates={rates} />;
      case 'profile': return <ProfileScreen user={user} daysActive={daysActive} onNavigate={setActiveScreen} />;
      case 'accounts': return <AccountsScreen accounts={safeAccounts} transactions={safeTransactions} rates={rates} onBack={() => setActiveScreen('profile')} onOpenAddForm={() => { setEditingAccount(null); setIsAccountFormOpen(true); }} onOpenActions={setAccountForActions} />;
      case 'categories': return <CategoriesScreen categories={categories} onBack={() => setActiveScreen('profile')} onCreateCategory={(type) => setCategoryFormState({ isOpen: true, category: null, context: { type } })} onEditCategory={(cat) => setCategoryFormState({ isOpen: true, category: cat })} onDeleteCategory={(cat) => setItemToDelete({ type: 'category', value: cat })} onToggleFavorite={(cat) => handleSaveCategory({ ...cat, isFavorite: !cat.isFavorite })} />;
      case 'categories': return <CategoriesScreen categories={categories} onBack={() => setActiveScreen('profile')} onCreateCategory={(type) => setCategoryFormState({ isOpen: true, category: null, context: { type } })} onEditCategory={(cat) => setCategoryFormState({ isOpen: true, category: cat })} onDeleteCategory={(cat) => setItemToDelete({ type: 'category', value: cat })} onToggleFavorite={(cat) => handleSaveCategory({ ...cat, isFavorite: !cat.isFavorite })} />;
      case 'settings': return <SettingsScreen onBack={() => setActiveScreen('profile')} defaultCurrency={displayCurrency} onSetDefaultCurrency={updateDefaultCurrency} onShowOnboarding={() => setShowOnboarding(true)} rolloverMode={user?.preferences?.budgetRollover || 'MANUAL'} onSetRolloverMode={(mode) => updateUserPreferences({ ...user?.preferences, budgetRollover: mode })} />;
      case 'about': return <AboutScreen onBack={() => setActiveScreen('profile')} />;
      case 'about': return <AboutScreen onBack={() => setActiveScreen('profile')} />;
      case 'budgetPlanning': return <BudgetPlanningScreen budgets={budgets} transactions={safeTransactions} categories={categories} onBack={() => setActiveScreen('profile')} onAddBudget={(monthKey) => { setEditingBudget({ monthKey, currency: displayCurrency }); setIsBudgetFormOpen(true); }} onEditBudget={(b) => { setEditingBudget(b); setIsBudgetFormOpen(true); }} onDeleteBudget={(b) => setItemToDelete({ type: 'budget', value: b })} onAddTransaction={(b) => { setIsCategoryLockedInForm(true); setPotentialTransaction({ accountId: safeAccounts[0]?.id, name: '', amount: 0, currency: displayCurrency, category: b.category, date: new Date().toISOString(), type: TransactionType.EXPENSE }); }} onViewHistory={setBudgetForHistory} onCarryOver={(from, to) => setCarryOverInfo({ from, to })} rates={rates} defaultCurrency={displayCurrency} />;
      case 'history': return <TransactionHistoryScreen transactions={safeTransactions} accounts={safeAccounts} categories={categories} rates={rates} defaultCurrency={displayCurrency} onSelectTransaction={setEditingTransaction} onDeleteTransaction={setItemToDelete} onBack={() => setActiveScreen('home')} />;
      case 'comingSoon': return <ComingSoonScreen onBack={() => setActiveScreen('profile')} />;
      case 'debts': return <DebtsScreen debts={debts} onBack={() => setActiveScreen('profile')} />;

      case 'home': default: return (
        <main className="max-w-4xl mx-auto flex flex-col gap-4 pb-32">
          <AccountList accounts={safeAccounts} transactions={safeTransactions} rates={rates} selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} totalBalance={totalBalance} defaultCurrency={displayCurrency} />
          <FinancialOverview monthlyIncome={summary.monthlyIncome} monthlyExpense={summary.monthlyExpense} totalBalance={summary.selectedBalance} totalSavings={totalSavings} defaultCurrency={displayCurrency} onNavigate={setActiveScreen} onGenerateTips={() => { }} />
          <div className="px-6">
            <TransactionList transactions={safeTransactions.filter(tx => selectedAccountId === 'all' || tx.accountId === selectedAccountId || tx.toAccountId === selectedAccountId)} accounts={safeAccounts} allAccounts={safeAccounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={setItemToDelete} onViewAll={() => setActiveScreen('history')} rates={rates} />
          </div>
          {error && <p className="text-center text-red-500 mt-2 px-6 text-sm" onClick={() => setError(null)}>{error}</p>}
        </main>
      );
    }
  };

  // Определяем, должен ли Onboarding взять на себя обработку долга
  const isDebtHandledInOnboarding = showOnboarding && initialDebtId;

  // Общий флаг загрузки: если грузимся - контент не показываем
  // Ждем пока загрузится Auth И Data (если есть юзер), НО если сработал forceLoad - показываем что есть
  const isLoading = !forceLoad && (isAuthLoading || (!!user && !isDataLoaded));

  // Если мы в процессе онбординга, но данные уже есть (технически), мы все равно можем показать SafeBackground
  // чтобы не отвлекать пользователя сложным интерфейсом под блюром
  const showSafeBackground = showOnboarding || (accounts && accounts.length === 0 && isDataLoaded);

  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Экран загрузки показывается ТОЛЬКО если правда грузимся */}
      <LoadingScreen isLoading={isLoading} />

      <ErrorConsole errors={errorLog} onClear={() => setErrorLog([])} />

      {/* Слой Онбординга */}
      {showOnboarding && (
        <OnboardingGuide
          onFinish={handleFinishOnboarding}
          initialDebtId={initialDebtId}
          onDebtActionComplete={() => setInitialDebtId(null)}
        />
      )}

      {/* Основной контейнер с Blur эффектом */}
      <div
        className={`transition-all duration-500 ease-in-out ${showOnboarding ? 'filter blur-md opacity-40 pointer-events-none scale-[0.98]' : 'opacity-100 scale-100'}`}
      >
        {showMask && <div className="fixed top-0 left-0 right-0 h-[85px] bg-gray-900 z-20"></div>}

        <div className={paddingTopClass}>
          {!isLoading && (
            // Если данных нет (новый юзер) или идет онбординг, показываем заглушку, чтобы реальный рендер не упал
            // Если сработал forceLoad, мы хотим показать контент (даже если он пустой), а не вечную загрузку
            showSafeBackground && !forceLoad ? <SafeBackgroundPlaceholder /> : renderContent()
          )}
        </div>
      </div>

      {/* Модалки рендерим только если есть юзер, чтобы избежать ошибок контекста */}
      {user && !isLoading && (
        <AppModals
          potentialTransaction={potentialTransaction} editingTransaction={editingTransaction} onConfirmTransaction={handleConfirmTransactionWrapper} onCancelTransaction={() => { setPotentialTransaction(null); setEditingTransaction(null); setIsCategoryLockedInForm(false); setGoalForDeposit(null); }}
          goalForDeposit={goalForDeposit} isCategoryLockedInForm={isCategoryLockedInForm}
          isAccountFormOpen={isAccountFormOpen} setIsAccountFormOpen={setIsAccountFormOpen} editingAccount={editingAccount} onSaveAccount={async (a) => { await handleSaveAccount(a); setIsAccountFormOpen(false); setEditingAccount(null); }}
          isGoalFormOpen={isGoalFormOpen} setIsGoalFormOpen={setIsGoalFormOpen} editingGoal={editingGoal} onSaveGoal={async (g) => { await handleSaveGoal(g); setIsGoalFormOpen(false); setEditingGoal(null); }} setEditingGoal={setEditingGoal}
          isBudgetFormOpen={isBudgetFormOpen} setIsBudgetFormOpen={setIsBudgetFormOpen} editingBudget={editingBudget} setEditingBudget={setEditingBudget} onSaveBudget={async (b) => { await handleSaveBudget(b); setIsBudgetFormOpen(false); setEditingBudget(null); }} budgetsForMonth={budgets.filter(b => b.monthKey === editingBudget?.monthKey)}
          categoryFormState={categoryFormState} setCategoryFormState={setCategoryFormState} onSaveCategory={handleCategorySaveWrapper} onDeleteCategory={(c) => setItemToDelete({ type: 'category', value: c })}
          accountForActions={accountForActions} setAccountForActions={setAccountForActions} onAddTxFromAccount={(id) => { setPotentialTransaction({ accountId: id, name: '', amount: 0, currency: displayCurrency, category: '', date: new Date().toISOString(), type: TransactionType.EXPENSE }); setActiveScreen('home'); setAccountForActions(null); }} onEditAccountRequest={(acc) => { setEditingAccount(acc); setIsAccountFormOpen(true); setAccountForActions(null); }} onDeleteAccountRequest={(acc) => { setItemToDelete({ type: 'account', value: acc }); setAccountForActions(null); }}
          itemToDelete={itemToDelete} setItemToDelete={setItemToDelete} onDeleteItem={handleDeleteItemWrapper}
          isTextInputOpen={isTextInputOpen} setIsTextInputOpen={setIsTextInputOpen} textInputValue={textInputValue} setTextInputValue={setTextInputValue} onTextTransactionSubmit={handleTextTransactionSubmit} isProcessingText={isProcessingText}
          goalForHistory={goalForHistory} setGoalForHistory={setGoalForHistory} budgetForHistory={budgetForHistory} setBudgetForHistory={setBudgetForHistory} onDeleteTransaction={setItemToDelete} onSelectTransaction={setEditingTransaction}
          carryOverInfo={carryOverInfo} setCarryOverInfo={setCarryOverInfo} onConfirmCarryOver={() => { if (carryOverInfo) { budgets.filter(b => b.monthKey === carryOverInfo.from).forEach(b => handleSaveBudget({ ...b, monthKey: carryOverInfo.to })); setCarryOverInfo(null); } }}
          categories={categories} accounts={accounts} savingsGoals={savingsGoals} budgets={budgets} transactions={transactions} rates={rates} displayCurrency={displayCurrency}
          debts={debts}
          isRolloverModalOpen={isRolloverModalOpen} setIsRolloverModalOpen={setIsRolloverModalOpen} rolloverData={rolloverData} onConfirmRollover={handleConfirmRollover} onSkipRollover={handleSkipRollover}
        />
      )}

      {!isLoading && (
        <BottomNavBar activeScreen={activeScreen} onNavigate={setActiveScreen} isRecording={isRecording} isProcessing={isProcessing} onToggleRecording={isRecording ? handleRecordingStopLogic : startRecording} onLongPressAdd={() => setIsTextInputOpen(true)} />
      )}

      {isRecording && !showOnboarding && (
        <RecordingOverlay transcription={transcription} stream={stream} onStop={handleRecordingStopLogic} isRecording={isRecording} audioContext={audioContext} />
      )}

      {incomingDebtId && !showOnboarding && (
        <IncomingDebtModal
          debtId={incomingDebtId}
          onClose={() => setIncomingDebtId(null)}
          onDebtAdded={async () => { await refreshDebts(); setIncomingDebtId(null); setActiveScreen('debts'); }}
          defaultCurrency={displayCurrency}
          accounts={accounts}
        />
      )}

      <style>{`
        .min-h-screen * { -webkit-user-select: none; user-select: none; }
        input, textarea { -webkit-user-select: text !important; user-select: text !important; }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </AuthProvider>
  );
};

export default App;