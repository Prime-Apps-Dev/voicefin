// src/components/AppModals.tsx (actually src/shared/ui/modals/AppModals.tsx)

import React from 'react';
import { Transaction, Account, Category, SavingsGoal, Budget, TransactionType, Debt } from '../../../core/types'; // ИЗМЕНЕНО: Добавлен Debt
import { TransactionForm } from '../../../features/transactions/TransactionForm';
import { AccountForm } from '../../../features/accounts/AccountForm';
import { SavingsGoalForm } from '../../../features/savings/SavingsGoalForm';
import { BudgetForm } from '../../../features/budget/BudgetForm';
import { CategoryForm } from '../../../features/categories/CategoryForm';
import { AccountActionsModal } from '../../../features/accounts/AccountActionsModal';
import { ConfirmationModal } from './ConfirmationModal';
import { TextInputModal } from './TextInputModal';
import { GoalTransactionsModal } from '../../../features/savings/GoalTransactionsModal';
import { BudgetTransactionsModal } from '../../../features/budget/BudgetTransactionsModal';
import { useLocalization } from '../../../core/context/LocalizationContext';

// Props contain all state controls needed for modals
interface AppModalsProps {
  // Transaction Form
  potentialTransaction: Omit<Transaction, 'id'> | null;
  editingTransaction: Transaction | null;
  onConfirmTransaction: (tx: Transaction | Omit<Transaction, 'id'>) => void;
  onCancelTransaction: () => void;
  goalForDeposit: SavingsGoal | null;
  isCategoryLockedInForm: boolean;

  // Account Form
  isAccountFormOpen: boolean;
  setIsAccountFormOpen: (v: boolean) => void;
  editingAccount: Account | null;
  onSaveAccount: (acc: Account | Omit<Account, 'id'>) => void;

  // Goal Form
  isGoalFormOpen: boolean;
  setIsGoalFormOpen: (v: boolean) => void;
  editingGoal: SavingsGoal | null;
  onSaveGoal: (g: SavingsGoal | Omit<SavingsGoal, 'id'>) => void;
  setEditingGoal: (g: SavingsGoal | null) => void;

  // Budget Form
  isBudgetFormOpen: boolean;
  setIsBudgetFormOpen: (v: boolean) => void;
  editingBudget: Partial<Budget> | null;
  setEditingBudget: (b: Partial<Budget> | null) => void;
  onSaveBudget: (b: Budget | Omit<Budget, 'id'>) => void;
  budgetsForMonth: Budget[];

  // Category Form
  categoryFormState: { isOpen: boolean; category: Category | null; context?: any };
  setCategoryFormState: (s: any) => void;
  onSaveCategory: (c: Category | Omit<Category, 'id'>) => void;
  onDeleteCategory: (c: Category) => void;

  // Actions Modal
  accountForActions: Account | null;
  setAccountForActions: (a: Account | null) => void;
  onAddTxFromAccount: (id: string) => void;
  onEditAccountRequest: (a: Account) => void;
  onDeleteAccountRequest: (a: Account) => void;

  // Confirmation & Deletion
  itemToDelete: any;
  setItemToDelete: (i: any) => void;
  onDeleteItem: () => void;

  // Text Input
  isTextInputOpen: boolean;
  setIsTextInputOpen: (v: boolean) => void;
  textInputValue: string;
  setTextInputValue: (v: string) => void;
  onTextTransactionSubmit: (v: string) => void;
  isProcessingText: boolean;

  // Histories
  goalForHistory: SavingsGoal | null;
  setGoalForHistory: (g: SavingsGoal | null) => void;
  budgetForHistory: Budget | null;
  setBudgetForHistory: (b: Budget | null) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onSelectTransaction: (tx: Transaction) => void;

  // Carry Over
  carryOverInfo: { from: string, to: string } | null;
  setCarryOverInfo: (v: { from: string, to: string } | null) => void;
  onConfirmCarryOver: () => void;

