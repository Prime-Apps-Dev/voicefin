// src/App.tsx

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
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

// Types & Hooks
import { Transaction, TransactionType, Account, SavingsGoal, Budget, Category } from './core/types';
import { useAudioTransaction } from './shared/hooks/useAudioTransaction';

const TG_HEADER_OFFSET_CLASS = 'pt-[85px]';

// --- Main Content Component (Separate to use Contexts) ---
const AppContent: React.FC = () => {
  const { t, language } = useLocalization();
  const { 
    user, isLoading: isAuthLoading, isBlocked, blockMessage, 
    isDevLoggingIn, handleDevLogin, isAppExpanded, isAppFullscreen, 
    refreshUserProfile, setUser, error: authError 
  } = useAuth();
  
  const { 
    transactions, accounts, categories, savingsGoals, budgets, rates, 
    isDataLoading, dataError, totalBalance, totalSavings, summary, daysActive,
    displayCurrency, selectedAccountId, setSelectedAccountId,
    handleAddTransaction, handleUpdateTransaction, handleDeleteTransaction,
    handleSaveAccount, handleDeleteAccount,
    handleSaveCategory, handleDeleteCategory,
    handleSaveGoal, handleDeleteGoal,
    handleSaveBudget, handleDeleteBudget,
    updateDefaultCurrency
  } = useAppData();

  // UI State
  const [activeScreen, setActiveScreen] = useState<'home' | 'savings' | 'analytics' | 'profile' | 'accounts' | 'budgetPlanning' | 'categories' | 'settings' | 'comingSoon' | 'history' | 'about'>('home');
  const [error, setError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Modal & Editing State
  const [potentialTransaction, setPotentialTransaction] = useState<Omit<Transaction, 'id'> | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
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
  const [carryOverInfo, setCarryOverInfo] = useState<{ from: string, to: string } | null>(null);
  
  const [categoryFormState, setCategoryFormState] = useState<{ isOpen: boolean; category: Category | null; context?: { type: TransactionType; from?: 'budget' } }>({ isOpen: false, category: null });
  const [isCategoryLockedInForm, setIsCategoryLockedInForm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  // Audio Hook
  const {
    isRecording, isProcessing, stream, transcription,
    startRecording, stopRecording, audioContext, processAudioResult
  } = useAudioTransaction((msg) => setError(msg));

  // Sync Errors
  useEffect(() => {
    if (authError) setError(authError);
    if (dataError) setError(dataError);
  }, [authError, dataError]);

  // Sync Onboarding
  useEffect(() => {
    if (user && !user.has_completed_onboarding) {
      setShowOnboarding(true);
    }
  }, [user]);

  // --- Logic Handlers ---

  const handleRecordingStopLogic = async () => {
      stopRecording();
      // Wait for internal processing in hook, accessed via promise wrapper in hook?
      // Ideally hook should return promise on stop or provide callback.
      // Adjusted implementation: we call processAudioResult immediately after stop 
      // but wait for the 'stop' event inside the hook.
      
      try {
          const tx = await processAudioResult(categories, savingsGoals);
          if (tx) {
              setPotentialTransaction({
                  ...tx,
                  accountId: tx.accountId || accounts[0]?.id,
              });
          }
      } catch (e: any) {
          setError(e.message || t('connectionError'));
      }
  };

  const handleConfirmTransactionWrapper = async (tx: Transaction | Omit<Transaction, 'id'>) => {
    try {
        if ('id' in tx) await handleUpdateTransaction(tx);
        else await handleAddTransaction(tx);
        
        setPotentialTransaction(null);
        setEditingTransaction(null);
        setGoalForDeposit(null);
        setIsCategoryLockedInForm(false);
    } catch (e: any) {
        setError(e.message);
    }
  };

  const handleDeleteItemWrapper = async () => {
      if (!itemToDelete) return;
      try {
          if ('value' in itemToDelete) {
              // It's a wrapped object {type, value}
              const { type, value } = itemToDelete;
              switch(type) {
                  case 'account': await handleDeleteAccount(value.id); break;
                  case 'category': await handleDeleteCategory(value.id); break;
                  case 'savingsGoal': await handleDeleteGoal(value.id); break;
                  case 'budget': await handleDeleteBudget(value.id); break;
              }
          } else {
              // It's a transaction
              await handleDeleteTransaction(itemToDelete.id);
          }
      } catch (e: any) {
          setError(e.message);
      }
      setItemToDelete(null);
  };

  const handleTextTransactionSubmit = async (text: string) => {
      if (!text.trim()) return;
      setIsProcessingText(true);
      try {
        const newTransaction = await api.parseTransactionFromText(
          text, displayCurrency, categories, savingsGoals, language
        );
        setPotentialTransaction({ ...newTransaction, accountId: newTransaction.accountId || accounts[0].id });
        setTextInputValue('');
        setIsTextInputOpen(false);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setIsProcessingText(false);
      }
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
          // Simple logic to update local budget form state if needed, 
          // though usually categories update globally.
          const catName = 'id' in catData ? catData.name : catData.name; 
          setEditingBudget(prev => ({...prev, category: catName}));
      }
  };

  // --- Rendering ---

  if (isDevLoggingIn) {
      return <DevLoginForm onSubmit={handleDevLogin} error={error} isLoading={isAuthLoading} />;
  }

  if (isBlocked) {
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center p-6">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-6" />
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
    }
  }

  const renderContent = () => {
      switch (activeScreen) {
          case 'savings': return (
              <SavingsScreen 
                goals={savingsGoals} 
                onAddGoal={() => setIsGoalFormOpen(true)} 
                onAddToGoal={(goal) => { 
                    setGoalForDeposit(goal); 
                    setPotentialTransaction({ accountId: accounts[0]?.id, name: `Deposit to "${goal.name}"`, amount: 0, currency: displayCurrency, category: 'Savings', date: new Date().toISOString(), type: TransactionType.EXPENSE, goalId: goal.id }); 
                }} 
                onViewGoalHistory={setGoalForHistory} 
                onEditGoal={(goal) => { setEditingGoal(goal); setIsGoalFormOpen(true); }} 
                onDeleteGoal={(goal) => setItemToDelete({ type: 'savingsGoal', value: goal })} 
              />
          );
          case 'analytics': return <AnalyticsScreen transactions={transactions} savingsGoals={savingsGoals} defaultCurrency={displayCurrency} rates={rates} />;
          case 'profile': return <ProfileScreen user={user!} daysActive={daysActive} onNavigate={setActiveScreen} />;
          case 'accounts': return <AccountsScreen accounts={accounts} transactions={transactions} rates={rates} onBack={() => setActiveScreen('profile')} onOpenAddForm={() => { setEditingAccount(null); setIsAccountFormOpen(true); }} onOpenActions={setAccountForActions} />;
          case 'categories': return <CategoriesScreen categories={categories} onBack={() => setActiveScreen('profile')} onCreateCategory={(type) => setCategoryFormState({ isOpen: true, category: null, context: { type } })} onEditCategory={(cat) => setCategoryFormState({ isOpen: true, category: cat })} onDeleteCategory={(cat) => setItemToDelete({ type: 'category', value: cat })} onToggleFavorite={(cat) => handleSaveCategory({ ...cat, isFavorite: !cat.isFavorite })} />;
          case 'settings': return <SettingsScreen onBack={() => setActiveScreen('profile')} defaultCurrency={displayCurrency} onSetDefaultCurrency={updateDefaultCurrency} onShowOnboarding={() => setShowOnboarding(true)} />;
          case 'about': return <AboutScreen onBack={() => setActiveScreen('profile')} />;
          case 'budgetPlanning': return <BudgetPlanningScreen budgets={budgets} transactions={transactions} categories={categories} onBack={() => setActiveScreen('profile')} onAddBudget={(monthKey) => { setEditingBudget({ monthKey, currency: displayCurrency }); setIsBudgetFormOpen(true); }} onEditBudget={(b) => { setEditingBudget(b); setIsBudgetFormOpen(true); }} onDeleteBudget={(b) => setItemToDelete({ type: 'budget', value: b })} onAddTransaction={(b) => { setIsCategoryLockedInForm(true); setPotentialTransaction({ accountId: accounts[0]?.id, name: '', amount: 0, currency: displayCurrency, category: b.category, date: new Date().toISOString(), type: TransactionType.EXPENSE }); }} onViewHistory={setBudgetForHistory} onCarryOver={(from, to) => setCarryOverInfo({ from, to })} rates={rates} defaultCurrency={displayCurrency} />;
          case 'history': return <TransactionHistoryScreen transactions={transactions} accounts={accounts} categories={categories} rates={rates} defaultCurrency={displayCurrency} onSelectTransaction={setEditingTransaction} onDeleteTransaction={setItemToDelete} onBack={() => setActiveScreen('home')} />;
          case 'comingSoon': return <ComingSoonScreen onBack={() => setActiveScreen('profile')} />;
          case 'home': default: return (
              <main className="max-w-4xl mx-auto flex flex-col gap-4 pb-32">
                  <AccountList accounts={accounts} transactions={transactions} rates={rates} selectedAccountId={selectedAccountId} onSelectAccount={setSelectedAccountId} totalBalance={totalBalance} defaultCurrency={displayCurrency} />
                  <FinancialOverview monthlyIncome={summary.monthlyIncome} monthlyExpense={summary.monthlyExpense} totalBalance={summary.selectedBalance} totalSavings={totalSavings} defaultCurrency={displayCurrency} onNavigate={setActiveScreen} onGenerateTips={() => {}} />
                  <div className="px-6">
                      <TransactionList transactions={transactions.filter(tx => selectedAccountId === 'all' || tx.accountId === selectedAccountId || tx.toAccountId === selectedAccountId)} accounts={accounts} allAccounts={accounts} onSelectTransaction={setEditingTransaction} onDeleteTransaction={setItemToDelete} onViewAll={() => setActiveScreen('history')} rates={rates} />
                  </div>
                  {error && <p className="text-center text-red-500 mt-2 px-6" onClick={() => setError(null)}>{error}</p>}
              </main>
          );
      }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <LoadingScreen isLoading={isAuthLoading || isDataLoading} />
      <AnimatePresence>
        {showOnboarding && <OnboardingGuide onFinish={handleFinishOnboarding} />}
      </AnimatePresence>
      
      {showMask && <div className="fixed top-0 left-0 right-0 h-[85px] bg-gray-900 z-20"></div>}
      
      {!(isAuthLoading || isDataLoading) && (
          <div className={paddingTopClass}>{renderContent()}</div>
      )}

      {isRecording && (
        <RecordingOverlay transcription={transcription} stream={stream} onStop={handleRecordingStopLogic} isRecording={isRecording} audioContext={audioContext} />
      )}

      <AppModals 
        // Passing all states and handlers to the monolithic modal wrapper
        potentialTransaction={potentialTransaction} editingTransaction={editingTransaction} onConfirmTransaction={handleConfirmTransactionWrapper} onCancelTransaction={() => { setPotentialTransaction(null); setEditingTransaction(null); setIsCategoryLockedInForm(false); setGoalForDeposit(null); }}
        goalForDeposit={goalForDeposit} isCategoryLockedInForm={isCategoryLockedInForm}
        isAccountFormOpen={isAccountFormOpen} setIsAccountFormOpen={setIsAccountFormOpen} editingAccount={editingAccount} onSaveAccount={async (a) => { await handleSaveAccount(a); setIsAccountFormOpen(false); setEditingAccount(null); }}
        isGoalFormOpen={isGoalFormOpen} setIsGoalFormOpen={setIsGoalFormOpen} editingGoal={editingGoal} onSaveGoal={async (g) => { await handleSaveGoal(g); setIsGoalFormOpen(false); setEditingGoal(null); }} setEditingGoal={setEditingGoal}
        isBudgetFormOpen={isBudgetFormOpen} setIsBudgetFormOpen={setIsBudgetFormOpen} editingBudget={editingBudget} setEditingBudget={setEditingBudget} onSaveBudget={async (b) => { await handleSaveBudget(b); setIsBudgetFormOpen(false); setEditingBudget(null); }} budgetsForMonth={budgets.filter(b => b.monthKey === editingBudget?.monthKey)}
        categoryFormState={categoryFormState} setCategoryFormState={setCategoryFormState} onSaveCategory={handleCategorySaveWrapper} onDeleteCategory={(c) => setItemToDelete({type: 'category', value: c})}
        accountForActions={accountForActions} setAccountForActions={setAccountForActions} onAddTxFromAccount={(id) => { setPotentialTransaction({ accountId: id, name: '', amount: 0, currency: displayCurrency, category: '', date: new Date().toISOString(), type: TransactionType.EXPENSE }); setActiveScreen('home'); setAccountForActions(null); }} onEditAccountRequest={(acc) => { setEditingAccount(acc); setIsAccountFormOpen(true); setAccountForActions(null); }} onDeleteAccountRequest={(acc) => { setItemToDelete({ type: 'account', value: acc }); setAccountForActions(null); }}
        itemToDelete={itemToDelete} setItemToDelete={setItemToDelete} onDeleteItem={handleDeleteItemWrapper}
        isTextInputOpen={isTextInputOpen} setIsTextInputOpen={setIsTextInputOpen} textInputValue={textInputValue} setTextInputValue={setTextInputValue} onTextTransactionSubmit={handleTextTransactionSubmit} isProcessingText={isProcessingText}
        goalForHistory={goalForHistory} setGoalForHistory={setGoalForHistory} budgetForHistory={budgetForHistory} setBudgetForHistory={setBudgetForHistory} onDeleteTransaction={setItemToDelete} onSelectTransaction={setEditingTransaction}
        carryOverInfo={carryOverInfo} setCarryOverInfo={setCarryOverInfo} onConfirmCarryOver={() => { if(carryOverInfo){ budgets.filter(b => b.monthKey === carryOverInfo.from).forEach(b => handleSaveBudget({...b, monthKey: carryOverInfo.to})); setCarryOverInfo(null); } }}
        categories={categories} accounts={accounts} savingsGoals={savingsGoals} budgets={budgets} transactions={transactions} rates={rates} displayCurrency={displayCurrency}
      />

      {!(isAuthLoading || isDataLoading) && (
        <BottomNavBar activeScreen={activeScreen} onNavigate={setActiveScreen} isRecording={isRecording} isProcessing={isProcessing} onToggleRecording={isRecording ? handleRecordingStopLogic : startRecording} onLongPressAdd={() => setIsTextInputOpen(true)} />
      )}
      
      <style>{`
        .min-h-screen * { -webkit-user-select: none; user-select: none; }
        input, textarea { -webkit-user-select: text !important; user-select: text !important; }
      `}</style>
    </div>
  );
};

// --- App Entry Point ---
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