import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, TransactionType, Account, SavingsGoal, Category, Budget, ExchangeRates } from '../types';
import { COMMON_CURRENCIES } from '../constants';
import { useLocalization } from '../context/LocalizationContext';
import { DatePicker } from './DatePicker';
import { TimePicker } from './TimePicker';
import { Calendar, Clock, ChevronDown, PlusCircle } from 'lucide-react';
import { ICONS } from './icons';
import { convertCurrency } from '../services/currency';


interface TransactionFormProps {
  transaction: Omit<Transaction, 'id'> | Transaction;
  categories: Category[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  onConfirm: (transaction: Omit<Transaction, 'id'> | Transaction) => void;
  onCancel: () => void;
  isSavingsDeposit?: boolean;
  isCategoryLocked?: boolean;
  goalName?: string;
  budgets: Budget[];
  transactions: Transaction[];
  onCreateBudget: (category: string, monthKey: string) => void;
  rates: ExchangeRates;
  defaultCurrency: string;
}

const InputField = ({ label, name, value, onChange, type = 'text', required = false, inputMode, disabled = false }: { label: string, name: keyof Transaction, value: any, onChange: any, type?: string, required?: boolean, inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search', disabled?: boolean }) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-zinc-300 mb-1.5">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
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
    budgets, transactions, onCreateBudget, rates, defaultCurrency, savingsGoals
  } = props;
  const { t, language } = useLocalization();
  const [formData, setFormData] = React.useState(transaction);
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

  React.useEffect(() => {
    setFormData(transaction);
    setAmountStr(String(transaction.amount || ''));
  }, [transaction]);

  React.useEffect(() => {
    if (isSavingsTransaction) {
        setFormData(prev => ({...prev, type: TransactionType.EXPENSE}));
    }
  }, [isSavingsTransaction]);

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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };
  
  const allCategoryNames = React.useMemo(() => {
      const categoryNameSet = new Set(categories.map(c => c.name));
      if(formData.category) {
        categoryNameSet.add(formData.category);
      }
      return Array.from(categoryNameSet).sort();
  }, [categories, formData.category]);