  // Data
  categories: Category[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  transactions: Transaction[];
  rates: any;
  displayCurrency: string;
  debts: Debt[]; // ДОБАВЛЕНО
}

export const AppModals: React.FC<AppModalsProps> = (props) => {
  const { t } = useLocalization();
  
  const {
      potentialTransaction, editingTransaction, onConfirmTransaction, onCancelTransaction,
      goalForDeposit, isCategoryLockedInForm, 
      isAccountFormOpen, setIsAccountFormOpen, editingAccount, onSaveAccount,
      isGoalFormOpen, setIsGoalFormOpen, editingGoal, onSaveGoal, setEditingGoal,
      isBudgetFormOpen, setIsBudgetFormOpen, editingBudget, setEditingBudget, onSaveBudget, budgetsForMonth,
      categoryFormState, setCategoryFormState, onSaveCategory, onDeleteCategory,
      accountForActions, setAccountForActions, onAddTxFromAccount, onEditAccountRequest, onDeleteAccountRequest,
      itemToDelete, setItemToDelete, onDeleteItem,
      isTextInputOpen, setIsTextInputOpen, textInputValue, setTextInputValue, onTextTransactionSubmit, isProcessingText,
      goalForHistory, setGoalForHistory, budgetForHistory, setBudgetForHistory, onDeleteTransaction, onSelectTransaction,
      carryOverInfo, setCarryOverInfo, onConfirmCarryOver,
      categories, accounts, savingsGoals, budgets, transactions, rates, displayCurrency,
      debts // ДОБАВЛЕНО
  } = props;

  return (
    <>
      {(potentialTransaction || editingTransaction) && (
        <TransactionForm
          transaction={potentialTransaction || editingTransaction!}
          categories={categories}
          accounts={accounts}
          savingsGoals={savingsGoals}
          onConfirm={onConfirmTransaction}
          onCancel={onCancelTransaction}
          isSavingsDeposit={!!goalForDeposit}
          goalName={goalForDeposit?.name}
          isCategoryLocked={isCategoryLockedInForm}
          budgets={budgets}
          transactions={transactions}
          onCreateBudget={(cat, monthKey) => { 
              setEditingBudget({ monthKey, category: cat, icon: categories.find(c=>c.name===cat)?.icon || 'LayoutGrid', limit: 0, currency: displayCurrency }); 
              setIsBudgetFormOpen(true); 
          }}
          rates={rates}
          defaultCurrency={displayCurrency}
          debts={debts} // ДОБАВЛЕНО
        />
      )}

      <AccountForm 
        isOpen={isAccountFormOpen} 
        onClose={() => setIsAccountFormOpen(false)} 
        onSave={onSaveAccount} 
        account={editingAccount} 
      />

      <SavingsGoalForm 
        isOpen={isGoalFormOpen} 
        onClose={() => { setIsGoalFormOpen(false); setEditingGoal(null); }} 
        onSave={onSaveGoal} 
        goal={editingGoal} 
        defaultCurrency={displayCurrency} 
      />

      <BudgetForm 
        isOpen={isBudgetFormOpen} 
        onClose={() => { setIsBudgetFormOpen(false); setEditingBudget(null); }} 
        onSave={onSaveBudget} 
        budget={editingBudget} 
        allCategories={categories} 
        budgetsForMonth={budgetsForMonth} 
        onCreateNewCategory={() => setCategoryFormState({ isOpen: true, category: null, context: {type: TransactionType.EXPENSE, from: 'budget'} })} 
        defaultCurrency={displayCurrency} 
      />

      <CategoryForm 
        isOpen={categoryFormState.isOpen} 
        onClose={() => setCategoryFormState({isOpen: false, category: null})} 
        onSave={onSaveCategory} 
        onDelete={onDeleteCategory} 
        category={categoryFormState.category} 
        isFavoriteDisabled={!categoryFormState.category?.isFavorite && categories.filter(c => c.isFavorite).length >= 10} 
        categories={categories} 
      />

      <AccountActionsModal 
        isOpen={!!accountForActions} 
        account={accountForActions} 
        onClose={() => setAccountForActions(null)} 
        onAddTransaction={(acc) => onAddTxFromAccount(acc.id)} 
        onEdit={(acc) => onEditAccountRequest(acc)} 
        onDelete={(acc) => onDeleteAccountRequest(acc)} 
      />

      <ConfirmationModal 
        isOpen={!!itemToDelete} 
        onCancel={() => setItemToDelete(null)} 
        onConfirm={onDeleteItem} 
        title={ itemToDelete ? ('id' in itemToDelete ? t('confirmDeleteTitle') : itemToDelete.type === 'account' ? t('confirmDeleteAccountTitle') : itemToDelete.type === 'savingsGoal' ? t('confirmDeleteGoalTitle') : itemToDelete.type === 'budget' ? t('confirmDeleteBudgetTitle') : t('confirmDeleteCategoryTitle')) : '' } 
        message={ itemToDelete ? ('id' in itemToDelete ? t('confirmDelete', { name: itemToDelete.name }) : itemToDelete.type === 'category' ? t('confirmDeleteCategoryMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'account' ? t('confirmDeleteAccountMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'savingsGoal' ? t('confirmDeleteGoalMessage', { name: itemToDelete.value.name }) : itemToDelete.type === 'budget' ? t('confirmDeleteBudgetMessage', { name: itemToDelete.value.category }) : '') : '' } 
      />

      <ConfirmationModal 
        isOpen={!!carryOverInfo} 
        onCancel={() => setCarryOverInfo(null)} 
        onConfirm={onConfirmCarryOver} 
        title={t('carryOverBudgetsTitle')} 
        message={t('carryOverBudgetsMessage')} 
      />

      <TextInputModal 
        isOpen={isTextInputOpen} 
        isProcessing={isProcessingText} 
        onClose={() => setIsTextInputOpen(false)} 
        onSubmit={onTextTransactionSubmit} 
        text={textInputValue} 
        onTextChange={setTextInputValue} 
      />

      {goalForHistory && (
        <GoalTransactionsModal 
            isOpen={!!goalForHistory} 
            onClose={() => setGoalForHistory(null)} 
            goal={goalForHistory} 
            transactions={transactions} 
            accounts={accounts} 
            onSelectTransaction={onSelectTransaction} 
            onDeleteTransaction={onDeleteTransaction} 
            rates={rates} 
        />
      )}

      {budgetForHistory && (
        <BudgetTransactionsModal 
            isOpen={!!budgetForHistory} 
            onClose={() => setBudgetForHistory(null)} 
            budget={budgetForHistory} 
            transactions={transactions} 
            accounts={accounts} 
            onSelectTransaction={onSelectTransaction} 
            onDeleteTransaction={onDeleteTransaction} 
            rates={rates} 
        />
      )}
    </>
  );
};