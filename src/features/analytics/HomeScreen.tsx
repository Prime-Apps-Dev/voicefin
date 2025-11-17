// src/components/HomeScreen.tsx

import React from 'react';
import { Account, Transaction, ExchangeRates } from '../../core/types';
import { AccountList } from '../accounts/AccountList';
import { FinancialOverview } from './FinancialOverview';
import { TransactionList } from '../transactions/TransactionList';

// Определяем тип для всех возможных экранов
type AppScreen = 'home' | 'savings' | 'analytics' | 'profile' | 'accounts' | 'budgetPlanning' | 'categories' | 'settings' | 'comingSoon' | 'history';

// Определяем пропсы (props), которые компонент будет получать от App.tsx
interface HomeScreenProps {
  accounts: Account[];
  transactions: Transaction[];
  rates: ExchangeRates;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  totalBalance: number;
  defaultCurrency: string;
  summary: {
    monthlyIncome: number;
    monthlyExpense: number;
    selectedBalance: number;
  };
  totalSavings: number;
  onNavigate: (screen: AppScreen) => void;
  onGenerateTips: () => void;
  filteredTransactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  error: string | null;
  isDevLoggingIn: boolean; // Чтобы не показывать ошибку поверх экрана логина
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  accounts,
  transactions,
  rates,
  selectedAccountId,
  onSelectAccount,
  totalBalance,
  defaultCurrency,
  summary,
  totalSavings,
  onNavigate,
  onGenerateTips,
  filteredTransactions,
  onSelectTransaction,
  onDeleteTransaction,
  error,
  isDevLoggingIn,
}) => {
  return (
    <main className="max-w-4xl mx-auto flex flex-col gap-4 pb-32 pt-4"> 
      <AccountList 
        accounts={accounts} 
        transactions={transactions} 
        rates={rates} 
        selectedAccountId={selectedAccountId} 
        onSelectAccount={onSelectAccount} 
        totalBalance={totalBalance} 
        defaultCurrency={defaultCurrency} 
      /> 
      <FinancialOverview 
        monthlyIncome={summary.monthlyIncome} 
        monthlyExpense={summary.monthlyExpense} 
        totalBalance={summary.selectedBalance} 
        totalSavings={totalSavings} 
        defaultCurrency={defaultCurrency} 
        onNavigate={onNavigate} 
        onGenerateTips={onGenerateTips} 
      /> 
      <div className="px-6"> 
        <TransactionList 
          transactions={filteredTransactions} 
          accounts={accounts} 
          onSelectTransaction={onSelectTransaction} 
          onDeleteTransaction={onDeleteTransaction} 
          onViewAll={() => onNavigate('history')} 
          rates={rates} 
        /> 
      </div> 
      {error && !isDevLoggingIn && <p className="text-center text-red-500 mt-2 px-6" onClick={() => onNavigate('home'/* или можно передать setError(null) */)}>{error}</p>} 
    </main> 
  );
};