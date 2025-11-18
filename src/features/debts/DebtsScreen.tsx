// src/features/debts/DebtsScreen.tsx
// ПОЛНОСТЬЮ ОБНОВЛЕННЫЙ ЭКРАН ДОЛГОВ

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, ArrowDownCircle, ArrowUpCircle, Scale, Layers, Trash2, Archive, Calendar, AlertCircle } from 'lucide-react';
import { useAppData } from '../../core/context/AppDataContext';
import { Debt, DebtType, DebtStatus, TransactionType, Transaction } from '../../core/types';
import LongPressWrapper from '../../shared/layout/LongPressWrapper';
import { ConfirmationModal } from '../../shared/ui/modals/ConfirmationModal';
import { useLocalization } from '../../core/context/LocalizationContext';
import { convertCurrency } from '../../core/services/currency';
import { getDebtGradient, getDebtTransactionType, getDebtTransactionCategory } from '../../utils/constants';

// Импорты модальных окон
import { DebtForm } from './DebtForm';
import { TransactionForm } from '../transactions/TransactionForm';
import { DebtHistoryModal } from './DebtHistoryModal';

interface DebtsScreenProps {
  onBack: () => void;
}

// ============================================
// SUMMARY WIDGET COMPONENT
// ============================================
const DebtWidget = ({ 
  title, subtitle, amount, count, currency, type, onClick 
}: { 
  title: string; 
  subtitle: string; 
  amount: number; 
  count: number; 
  currency: string; 
  type: 'red' | 'green' | 'blue' | 'orange'; 
  onClick?: () => void;
}) => {
  const gradients = {
    red: 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-red-500/20',
    green: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 shadow-emerald-500/20',
    blue: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 shadow-blue-500/20',
    orange: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 shadow-orange-900/20',
  };

  const Icons = {
    red: ArrowDownCircle,
    green: ArrowUpCircle,
    blue: Scale,
    orange: Scale
  };

  const Icon = Icons[type];

  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden ${gradients[type]} rounded-3xl p-6 text-white shadow-lg min-h-[140px] flex flex-col justify-between cursor-pointer transform transition-transform`}
    >
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-right">
            <div className="text-sm font-medium opacity-90">{title}</div>
            <div className="text-xs opacity-70">{count} {count === 1 ? 'item' : 'items'}</div>
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold mb-1 truncate">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}
          </div>
          <div className="text-sm opacity-80">{subtitle}</div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// DEBT CARD COMPONENT
// ============================================
const DebtItem = ({ 
  debt, 
  onPress,
  onDoublePress, // NEW PROP
  onLongPress, 
  onDelete, 
  defaultCurrency 
}: { 
  debt: Debt; 
  onPress: () => void;
  onDoublePress: () => void; 
  onLongPress: () => void; 
  onDelete: () => void;
  defaultCurrency: string;
}) => {
  const { t } = useLocalization();
  const isIOwe = debt.type === DebtType.I_OWE;
  const progress = debt.amount > 0 ? (debt.current_amount / debt.amount) * 100 : 0;
  const isOverdue = debt.due_date ? new Date(debt.due_date) < new Date() : false;
  const isNearDue = debt.due_date 
    ? (new Date(debt.due_date).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000 
    : false;

  const gradient = getDebtGradient(debt);
  
  // --- DOUBLE TAP LOGIC ---
  const lastTap = useRef<number>(0);
  const handleTap = () => {
      const now = Date.now();
      const DOUBLE_PRESS_DELAY = 300;
      
      if (now - lastTap.current < DOUBLE_PRESS_DELAY) {
          onDoublePress();
      } else {
          onPress();
      }
      lastTap.current = now;
  };

  return (
    <LongPressWrapper
      onTap={handleTap} // Use wrapper handler
      onLongPress={onLongPress}
      onSwipeLeft={onDelete}
      swipeDeleteIcon={Trash2}
      item={debt}
    >
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-4 flex flex-col gap-3 mb-3 shadow-lg`}>
        {/* Progress Bar Background */}
        <div 
          className="absolute bottom-0 left-0 h-1 bg-white/30"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        
        {/* Header */}
        <div className="flex items-start justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isIOwe ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
              {isIOwe ? <ArrowDownCircle className="w-6 h-6 text-white" /> : <ArrowUpCircle className="w-6 h-6 text-white" />}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">{debt.person}</h3>
              {debt.category && (
                <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                  {debt.category}
                </span>
              )}
            </div>
          </div>
          
          {/* Status Badge */}
          {debt.status === 'ARCHIVED' && (
            <span className="text-xs text-white bg-white/20 px-2 py-1 rounded-full flex items-center gap-1">
              <Archive className="w-3 h-3" />
              Archived
            </span>
          )}
        </div>

        {/* Amount Info */}
        <div className="flex items-end justify-between z-10">
          <div>
            <p className="text-white/80 text-xs mb-1">{isIOwe ? 'I owe' : 'Owes me'}</p>
            <p className="font-bold text-2xl text-white">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: debt.currency }).format(debt.current_amount)}
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              of {new Intl.NumberFormat('en-US', { style: 'currency', currency: debt.currency }).format(debt.amount)}
            </p>
          </div>
          
          {/* Due Date */}
          {debt.due_date && (
            <div className={`text-right ${isOverdue ? 'text-red-200' : isNearDue ? 'text-yellow-200' : 'text-white/70'}`}>
              <div className="flex items-center gap-1 text-xs">
                {isOverdue && <AlertCircle className="w-3 h-3" />}
                <Calendar className="w-3 h-3" />
              </div>
              <p className="text-xs font-medium">
                {isOverdue ? 'Overdue' : 'Due'}
              </p>
              <p className="text-xs">
                {new Date(debt.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {debt.description && (
          <p className="text-white/80 text-sm truncate z-10">{debt.description}</p>
        )}

        {/* Progress Percentage */}
        <div className="flex justify-between items-center text-xs text-white/80 z-10">
          <span>{progress.toFixed(0)}% remaining</span>
          <span className="font-medium">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: debt.currency }).format(debt.amount - debt.current_amount)} paid
          </span>
        </div>
      </div>
    </LongPressWrapper>
  );
};

