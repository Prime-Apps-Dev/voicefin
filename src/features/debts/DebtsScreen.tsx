// src/features/debts/DebtsScreen.tsx

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Plus, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Scale, 
  Trash2, 
  Calendar, 
  AlertCircle,
  Wallet,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { useAppData } from '../../core/context/AppDataContext';
import { useLocalization } from '../../core/context/LocalizationContext'; // Импорт локализации
import { Debt, DebtType, Transaction } from '../../core/types';
import LongPressWrapper from '../../shared/layout/LongPressWrapper';
import { ConfirmationModal } from '../../shared/ui/modals/ConfirmationModal';
import { convertCurrency } from '../../core/services/currency';
import { getDebtTransactionType, getDebtTransactionCategory } from '../../utils/constants';

// Импорты модальных окон
import { DebtForm } from './DebtForm';
import { TransactionForm } from '../transactions/TransactionForm';
import { DebtHistoryModal } from './DebtHistoryModal';

interface DebtsScreenProps {
  onBack: () => void;
}

// ============================================
// CAROUSEL WIDGET COMPONENT
// ============================================
const DebtWidgetCard = ({ 
  title, 
  subtitle, 
  amount, 
  count, 
  currency, 
  type, 
  onClick,
  active 
}: { 
  title: string; 
  subtitle: string; 
  amount: number; 
  count: number; 
  currency: string; 
  type: 'net' | 'owe' | 'owed'; 
  onClick?: () => void;
  active?: boolean;
}) => {
  const { t, language } = useLocalization(); // Хук внутри компонента

  // Обновленные градиенты (как в счетах)
  const styles = {
    net: {
      // Ocean vibe (Blue -> Teal)
      bg: 'bg-gradient-to-br from-blue-500 to-teal-400',
      shadow: 'shadow-blue-500/20',
      icon: Scale,
      iconColor: 'text-white'
    },
    owe: {
      // Sunset/Rose vibe (Pink -> Rose/Red) - яркий акцент для долга
      bg: 'bg-gradient-to-br from-red-500 to-red-500',
      shadow: 'shadow-red-500/20',
      icon: ArrowDownCircle,
      iconColor: 'text-white'
    },
    owed: {
      // Forest vibe (Green -> Emerald)
      bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      icon: ArrowUpCircle,
      iconColor: 'text-white'
    }
  };

  const currentStyle = styles[type];
  const Icon = currentStyle.icon;

  // Для русского языка правильное склонение (запись/записей)
  // В упрощенном варианте используем record/records из JSON
  const recordLabel = count === 1 ? t('record') : t('records');

  return (
    <motion.div 
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={`
        relative flex-shrink-0 w-[85%] max-w-[300px] snap-center
        rounded-3xl p-5 text-white 
        ${currentStyle.bg} ${currentStyle.shadow} shadow-lg
        flex flex-col justify-between min-h-[160px]
        overflow-hidden
        transition-all duration-300
        ${active ? 'ring-4 ring-white/20 scale-[1.02]' : 'opacity-100 scale-100'}
      `}
    >
      {/* Декоративные элементы фона (блики) */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/10 to-transparent" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold opacity-100 tracking-wide">{title}</h3>
            <p className="text-xs text-white/80 font-medium">{subtitle}</p>
          </div>
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md border border-white/10">
            <Icon className={`w-6 h-6 ${currentStyle.iconColor}`} />
          </div>
        </div>

        <div>
          <div className="text-3xl font-extrabold tracking-tight drop-shadow-sm">
             {new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { 
               style: 'currency', 
               currency,
               maximumFractionDigits: 0 
             }).format(amount)}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-white/90 bg-black/10 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
            <Layers className="w-3 h-3" />
            <span>{count} {recordLabel}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// REDESIGNED DEBT CARD COMPONENT
// ============================================
const DebtItem = ({ 
  debt, 
  onPress,
  onDoublePress, 
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
  const { t, language } = useLocalization(); // Хук
  const isIOwe = debt.type === DebtType.I_OWE;
  const totalAmount = debt.amount;
  const currentDebt = debt.current_amount;
  const paidAmount = totalAmount - currentDebt;
  const progressPercent = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;
  
  const isOverdue = debt.due_date ? new Date(debt.due_date) < new Date() : false;

  // Цветовая схема
  const theme = isIOwe ? {
    border: 'border-red-500/60',
    bg: 'bg-zinc-900',
    glow: 'shadow-red-900/10',
    iconBg: 'bg-red-500/20',
    iconColor: 'text-red-400',
    progressFill: 'bg-gradient-to-r from-red-500 to-orange-600',
    progressTrack: 'bg-zinc-800',
    amountText: 'text-red-100',
    labelColor: 'text-red-400'
  } : {
    border: 'border-emerald-500/60',
    bg: 'bg-zinc-900',
    glow: 'shadow-emerald-900/10',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    progressFill: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    progressTrack: 'bg-zinc-800',
    amountText: 'text-emerald-100',
    labelColor: 'text-emerald-400'
  };

  // Обработчик двойного нажатия
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
      onTap={handleTap}
      onLongPress={onLongPress}
      onSwipeLeft={onDelete}
      swipeDeleteIcon={Trash2}
      item={debt}
    >
      <div className={`
        relative w-full rounded-2xl p-4 mb-3
        border-2 ${theme.border}
        ${theme.bg} shadow-lg ${theme.glow}
        transition-all active:scale-[0.99]
      `}>
        {/* Header: Icon + Name + Date */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${theme.iconBg}`}>
               {isIOwe ? 
                 <ArrowDownCircle className={`w-5 h-5 ${theme.iconColor}`} /> : 
                 <ArrowUpCircle className={`w-5 h-5 ${theme.iconColor}`} />
               }
            </div>
            <div>
              <h3 className="text-white font-semibold text-base leading-tight">{debt.person}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                 {debt.category && (
                    <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {debt.category}
                    </span>
                 )}
                 <span className={`text-xs ${theme.labelColor}`}>
                   {isIOwe ? t('youOwe') : t('owesYou')}
                 </span>
              </div>
            </div>
          </div>

          {debt.due_date && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/5 ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
              <Calendar className="w-3 h-3" />
              <span className="text-xs font-medium">
                {new Date(debt.due_date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' })}
              </span>
              {isOverdue && <AlertCircle className="w-3 h-3 ml-1" />}
            </div>
          )}
        </div>

        {/* Main Amount Area */}
        <div className="mt-4 mb-4">
          <div className="flex items-baseline gap-2">
             <span className={`text-2xl font-bold tracking-tight ${theme.amountText}`}>
               {new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: debt.currency }).format(debt.current_amount)}
             </span>
             <span className="text-sm text-zinc-500 font-medium">{t('remaining')}</span>
          </div>
          {debt.description && (
            <p className="text-zinc-500 text-xs mt-1 truncate max-w-[90%]">
              "{debt.description}"
            </p>
          )}
        </div>

        {/* Progress Bar Section */}
        <div className="relative pt-1">
          {/* Labels above bar */}
          <div className="flex justify-between text-xs mb-1.5 px-1">
            <span className="text-zinc-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {t('paid')}: {new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { style: 'decimal', minimumFractionDigits: 0 }).format(paidAmount)}
            </span>
            <span className="text-zinc-500">
              {t('total')}: {new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', { style: 'decimal', minimumFractionDigits: 0 }).format(totalAmount)}
            </span>
          </div>

          {/* The Bar */}
          <div className={`h-2 w-full rounded-full overflow-hidden ${theme.progressTrack}`}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${theme.progressFill} shadow-[0_0_10px_rgba(0,0,0,0.3)]`}
            />
          </div>
        </div>

      </div>
    </LongPressWrapper>
  );
};

// ============================================
// MAIN SCREEN COMPONENT
// ============================================
export const DebtsScreen: React.FC<DebtsScreenProps> = ({ onBack }) => {
  const { t } = useLocalization(); // Хук

  const { 
    debts, 
    displayCurrency, 
    handleSaveDebt, 
    handleDeleteDebt,
    handleAddTransaction, 
    handleDeleteTransaction, 
    transactions, 
    rates,
    categories,
    accounts,
    savingsGoals,
    budgets 
  } = useAppData();

  const [activeTab, setActiveTab] = useState<'all' | 'owe' | 'owed' | 'archived'>('all');
  
  // --- MODAL STATES ---
  const [deleteConfirmation, setDeleteConfirmation] = useState<Debt | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDebtForHistory, setSelectedDebtForHistory] = useState<Debt | null>(null);
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

    // Sort by creation
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
  // HELPER FOR TAB LABELS
  // ============================================
  const getTabLabel = (tab: string) => {
    switch(tab) {
      case 'all': return t('all');
      case 'owe': return t('iOwe');
      case 'owed': return t('owedToMe'); // "owed" ключ занят под заголовок виджета, используем owedToMe для таба если нужно, или создаем отдельный
      case 'archived': return t('archive');
      default: return tab;
    }
  };
  
  // HACK: для табов используем сокращенные названия
  const getTabDisplay = (tab: string) => {
      if (tab === 'all') return t('all');
      if (tab === 'owe') return t('iOwe');
      if (tab === 'owed') return t('owedToMe'); // Или просто "Мне должны"
      if (tab === 'archived') return t('archive');
      return tab;
  };

  const getListHeader = () => {
      switch(activeTab) {
          case 'all': return t('activeDebts');
          case 'owe': return t('oweList');
          case 'owed': return t('owedList');
          case 'archived': return t('archiveList');
          default: return '';
      }
  };


  // ============================================
  // HANDLERS
  // ============================================
  
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

  const handleOpenHistory = (debt: Debt) => {
    setSelectedDebtForHistory(debt);
    setIsHistoryOpen(true);
  };

  const handleDebtPayment = (debt: Debt) => {
    const isRepayment = true; 
    const type = getDebtTransactionType(debt.type, !isRepayment); 
    const category = getDebtTransactionCategory(debt.type, !isRepayment);

    setPrefilledTx({
        type: type,
        category: category,
        debtId: debt.id,
        currency: debt.currency,
        name: `${t('repayment') || 'Repayment'}: ${debt.person}`,
        amount: 0,
        date: new Date().toISOString()
    });
    setIsTxFormOpen(true);
  };

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
    <div className="min-h-screen bg-black flex flex-col pb-24 relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">{t('debts')}</h1>
            <p className="text-xs text-zinc-400">{t('debtsSubtitle')}</p>
          </div>
        </div>
        <button 
          onClick={handleAddNew} 
          className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-90"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-grow flex flex-col space-y-6 overflow-y-auto pt-6">
        
        {/* CAROUSEL WIDGETS */}
        <div className="w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 pb-4">
          <div className="flex gap-4 w-max">
            {/* Widget 1: Net Balance */}
            <DebtWidgetCard 
              title={t('netBalance')}
              subtitle={netBalance >= 0 ? t('netPositive') : t('netNegative')}
              amount={Math.abs(netBalance)}
              count={debts.filter(d => d.status === 'ACTIVE').length}
              currency={displayCurrency}
              type="net"
            />
            
            {/* Widget 2: I Owe */}
            <DebtWidgetCard 
              title={t('iOwe')}
              subtitle={t('iOweSubtitle')}
              amount={iOweTotal}
              count={iOweCount}
              currency={displayCurrency}
              type="owe"
              onClick={() => setActiveTab('owe')}
              active={activeTab === 'owe'}
            />

            {/* Widget 3: Owed to Me */}
            <DebtWidgetCard 
              title={t('owedToMe')}
              subtitle={t('owedSubtitle')}
              amount={owedTotal}
              count={owedCount}
              currency={displayCurrency}
              type="owed"
              onClick={() => setActiveTab('owed')}
              active={activeTab === 'owed'}
            />
          </div>
        </div>

        {/* Tabs Filter (С плавной анимацией "скольжения") */}
        <div className="px-4">
            <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 relative">
            {(['all', 'owe', 'owed', 'archived'] as const).map(tab => {
                const isActive = activeTab === tab;
                return (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize z-10 ${
                            isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute inset-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-sm -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        {getTabDisplay(tab)}
                    </button>
                );
            })}
            </div>
        </div>

        {/* Debt List */}
        <div className="px-4 space-y-1 pb-20">
          <h2 className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3 px-1">
            {getListHeader()}
          </h2>
          
          <AnimatePresence mode="popLayout">
            {filteredDebts.length > 0 ? (
              filteredDebts.map(debt => (
                <motion.div
                  key={debt.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <DebtItem 
                    debt={debt} 
                    onPress={() => handleDebtPayment(debt)} 
                    onDoublePress={() => handleOpenHistory(debt)}
                    onLongPress={() => handleDebtLongPress(debt)}
                    onDelete={() => handleDeleteClick(debt)}
                    defaultCurrency={displayCurrency}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50"
              >
                <Wallet className="w-12 h-12 mb-3 opacity-30" />
                <p>{t('noDebtsTitle')}</p>
                <p className="text-xs text-zinc-600 mt-1">{t('noDebtsSubtitle')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ================= MODALS ================= */}
      
      {/* Create/Edit Form */}
      <DebtForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        onSave={async (data) => {
            await handleSaveDebt(
                editingDebt ? { ...data, id: editingDebt.id } : data, 
                !editingDebt, 
                accounts[0]?.id
            ); 
            setIsFormOpen(false);
        }}
        debt={editingDebt}
        defaultCurrency={displayCurrency}
        categories={['Personal', 'Work', 'Family', 'Other']} 
      />

      {/* History Modal */}
      <DebtHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        debt={selectedDebtForHistory}
        transactions={transactions}
        onDeleteTransaction={handleDeleteTransaction}
        currency={selectedDebtForHistory?.currency || displayCurrency}
      />

      {/* Transaction (Payment) Form */}
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
           isCategoryLocked={true} 
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title={t('deleteDebtTitle') || t('delete')} // Фолбек на общий delete если что
        message={t('deleteDebtMessage')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmation(null)}
      />
    </div>
  );
};