  const budgetInfo = React.useMemo(() => {
    if (!formData.category || formData.type === TransactionType.INCOME) {
      return null;
    }

    const transactionDate = new Date(formData.date);
    const monthKey = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;

    const budgetForCategory = budgets.find(b => b.monthKey === monthKey && b.category === formData.category);

    if (budgetForCategory) {
      const spentAmountSoFar = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return t.category === formData.category &&
                 t.type === TransactionType.EXPENSE &&
                 tDate.getFullYear() === transactionDate.getFullYear() &&
                 tDate.getMonth() === transactionDate.getMonth() &&
                 ('id' in transaction ? t.id !== transaction.id : true); // Exclude current transaction if editing
        })
        .reduce((sum, t) => {
          const amountInBudgetCurrency = convertCurrency(t.amount, t.currency, budgetForCategory.currency, rates);
          return sum + amountInBudgetCurrency;
        }, 0);
      
      const currentFormAmountInBudgetCurrency = formData.type === TransactionType.EXPENSE ? convertCurrency(formData.amount, formData.currency, budgetForCategory.currency, rates) : 0;
      const totalSpentWithCurrent = spentAmountSoFar + currentFormAmountInBudgetCurrency;

      return {
        type: 'exists' as const,
        budget: budgetForCategory,
        spent: spentAmountSoFar,
        progress: budgetForCategory.limit > 0 ? (totalSpentWithCurrent / budgetForCategory.limit) * 100 : 0,
      };
    } else {
      return {
        type: 'missing' as const,
        category: formData.category,
        monthKey: monthKey,
      };
    }
  }, [formData.category, formData.date, formData.type, formData.amount, formData.currency, budgets, transactions, rates, defaultCurrency, transaction]);

  const savingsGoalInfo = React.useMemo(() => {
    if (!formData.goalId || !isSavingsTransaction) {
        return null;
    }

    const selectedGoal = savingsGoals.find(g => g.id === formData.goalId);
    if (!selectedGoal) {
        return null;
    }
    
    let baseAmount = selectedGoal.currentAmount;
    const originalTransaction = 'id' in transaction ? transaction : null;
    
    if (originalTransaction && originalTransaction.goalId === selectedGoal.id && originalTransaction.type === TransactionType.EXPENSE) {
        const originalAmountInGoalCurrency = convertCurrency(originalTransaction.amount, originalTransaction.currency, selectedGoal.currency, rates);
        baseAmount -= originalAmountInGoalCurrency;
    }

    const currentFormAmountInGoalCurrency = convertCurrency(formData.amount, formData.currency, selectedGoal.currency, rates);
    const totalAmountWithCurrent = baseAmount + currentFormAmountInGoalCurrency;

    return {
        goal: selectedGoal,
        baseAmount: Math.max(0, baseAmount),
        progress: selectedGoal.targetAmount > 0 ? (totalAmountWithCurrent / selectedGoal.targetAmount) * 100 : 0,
    };
  }, [formData.goalId, formData.amount, formData.currency, isSavingsTransaction, savingsGoals, rates, transaction]);


  const formatCurrencyLocal = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

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
            <h2 className="text-xl font-semibold text-white tracking-tight">{isSavingsDeposit ? `Add to "${goalName}"` : isEditing ? t('editTransaction') : t('confirmTransaction')}</h2>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto">
            <div className="px-6 py-6 space-y-4">
              <div>
                <label htmlFor="accountId" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('account')}</label>
                <div className="relative">
                  <select id="accountId" name="accountId" value={formData.accountId} onChange={handleChange} required className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10">
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.currency})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                </div>
              </div>
              <InputField label={t('name')} name="name" value={formData.name} onChange={handleChange} required disabled={isSavingsDeposit} />
              <div className="grid grid-cols-2 gap-4">
                <InputField label={t('amount')} name="amount" value={amountStr} onChange={handleChange} type="text" inputMode="decimal" required />
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('currency')}</label>
                  <div className="relative">
                    <select
                      id="currency"
                      name="currency"
                      value={formData.currency}
                      onChange={handleChange}
                      required
                      className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10"
                    >
                      {currencyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                  <label htmlFor="category" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('category')}</label>
                  <div className="relative">
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      disabled={isSavingsDeposit || isCategoryLocked}
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

               <AnimatePresence>
                {isSavingsTransaction && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-2">
                            <label htmlFor="goalId" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('savingsGoal')}</label>
                            <div className="relative">
                                <select
                                    id="goalId"
                                    name="goalId"
                                    value={formData.goalId || ''}
                                    onChange={handleChange}
                                    required
                                    disabled={isSavingsDeposit}
                                    className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                                >
                                    <option value="" disabled>{t('selectGoal')}</option>
                                    {savingsGoals.map((goal) => (
                                        <option key={goal.id} value={goal.id}>
                                            {goal.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                            </div>
                        </div>
                        <AnimatePresence>
                            {savingsGoalInfo && (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                >
                                    <div className="mt-2 bg-zinc-800 p-3 rounded-xl border border-zinc-700/50 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-700 rounded-lg">
                                                <IconDisplay name={savingsGoalInfo.goal.icon} className="w-5 h-5 text-brand-purple" />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{savingsGoalInfo.goal.name} {t('progress')}</p>
                                                <p className="text-xs text-zinc-400">
                                                    {formatCurrencyLocal(savingsGoalInfo.baseAmount, savingsGoalInfo.goal.currency)} of {formatCurrencyLocal(savingsGoalInfo.goal.targetAmount, savingsGoalInfo.goal.currency)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-full bg-zinc-700 rounded-full h-1.5">
                                            <div
                                                className={`h-1.5 rounded-full bg-brand-purple`}
                                                style={{ width: `${Math.min(savingsGoalInfo.progress, 100)}%` }}
                                            />
                                        </div>
                                        {formData.amount > 0 && (
                                            <p className="text-xs text-center text-brand-purple">
                                                + {formatCurrencyLocal(convertCurrency(formData.amount, formData.currency, savingsGoalInfo.goal.currency, rates), savingsGoalInfo.goal.currency)} with this transaction
                                            </p>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
               </AnimatePresence>
              
               <AnimatePresence>
                    {budgetInfo && !isSavingsTransaction && (
                        <motion.div
                            layout
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            {budgetInfo.type === 'exists' && (
                                <div className="mt-2 bg-zinc-800 p-3 rounded-xl border border-zinc-700/50 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-700 rounded-lg">
                                            <IconDisplay name={budgetInfo.budget.icon} className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{budgetInfo.budget.category} Budget</p>
                                            <p className="text-xs text-zinc-400">
                                                {formatCurrencyLocal(budgetInfo.spent, budgetInfo.budget.currency)} of {formatCurrencyLocal(budgetInfo.budget.limit, budgetInfo.budget.currency)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-zinc-700 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full ${budgetInfo.progress > 85 ? 'bg-red-500' : 'bg-brand-blue'}`}
                                            style={{ width: `${Math.min(budgetInfo.progress, 100)}%` }}
                                        />
                                    </div>
                                    {formData.amount > 0 && (
                                        <p className="text-xs text-center text-brand-blue">
                                            + {formatCurrencyLocal(convertCurrency(formData.amount, formData.currency, budgetInfo.budget.currency, rates), budgetInfo.budget.currency)} with this transaction
                                        </p>
                                    )}
                                </div>
                            )}
                            {budgetInfo.type === 'missing' && (
                               <div className="mt-2 bg-zinc-800 p-3 rounded-xl border border-zinc-700/50 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-blue-500/10 rounded-lg">
                                            <PlusCircle className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <p className="text-sm text-zinc-300">
                                            No budget for <span className="font-semibold text-white">{budgetInfo.category}</span>.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onCreateBudget(budgetInfo.category, budgetInfo.monthKey)}
                                        className="px-3 py-1.5 bg-brand-blue text-white text-xs font-semibold rounded-lg hover:bg-blue-500 active:scale-95 transition-all"
                                    >
                                        Create
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

              <div className="grid grid-cols-5 gap-4">
                <div className="col-span-3">
                  <label htmlFor="date-button" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('date')}</label>
                  <button
                    type="button"
                    id="date-button"
                    onClick={() => setIsDatePickerOpen(true)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                  >
                    <span>{new Date(formData.date).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <Calendar className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
                <div className="col-span-2">
                  <label htmlFor="time-button" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('time')}</label>
                  <button
                    type="button"
                    id="time-button"
                    onClick={() => setIsTimePickerOpen(true)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                  >
                    <span>{new Date(formData.date).toTimeString().slice(0, 5)}</span>
                    <Clock className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('type')}</label>
                <div className="relative">
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    disabled={isSavingsDeposit || isCategoryLocked || isSavingsTransaction}
                    className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                  >
                    <option value={TransactionType.EXPENSE}>{t('expense')}</option>
                    <option value={TransactionType.INCOME}>{t('income')}</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('descriptionOptional')}</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSavingsTransaction && !formData.goalId}
                className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200 disabled:bg-zinc-600 disabled:cursor-not-allowed"
              >
                {t('confirm')}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
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
            initialStartDate={new Date(formData.date)}
            initialEndDate={new Date(formData.date)}
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
            initialTime={new Date(formData.date)}
          />
        }
      </AnimatePresence>
    </>
  );
};