// ============================================
// MAIN SCREEN COMPONENT
// ============================================
export const DebtsScreen: React.FC<DebtsScreenProps> = ({ onBack }) => {
  const { t } = useLocalization();
  const { 
    debts, 
    displayCurrency, 
    handleSaveDebt, 
    handleDeleteDebt,
    handleAddTransaction, // NEEDED
    handleDeleteTransaction, // NEEDED
    transactions, 
    rates,
    categories,
    accounts,
    savingsGoals, // NEEDED for TxForm
    budgets // NEEDED for TxForm
  } = useAppData();

  const [activeTab, setActiveTab] = useState<'all' | 'owe' | 'owed' | 'archived'>('all');
  
  // --- MODAL STATES ---
  const [deleteConfirmation, setDeleteConfirmation] = useState<Debt | null>(null);
  
  // 1. Debt Form (Create/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // 2. History Modal (View)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDebtForHistory, setSelectedDebtForHistory] = useState<Debt | null>(null);

  // 3. Transaction Form (Pay)
  const [isTxFormOpen, setIsTxFormOpen] = useState(false);
  const [prefilledTx, setPrefilledTx] = useState<Partial<Transaction> | null>(null);


  // ============================================
  // CALCULATIONS
  // ============================================
  const { iOweTotal, owedTotal, iOweCount, owedCount, filteredDebts } = useMemo(() => {
    const activeDebts = debts.filter(d => d.status === 'ACTIVE');
    const iOwe = activeDebts.filter(d => d.type === DebtType.I_OWE);
    const owed = activeDebts.filter(d => d.type === DebtType.OWED_TO_ME);
    
    const iOweSum = iOwe.reduce((acc, d) => 
      acc + convertCurrency(d.current_amount, d.currency, displayCurrency, rates), 0
    );
    const owedSum = owed.reduce((acc, d) => 
      acc + convertCurrency(d.current_amount, d.currency, displayCurrency, rates), 0
    );

    let filtered = activeDebts;
    if (activeTab === 'owe') filtered = iOwe;
    else if (activeTab === 'owed') filtered = owed;
    else if (activeTab === 'archived') filtered = debts.filter(d => d.status === 'ARCHIVED' || d.status === 'COMPLETED');

    return { 
      iOweTotal: iOweSum, 
      owedTotal: owedSum, 
      iOweCount: iOwe.length, 
      owedCount: owed.length,
      filteredDebts: filtered
    };
  }, [debts, activeTab, displayCurrency, rates]);

  const netBalance = owedTotal - iOweTotal;

  // ============================================
  // HANDLERS
  // ============================================
  
  // --- Create/Edit ---
  const handleAddNew = () => {
    setEditingDebt(null);
    setIsFormOpen(true);
  };

  const handleEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setIsFormOpen(true);
  };

  const handleDebtLongPress = (debt: Debt) => {
    handleEdit(debt);
  };

  // --- History (Double Tap) ---
  const handleOpenHistory = (debt: Debt) => {
    setSelectedDebtForHistory(debt);
    setIsHistoryOpen(true);
  };

  // --- Payment (Single Tap) ---
  const handleDebtPayment = (debt: Debt) => {
    // Определяем тип транзакции:
    // Если Я должен -> Погашение = Расход (Expense)
    // Если Мне должны -> Погашение = Доход (Income)
    // (Обратная логика к созданию долга)
    const isRepayment = true; 
    const type = getDebtTransactionType(debt.type, !isRepayment); 
    const category = getDebtTransactionCategory(debt.type, !isRepayment);

    setPrefilledTx({
        type: type,
        category: category,
        debtId: debt.id,
        currency: debt.currency,
        name: `Repayment: ${debt.person}`,
        amount: 0, // Пользователь вводит сумму сам
        date: new Date().toISOString()
    });
    setIsTxFormOpen(true);
  };

  // --- Delete ---
  const handleDeleteClick = (debt: Debt) => {
    setDeleteConfirmation(debt);
  };

  const confirmDelete = async () => {
    if (deleteConfirmation) {
      await handleDeleteDebt(deleteConfirmation.id);
      setDeleteConfirmation(null);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col pb-24 relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Debts</h1>
            <p className="text-xs text-zinc-400">Manage loans and borrowings</p>
          </div>
        </div>
        <button 
          onClick={handleAddNew} 
          className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-grow px-4 py-6 space-y-6 overflow-y-auto">
        {/* Summary Widgets */}
        <div className="space-y-4">
          <DebtWidget 
            title="Net Balance" 
            subtitle={netBalance >= 0 ? "In your favor" : "You owe more"}
            amount={Math.abs(netBalance)}
            count={debts.filter(d => d.status === 'ACTIVE').length}
            currency={displayCurrency}
            type={netBalance >= 0 ? 'blue' : 'orange'}
          />
          <div className="grid grid-cols-2 gap-4">
            <DebtWidget 
              title="I Owe" 
              subtitle="To pay"
              amount={iOweTotal}
              count={iOweCount}
              currency={displayCurrency}
              type="red"
              onClick={() => setActiveTab('owe')}
            />
            <DebtWidget 
              title="Owed to Me" 
              subtitle="To receive"
              amount={owedTotal}
              count={owedCount}
              currency={displayCurrency}
              type="green"
              onClick={() => setActiveTab('owed')}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-zinc-800 rounded-xl">
          {(['all', 'owe', 'owed', 'archived'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize ${
                activeTab === tab 
                  ? 'bg-zinc-700 text-white shadow-md' 
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'all' ? 'All' : tab === 'owe' ? 'I Owe' : tab === 'owed' ? 'Owed' : 'Archive'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="space-y-2 pb-10">
          <AnimatePresence mode="popLayout">
            {filteredDebts.length > 0 ? (
              filteredDebts.map(debt => (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <DebtItem 
                    debt={debt} 
                    onPress={() => handleDebtPayment(debt)} // Single tap: Pay
                    onDoublePress={() => handleOpenHistory(debt)} // Double tap: History
                    onLongPress={() => handleDebtLongPress(debt)} // Long press: Edit
                    onDelete={() => handleDeleteClick(debt)}
                    defaultCurrency={displayCurrency}
                  />
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Layers className="w-12 h-12 mb-3 opacity-50" />
                <p>No debts found</p>
                <p className="text-sm text-zinc-600 mt-1">
                  {activeTab === 'archived' ? 'Your archive is empty' : 'Tap + to add a debt'}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      
      {/* 1. Debt Form (Create/Edit) */}
      <DebtForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={async (data) => {
            // Если долг новый, передаем флаг создания транзакции (true) и дефолтный аккаунт
            await handleSaveDebt(
                editingDebt ? { ...data, id: editingDebt.id } : data, 
                !editingDebt, // Create initial tx only if new
                accounts[0]?.id
            ); 
            setIsFormOpen(false);
        }}
        debt={editingDebt}
        defaultCurrency={displayCurrency}
        categories={['Personal', 'Family', 'Business', 'Other']} // Можно заменить на динамические категории
      />

      {/* 2. History Modal */}
      <DebtHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        debt={selectedDebtForHistory}
        transactions={transactions}
        onDeleteTransaction={handleDeleteTransaction}
        currency={selectedDebtForHistory?.currency || displayCurrency}
      />

      {/* 3. Transaction Form (Payment) */}
      {isTxFormOpen && prefilledTx && (
        <TransactionForm
           transaction={prefilledTx as Transaction}
           categories={categories}
           accounts={accounts}
           savingsGoals={savingsGoals}
           budgets={budgets}
           debts={debts}
           rates={rates}
           transactions={transactions}
           defaultCurrency={displayCurrency}
           onConfirm={async (tx) => {
               await handleAddTransaction(tx);
               setIsTxFormOpen(false);
           }}
           onCancel={() => setIsTxFormOpen(false)}
           onCreateBudget={() => {}}
           isCategoryLocked={true} // Блокируем категорию, так как это привязано к долгу
        />
      )}

      {/* 4. Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Delete Debt?"
        message="This will delete the debt record. Related transactions will remain but will be unlinked."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation(null)}
      />
    </div>
  );
};