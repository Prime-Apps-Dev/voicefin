// src/features/transactions/TransactionForm.tsx

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Transaction, TransactionType, Account, SavingsGoal, Category, Budget, ExchangeRates, Debt, DebtType 
} from '../../core/types';
import { 
  COMMON_CURRENCIES, 
  DEBT_SYSTEM_CATEGORIES, 
  getDebtGradient // ADDED: Import gradient helper
} from '../../utils/constants';
import { useLocalization } from '../../core/context/LocalizationContext';
import { DatePicker } from '../../shared/ui/modals/DatePicker';
import { TimePicker } from '../../shared/ui/modals/TimePicker';
import { 
  Calendar, Clock, ChevronDown, PlusCircle, ArrowRightLeft, 
  ArrowDownCircle, // ADDED: Icon for widget
  ArrowUpCircle   // ADDED: Icon for widget
} from 'lucide-react';
import { ICONS } from '../../shared/ui/icons/icons';
import { convertCurrency } from '../../core/services/currency';

// Расширяем интерфейс, так как API возвращает "сырые" имена счетов для маппинга
interface DraftTransaction extends Omit<Transaction, 'id'> {
  fromAccountName?: string;
  toAccountName?: string;
}

interface TransactionFormProps {
  transaction: DraftTransaction | Transaction;
  categories: Category[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  onConfirm: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
  onCancel: () => void;
  isSavingsDeposit?: boolean;
  isCategoryLocked?: boolean; // This prop is important for debt flow
  goalName?: string;
  budgets: Budget[];
  transactions: Transaction[];
  onCreateBudget: (category: string, monthKey: string) => void;
  rates: ExchangeRates;
  defaultCurrency: string;
  debts: Debt[];
}

const InputField = ({ label, name, value, onChange, type = 'text', required = false, inputMode, disabled = false }: { label: string, name: keyof Transaction | string, value: any, onChange: any, type?: string, required?: boolean, inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search', disabled?: boolean }) => (
    <div>
      <label htmlFor={name as string} className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      <input
        type={type}
        id={name as string}
        name={name as string}
        value={value}
        onChange={onChange}
        required={required}
        inputMode={inputMode}
        disabled={disabled}
        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
      />
    </div>
);

const IconDisplay: React.FC<{ name: string; className?: string; }> = ({ name, className }) => {
    const IconComponent = ICONS[name] || ICONS.LayoutGrid;
    return <IconComponent className={className} />;
};

export const TransactionForm: React.FC<TransactionFormProps> = (props) => {
  const { 
    transaction, categories, accounts, onConfirm, onCancel, 
    isSavingsDeposit, isCategoryLocked, goalName, 
    budgets, transactions, onCreateBudget, rates, defaultCurrency, savingsGoals,
    debts
  } = props;
  const { t, language } = useLocalization();
  
  // Инициализация стейта
  const [formData, setFormData] = React.useState<DraftTransaction | Transaction>(transaction);
  const [amountStr, setAmountStr] = React.useState(String(transaction.amount || ''));
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = React.useState(false);
  const [currencyOptions, setCurrencyOptions] = React.useState(() => {
    const options = new Set(COMMON_CURRENCIES);
    if (transaction.currency) {
      options.add(transaction.currency);
    }
    return Array.from(options).sort();
  });
  
  const isEditing = 'id' in transaction;
  const isSavingsTransaction = formData.category === 'Savings';
  const isTransfer = formData.type === TransactionType.TRANSFER;

  // Logic to determine if we should show Debt Selector
  const isDebtRelated = useMemo(() => {
      if (isTransfer) return false;
      // UPDATED: Also show if debtId is pre-filled (coming from DebtsScreen)
      if (formData.debtId) return true; 
      
      const cat = formData.category;
      return (
          cat === DEBT_SYSTEM_CATEGORIES.LENDING ||
          cat === DEBT_SYSTEM_CATEGORIES.BORROWING ||
          cat === DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED ||
          cat === DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT
      );
  }, [formData.category, formData.debtId, isTransfer]);

  // --- ADDED: WIDGET LOGIC ---
  const selectedDebt = useMemo(() => {
      return debts.find(d => d.id === formData.debtId);
  }, [formData.debtId, debts]);

  const debtWidgetData = useMemo(() => {
      if (!selectedDebt) return null;
      
      const isIOwe = selectedDebt.type === DebtType.I_OWE;
      const remaining = selectedDebt.current_amount;
      const gradient = getDebtGradient(selectedDebt);
      
      // Calculate projected remaining
      let projected = remaining;
      const amountVal = parseFloat(amountStr) || 0;
      
      if (amountVal > 0) {
          const amountInDebtCurrency = convertCurrency(amountVal, formData.currency, selectedDebt.currency, rates);
          
          // We assume this form is used for REPAYMENT (reducing the debt balance)
          // (Creation happens in DebtForm)
          projected = Math.max(0, remaining - amountInDebtCurrency);
      }

      return { 
          isIOwe, 
          remaining, 
          gradient, 
          projected, 
          person: selectedDebt.person,
          currency: selectedDebt.currency
      };
  }, [selectedDebt, amountStr, formData.currency, rates]);
  // --- END ADDED ---

  // --- MAIN INITIALIZATION LOGIC (Your code - unchanged) ---
  React.useEffect(() => {
    const isNewTransaction = !('id' in transaction);
    
    let newFormData = { ...transaction };

    if (isNewTransaction) {
      newFormData.date = newFormData.date || new Date().toISOString();
      const draft = newFormData as DraftTransaction;

      if (draft.fromAccountName && !draft.accountId) {
        const found = accounts.find(acc => 
          acc.name.toLowerCase().includes(draft.fromAccountName!.toLowerCase())
        );
        if (found) {
          newFormData.accountId = found.id;
        } else if (accounts.length > 0) {
           if (draft.fromAccountName.toLowerCase().includes('card')) {
              const cardAcc = accounts.find(acc => acc.type === 'CARD');
              if (cardAcc) newFormData.accountId = cardAcc.id;
           }
        }
      }
      
      if (newFormData.type === TransactionType.TRANSFER && draft.toAccountName && !draft.toAccountId) {
        const found = accounts.find(acc => 
          acc.name.toLowerCase().includes(draft.toAccountName!.toLowerCase())
        );
        if (found) {
          newFormData.toAccountId = found.id;
        } else {
           if (draft.toAccountName.toLowerCase().includes('cash') || draft.toAccountName.toLowerCase().includes('налич')) {
             const cashAcc = accounts.find(acc => acc.type === 'CASH');
             if (cashAcc) newFormData.toAccountId = cashAcc.id;
           }
        }
      }
    }
    
    if (!newFormData.accountId && accounts.length > 0) {
       newFormData.accountId = accounts[0].id;
    }
    
    // ADDED: If debtId is pre-filled, ensure amount is 0 for user input
    if (isNewTransaction && newFormData.debtId && !newFormData.amount) {
        setAmountStr('');
    } else {
        setAmountStr(String(newFormData.amount || ''));
    }
    
    setFormData(newFormData);

  }, [transaction, accounts]);
  // ---------------------------------

  React.useEffect(() => {
    if (isSavingsTransaction && !isTransfer) {
        setFormData(prev => ({...prev, type: TransactionType.EXPENSE}));
    }
  }, [isSavingsTransaction, isTransfer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      setAmountStr(sanitizedValue);
      setFormData(prev => ({ ...prev, amount: parseFloat(sanitizedValue) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TransactionType;
    setFormData(prev => ({
        ...prev,
        type: newType,
        category: newType === TransactionType.TRANSFER ? '' : (prev.category || categories[0]?.name || ''),
        toAccountId: newType === TransactionType.TRANSFER ? (prev.toAccountId || accounts.find(a => a.id !== prev.accountId)?.id) : undefined
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTransfer && formData.accountId === formData.toAccountId) {
        alert(language === 'ru' ? "Счета списания и зачисления должны отличаться" : "Source and destination accounts must be different");
        return;
    }

    // Validation for debt
    if (isDebtRelated && !formData.debtId) {
        alert("Please select a debt record for this transaction.");
        return;
    }
    
    // Очищаем временные поля перед отправкой
    const finalData = { ...formData };
    delete (finalData as any).fromAccountName;
    delete (finalData as any).toAccountName;

    onConfirm(finalData);
  };
  
  const allCategoryNames = useMemo(() => {
      const categoryNameSet = new Set(categories.map(c => c.name));
      if(formData.category) {
        categoryNameSet.add(formData.category);
      }
      return Array.from(categoryNameSet).sort();
  }, [categories, formData.category]);

  // (Your budgetInfo logic - unchanged)
  const budgetInfo = useMemo(() => {
    if (!formData.category || formData.type === TransactionType.INCOME || isTransfer) return null;
    const transactionDate = new Date(formData.date); 
    const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;
    const budgetForCategory = budgets.find(b => b.monthKey === monthKey && b.category === formData.category);
    if (budgetForCategory) {
      const spentAmountSoFar = transactions.filter(t => { const tDate = new Date(t.date); return t.category === formData.category && t.type === TransactionType.EXPENSE && tDate.getFullYear() === transactionDate.getFullYear() && tDate.getMonth() === transactionDate.getMonth() && ('id' in transaction ? t.id !== transaction.id : true); }).reduce((sum, t) => { const amountInBudgetCurrency = convertCurrency(t.amount, t.currency, budgetForCategory.currency, rates); return sum + amountInBudgetCurrency; }, 0);
      const currentFormAmountInBudgetCurrency = formData.type === TransactionType.EXPENSE ? convertCurrency(formData.amount, formData.currency, budgetForCategory.currency, rates) : 0;
      const totalSpentWithCurrent = spentAmountSoFar + currentFormAmountInBudgetCurrency;
      return { type: 'exists' as const, budget: budgetForCategory, spent: spentAmountSoFar, progress: budgetForCategory.limit > 0 ? (totalSpentWithCurrent / budgetForCategory.limit) * 100 : 0 };
    } else {
      return { type: 'missing' as const, category: formData.category, monthKey: monthKey };
    }
  }, [formData.category, formData.date, formData.type, formData.amount, formData.currency, budgets, transactions, rates, transaction, isTransfer]);

  // (Your savingsGoalInfo logic - unchanged)
  const savingsGoalInfo = useMemo(() => {
    if (!formData.goalId || !isSavingsTransaction || isTransfer) return null;
    const selectedGoal = savingsGoals.find(g => g.id === formData.goalId);
    if (!selectedGoal) return null;
    let baseAmount = selectedGoal.currentAmount;
    const originalTransaction = 'id' in transaction ? transaction : null;
    if (originalTransaction && originalTransaction.goalId === selectedGoal.id && originalTransaction.type === TransactionType.EXPENSE) { const originalAmountInGoalCurrency = convertCurrency(originalTransaction.amount, originalTransaction.currency, selectedGoal.currency, rates); baseAmount -= originalAmountInGoalCurrency; }
    const currentFormAmountInGoalCurrency = convertCurrency(formData.amount, formData.currency, selectedGoal.currency, rates);
    const totalAmountWithCurrent = baseAmount + currentFormAmountInGoalCurrency;
    return { goal: selectedGoal, baseAmount: Math.max(0, baseAmount), progress: selectedGoal.targetAmount > 0 ? (totalAmountWithCurrent / selectedGoal.targetAmount) * 100 : 0 };
  }, [formData.goalId, formData.amount, formData.currency, isSavingsTransaction, savingsGoals, rates, transaction, isTransfer]);

  // (Your formatCurrencyLocal logic - unchanged)
  const formatCurrencyLocal = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);
  };

  // (Your safeDate logic - unchanged)
  const safeDate = useMemo(() => {
    try { const d = new Date(formData.date); if (isNaN(d.getTime())) return new Date(); return d; } catch (e) { return new Date(); }
  }, [formData.date]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onCancel}
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col border border-zinc-800/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
                {isTransfer && <div className="p-2 bg-blue-500/20 rounded-full"><ArrowRightLeft className="w-5 h-5 text-blue-400"/></div>}
                <h2 className="text-xl font-semibold text-white tracking-tight">
                    {/* UPDATED: Title changes if it's a debt payment */}
                    {isSavingsDeposit ? `Add to "${goalName}"` : 
                     isEditing ? t('editTransaction') : 
                     isTransfer ? (language === 'ru' ? 'Новый перевод' : 'New Transfer') : 
                     isDebtRelated ? (language === 'ru' ? 'Погашение долга' : 'Debt Repayment') :
                     t('confirmTransaction')}
                </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto">
            <div className="px-6 py-6 space-y-4">

              {/* --- ADDED: DEBT WIDGET CARD --- */}
              <AnimatePresence>
                {debtWidgetData && (
                   <motion.div 
                     layout
                     initial={{ opacity: 0, height: 0, y: -10 }} 
                     animate={{ opacity: 1, height: 'auto', y: 0 }} 
                     exit={{ opacity: 0, height: 0, y: -10 }}
                     transition={{ duration: 0.3, ease: 'easeInOut' }}
                     className={`rounded-2xl p-4 mb-2 bg-gradient-to-br ${debtWidgetData.gradient} shadow-lg overflow-hidden relative`}
                   >
                       <div className="relative z-10 flex justify-between items-start">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                                   {debtWidgetData.isIOwe ? 
                                      <ArrowDownCircle className="w-6 h-6 text-white"/> : 
                                      <ArrowUpCircle className="w-6 h-6 text-white"/>
                                   }
                               </div>
                               <div>
                                   <p className="text-white/80 text-xs uppercase tracking-wider font-medium">
                                       {debtWidgetData.isIOwe ? (language === 'ru' ? 'Возврат долга' : 'Paying back to') : (language === 'ru' ? 'Получение долга' : 'Receiving from')}
                                   </p>
                                   <p className="text-white font-bold text-lg leading-tight">{debtWidgetData.person}</p>
                               </div>
                           </div>
                           <div className="text-right flex-shrink-0 pl-2">
                               <p className="text-white/70 text-xs">Remaining</p>
                               <p className="text-white font-bold text-xl">
                                   {formatCurrencyLocal(debtWidgetData.remaining, debtWidgetData.currency)}
                               </p>
                           </div>
                       </div>
                       {/* Projected Balance */}
                       <AnimatePresence>
                        {parseFloat(amountStr) > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0, y: -5 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -5 }}
                                className="mt-3 pt-3 border-t border-white/20 flex justify-between items-center text-xs text-white"
                            >
                               <span>{language === 'ru' ? 'Останется после' : 'Projected balance'}:</span>
                               <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full">
                                   {formatCurrencyLocal(debtWidgetData.projected, debtWidgetData.currency)}
                               </span>
                            </motion.div>
                        )}
                       </AnimatePresence>
                   </motion.div>
                )}
              </AnimatePresence>
              {/* --- END ADDED --- */}
              
              {/* TYPE SELECTION (Your code - unchanged) */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('type')}</label>
                <div className="relative">
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleTypeChange}
                    disabled={isSavingsDeposit || isDebtRelated} // UPDATED: Disable if debt is related (flow is fixed)
                    className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                  >
                    <option value={TransactionType.EXPENSE}>{t('expense')}</option>
                    <option value={TransactionType.INCOME}>{t('income')}</option>
                    <option value={TransactionType.TRANSFER}>{language === 'ru' ? 'Перевод' : 'Transfer'}</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* FROM ACCOUNT (Your code - unchanged) */}
              <div>
                <label htmlFor="accountId" className="block text-sm font-medium text-zinc-300 mb-1.5">
                    {isTransfer ? (language === 'ru' ? 'Списать со счета' : 'From Account') : t('account')}
                </label>
                <div className="relative">
                  <select id="accountId" name="accountId" value={formData.accountId || ''} onChange={handleChange} required className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10">
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              {/* TO ACCOUNT (ONLY FOR TRANSFER) (Your code - unchanged) */}
              <AnimatePresence>
                  {isTransfer && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mb-4">
                            <label htmlFor="toAccountId" className="block text-sm font-medium text-zinc-300 mb-1.5">{language === 'ru' ? 'Зачислить на счет' : 'To Account'}</label>
                            <div className="relative">
                            <select id="toAccountId" name="toAccountId" value={formData.toAccountId || ''} onChange={handleChange} required={isTransfer} className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10">
                                <option value="" disabled>{language === 'ru' ? 'Выберите счет' : 'Select Account'}</option>
                                {accounts.filter(acc => acc.id !== formData.accountId).map((acc) => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                      </motion.div>
                  )}
              </AnimatePresence>

              {/* Name, Amount, Currency (Your code - unchanged) */}
              <InputField label={t('name')} name="name" value={formData.name} onChange={handleChange} required disabled={isSavingsDeposit} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label={t('amount')} name="amount" value={amountStr} onChange={handleChange} type="text" inputMode="decimal" required />
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('currency')}</label>
                  <div className="relative">
                    <select id="currency" name="currency" value={formData.currency} onChange={handleChange} required className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10">
                      {currencyOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              
              {/* CATEGORY (HIDDEN FOR TRANSFER) (Your code - unchanged) */}
              {!isTransfer && (
                  <div>
                      <label htmlFor="category" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('category')}</label>
                      <div className="relative">
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          required={!isTransfer}
                          disabled={isSavingsDeposit || isCategoryLocked} // isCategoryLocked is used here
                          className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                        >
                          {allCategoryNames.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                      </div>
                  </div>
              )}

              {/* DEBT SELECTOR (Your code - slightly modified) */}
               <AnimatePresence>
                {isDebtRelated && !isTransfer && (
                    <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
                        <div className="pt-2">
                            <label htmlFor="debtId" className="block text-sm font-medium text-zinc-300 mb-1.5">Related Debt *</label>
                            <div className="relative">
                                <select
                                    id="debtId"
                                    name="debtId"
                                    value={formData.debtId || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={isCategoryLocked} // UPDATED: Use the prop
                                    className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                                >
                                    <option value="" disabled>Select Debt</option>
                                    {/* UPDATED: Show only active debts and more info */}
                                    {debts.filter(d => d.status === 'ACTIVE').map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.person} ({formatCurrencyLocal(d.current_amount, d.currency)})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>
                )}
               </AnimatePresence>

               {/* SAVINGS SELECTOR (Your code - unchanged) */}
               <AnimatePresence>
                {isSavingsTransaction && !isTransfer && (
                    <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
                        <div className="pt-2">
                            <label htmlFor="goalId" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('savingsGoal')}</label>
                            <div className="relative">
                                <select id="goalId" name="goalId" value={formData.goalId || ''} onChange={handleChange} required disabled={isSavingsDeposit} className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed">
                                    <option value="" disabled>{t('selectGoal')}</option>
                                    {savingsGoals.map((goal) => (<option key={goal.id} value={goal.id}>{goal.name}</option>))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>
                )}
               </AnimatePresence>
              
               {/* BUDGET WIDGET (Your code - unchanged) */}
               <AnimatePresence>
                    {budgetInfo && !isSavingsTransaction && !isTransfer && (
                        <motion.div layout initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                            {budgetInfo.type === 'exists' && (
                                <div className="mt-2 bg-zinc-800 p-3 rounded-xl border border-zinc-700/50 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-700 rounded-lg"><IconDisplay name={budgetInfo.budget.icon} className="w-5 h-5 text-white" /></div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{budgetInfo.budget.category} Budget</p>
                                            <p className="text-xs text-zinc-400">{formatCurrencyLocal(budgetInfo.spent, budgetInfo.budget.currency)} of {formatCurrencyLocal(budgetInfo.budget.limit, budgetInfo.budget.currency)}</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-zinc-700 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${budgetInfo.progress > 85 ? 'bg-red-500' : 'bg-brand-blue'}`} style={{ width: `${Math.min(budgetInfo.progress, 100)}%` }} /></div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

              {/* DATE/TIME PICKERS (Your code - unchanged) */}
              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3">
                  <label htmlFor="date-button" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('date')}</label>
                  <button type="button" id="date-button" onClick={() => setIsDatePickerOpen(true)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200">
                    <span>{safeDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <Calendar className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
                <div className="col-span-2">
                  <label htmlFor="time-button" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('time')}</label>
                  <button type="button" id="time-button" onClick={() => setIsTimePickerOpen(true)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200">
                    <span>{safeDate.toTimeString().slice(0, 5)}</span>
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* DESCRIPTION (Your code - unchanged) */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('descriptionOptional')}</label>
                <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={2} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 resize-none" />
              </div>
            </div>

            {/* FOOTER (Your code - unchanged) */}
            <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end space-x-3 flex-shrink-0">
              <button type="button" onClick={onCancel} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200">
                {t('cancel')}
              </button>
              <button type="submit" disabled={isSavingsTransaction && !formData.goalId} className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200 disabled:bg-zinc-600 disabled:cursor-not-allowed">
                {t('confirm')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>

      {/* MODALS (Your code - unchanged) */}
      <AnimatePresence>
        {isDatePickerOpen &&
          <DatePicker
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onApply={(start) => {
              const currentDate = new Date(formData.date);
              const newDate = new Date(start);
              newDate.setHours(currentDate.getHours());
              newDate.setMinutes(currentDate.getMinutes());
              newDate.setSeconds(currentDate.getSeconds());
              setFormData(prev => ({ ...prev, date: newDate.toISOString() }));
              setIsDatePickerOpen(false);
            }}
            initialStartDate={safeDate}
            initialEndDate={safeDate}
            selectionMode="single"
          />
        }
        {isTimePickerOpen &&
          <TimePicker
            isOpen={isTimePickerOpen}
            onClose={() => setIsTimePickerOpen(false)}
            onApply={(newTime) => {
                setFormData(prev => ({...prev, date: newTime.toISOString()}));
                setIsTimePickerOpen(false);
            }}
            initialTime={safeDate}
          />
        }
      </AnimatePresence>
    </>
  );
};