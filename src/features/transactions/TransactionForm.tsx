import React, { useMemo, useState } from 'react';
import { formatMoney } from '../../utils/formatMoney';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Transaction, TransactionType, Account, SavingsGoal, Category, Budget, ExchangeRates, Debt, DebtType, DebtStatus
} from '../../core/types';
import {
  COMMON_CURRENCIES,
  DEBT_SYSTEM_CATEGORIES,
  getLocalizedCategoryName
} from '../../utils/constants';
import { useLocalization } from '../../core/context/LocalizationContext';
import { DatePicker } from '../../shared/ui/modals/DatePicker';
import { TimePicker } from '../../shared/ui/modals/TimePicker';
import {
  Calendar, Clock, ChevronDown, ArrowRightLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  UserPlus,
  Loader2 // Используем для иконки загрузки, если есть, или CSS спиннер
} from 'lucide-react';
import { ICONS } from '../../shared/ui/icons/icons';
import { convertCurrency } from '../../core/services/currency';

// Убрали newDebtPerson из интерфейса, так как храним отдельно
interface DraftTransaction extends Omit<Transaction, 'id'> {
  fromAccountName?: string;
  toAccountName?: string;
}

interface TransactionFormProps {
  transaction: DraftTransaction | Transaction;
  categories: Category[];
  accounts: Account[];
  savingsGoals: SavingsGoal[];
  // ВАЖНО: Разрешаем передачу newDebtPerson вместе с транзакцией
  onConfirm: (transaction: (Omit<Transaction, 'id'> | Transaction) & { newDebtPerson?: string }) => Promise<void> | void;
  onCancel: () => void;
  isSavingsDeposit?: boolean;
  isCategoryLocked?: boolean;
  goalName?: string;
  budgets: Budget[];
  transactions: Transaction[];
  onCreateBudget: (category: string, monthKey: string) => void;
  rates: ExchangeRates;
  defaultCurrency: string;
  debts: Debt[];
}

const InputField = ({ label, name, value, onChange, type = 'text', required = false, inputMode, disabled = false, placeholder }: { label: string, name: keyof Transaction | string, value: any, onChange: any, type?: string, required?: boolean, inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search', disabled?: boolean, placeholder?: string }) => (
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
      placeholder={placeholder}
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
    budgets, transactions, rates, savingsGoals,
    debts
  } = props;
  const { t, language } = useLocalization();

  const [formData, setFormData] = React.useState<DraftTransaction | Transaction>(transaction);
  const [amountStr, setAmountStr] = React.useState(String(transaction.amount || ''));
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = React.useState(false);
  const [isCreatingDebt, setIsCreatingDebt] = React.useState(false);

  // ВАЖНО: Отдельное состояние для имени должника
  const [newDebtPerson, setNewDebtPerson] = React.useState('');

  // Состояние для блокировки повторной отправки
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currencyOptions] = React.useState(() => {
    const options = new Set(COMMON_CURRENCIES);
    if (transaction.currency) {
      options.add(transaction.currency);
    }
    return Array.from(options).sort();
  });

  const isEditing = 'id' in transaction;
  const isSavingsTransaction = formData.category === 'Savings';
  const isTransfer = formData.type === TransactionType.TRANSFER;

  const isDebtRelated = useMemo(() => {
    if (isTransfer) return false;
    if (formData.debtId || isCreatingDebt) return true;

    const cat = formData.category;
    return (
      cat === DEBT_SYSTEM_CATEGORIES.LENDING ||
      cat === DEBT_SYSTEM_CATEGORIES.BORROWING ||
      cat === DEBT_SYSTEM_CATEGORIES.REPAYMENT_RECEIVED ||
      cat === DEBT_SYSTEM_CATEGORIES.REPAYMENT_SENT
    );
  }, [formData.category, formData.debtId, isTransfer, isCreatingDebt]);

  const selectedDebt = useMemo(() => {
    return debts.find(d => d.id === formData.debtId);
  }, [formData.debtId, debts]);

  const debtWidgetData = useMemo(() => {
    if (!selectedDebt) return null;

    const isIOwe = selectedDebt.type === DebtType.I_OWE;
    const total = selectedDebt.amount;
    const current = selectedDebt.current_amount;

    const progress = total > 0 ? ((total - current) / total) * 100 : 0;

    let projected = current;
    const amountVal = parseFloat(amountStr) || 0;

    if (amountVal > 0) {
      const amountInDebtCurrency = convertCurrency(amountVal, formData.currency, selectedDebt.currency, rates);
      projected = Math.max(0, current - amountInDebtCurrency);
    }

    return {
      isIOwe,
      total,
      current,
      projected,
      person: selectedDebt.person,
      currency: selectedDebt.currency,
      progress
    };
  }, [selectedDebt, amountStr, formData.currency, rates]);

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

    if (isNewTransaction && newFormData.debtId && !newFormData.amount) {
      setAmountStr('');
    } else {
      setAmountStr(String(newFormData.amount || ''));
    }

    setFormData(newFormData);

  }, [transaction, accounts]);

  React.useEffect(() => {
    if (isSavingsTransaction && !isTransfer) {
      setFormData(prev => ({ ...prev, type: TransactionType.EXPENSE }));
    }
  }, [isSavingsTransaction, isTransfer]);

  React.useEffect(() => {
    if (formData.category === DEBT_SYSTEM_CATEGORIES.LENDING || formData.category === DEBT_SYSTEM_CATEGORIES.BORROWING) {
      setIsCreatingDebt(true);
      setFormData(prev => ({ ...prev, debtId: undefined }));
    }
  }, [formData.category]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // ВАЖНО: Обрабатываем поле имени отдельно
    if (name === 'newDebtPerson') {
      setNewDebtPerson(value);
      return;
    }

    if (name === 'amount') {
      const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      setAmountStr(sanitizedValue);
      setFormData(prev => ({ ...prev, amount: parseFloat(sanitizedValue) || 0 }));
    } else if (name === 'debtId') {
      if (value === 'NEW_DEBT') {
        setIsCreatingDebt(true);
        setFormData(prev => ({ ...prev, debtId: undefined }));
      } else {
        setIsCreatingDebt(false);
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as TransactionType;

    let defaultCategory = '';
    if (newType !== TransactionType.TRANSFER) {
      const firstValidCat = categories.find(c => c.type === newType);
      defaultCategory = firstValidCat ? firstValidCat.name : '';
    }

    setFormData(prev => ({
      ...prev,
      type: newType,
      category: defaultCategory,
      toAccountId: newType === TransactionType.TRANSFER ? (prev.toAccountId || accounts.find(a => a.id !== prev.accountId)?.id) : undefined
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (isTransfer && formData.accountId === formData.toAccountId) {
      alert(language === 'ru' ? "Счета списания и зачисления должны отличаться" : "Source and destination accounts must be different");
      return;
    }

    if (isDebtRelated && !isCreatingDebt && !formData.debtId) {
      alert("Please select a debt record for this transaction.");
      return;
    }

    if (isCreatingDebt && !newDebtPerson.trim()) {
      alert(language === 'ru' ? "Введите имя человека" : "Please enter person name");
      return;
    }

    setIsSubmitting(true);

    try {
      const finalData = { ...formData };
      delete (finalData as any).fromAccountName;
      delete (finalData as any).toAccountName;

      // ДОБАВЛЕНО: Удаляем savingsGoalName перед отправкой
      delete (finalData as any).savingsGoalName;

      if (isCreatingDebt) {
        await onConfirm({ ...finalData, newDebtPerson: newDebtPerson });
      } else {
        await onConfirm(finalData);
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
      setIsSubmitting(false);
      alert(language === 'ru' ? "Ошибка сохранения. Попробуйте снова." : "Error saving. Please try again.");
    }
  };

  const sortedCategoryNames = useMemo(() => {
    const filtered = categories.filter(c => c.type === formData.type);
    const uniqueNames = Array.from(new Set(filtered.map(c => c.name)));

    return uniqueNames.sort((a: string, b: string) => {
      const nameA = getLocalizedCategoryName(a, language);
      const nameB = getLocalizedCategoryName(b, language);
      return nameA.localeCompare(nameB, language === 'ru' ? 'ru' : 'en');
    });
  }, [categories, formData.type, language]);


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

  const formatCurrency = (amount: number, currency: string) => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';
    return formatMoney(amount, currency, locale);
  };

  const safeDate = useMemo(() => {
    try { const d = new Date(formData.date); if (isNaN(d.getTime())) return new Date(); return d; } catch (e) { return new Date(); }
  }, [formData.date]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] px-4 py-[88px]"
        onClick={!isSubmitting ? onCancel : undefined} // Блокируем закрытие по клику на фон при отправке
      >
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-h-[calc(85vh-56px)] overflow-hidden flex flex-col border border-zinc-800/60"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              {isTransfer && <div className="p-2 bg-blue-500/20 rounded-full"><ArrowRightLeft className="w-5 h-5 text-blue-400" /></div>}
              <h2 className="text-xl font-semibold text-white tracking-tight">
                {isSavingsDeposit ? `Add to "${goalName}"` :
                  isEditing ? t('editTransaction') :
                    isTransfer ? (language === 'ru' ? 'Новый перевод' : 'New Transfer') :
                      isDebtRelated ? (isCreatingDebt ? (language === 'ru' ? 'Новый долг' : 'New Debt') : (language === 'ru' ? 'Операция с долгом' : 'Debt Transaction')) :
                        t('confirmTransaction')}
              </h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto">
            <fieldset disabled={isSubmitting} className="contents"> {/* Блокируем все поля ввода при отправке */}
              <div className="px-6 py-6 space-y-4">

                {/* TYPE SELECTION */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('type')}</label>
                  <div className="relative">
                    <select
                      id="type"
                      name="type"
                      value={formData.type}
                      onChange={handleTypeChange}
                      disabled={isSavingsDeposit || isSubmitting}
                      className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                    >
                      <option value={TransactionType.EXPENSE}>{t('expense')}</option>
                      <option value={TransactionType.INCOME}>{t('income')}</option>
                      <option value={TransactionType.TRANSFER}>{language === 'ru' ? 'Перевод' : 'Transfer'}</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* FROM ACCOUNT */}
                <div>
                  <label htmlFor="accountId" className="block text-sm font-medium text-zinc-300 mb-1.5">
                    {isTransfer ? (language === 'ru' ? 'Списать со счета' : 'From Account') : t('account')}
                  </label>
                  <div className="relative">
                    <select id="accountId" name="accountId" value={formData.accountId || ''} onChange={handleChange} required className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50">
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.currency})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* TO ACCOUNT (ONLY FOR TRANSFER) */}
                <AnimatePresence>
                  {isTransfer && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mb-4">
                        <label htmlFor="toAccountId" className="block text-sm font-medium text-zinc-300 mb-1.5">{language === 'ru' ? 'Зачислить на счет' : 'To Account'}</label>
                        <div className="relative">
                          <select id="toAccountId" name="toAccountId" value={formData.toAccountId || ''} onChange={handleChange} required={isTransfer} className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50">
                            <option value="" disabled>{language === 'ru' ? 'Выберите счет' : 'Select Account'}</option>
                            {accounts.filter(acc => acc.id !== formData.accountId).map((acc) => (<option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <InputField label={t('name')} name="name" value={formData.name} onChange={handleChange} required disabled={isSavingsDeposit || isSubmitting} />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label={t('amount')} name="amount" value={amountStr} onChange={handleChange} type="text" inputMode="decimal" required disabled={isSubmitting} />
                  <div>
                    <label htmlFor="currency" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('currency')}</label>
                    <div className="relative">
                      <select id="currency" name="currency" value={formData.currency} onChange={handleChange} required className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50">
                        {currencyOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* CATEGORY */}
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
                        disabled={isSavingsDeposit || isCategoryLocked || isSubmitting}
                        className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                      >
                        {sortedCategoryNames.map((c) => (
                          <option key={c} value={c}>
                            {getLocalizedCategoryName(c, language)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* DEBT SELECTOR OR NEW DEBT INPUT */}
                <AnimatePresence>
                  {isDebtRelated && !isTransfer && (
                    <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
                      <div className="pt-2">
                        <label htmlFor="debtId" className="block text-sm font-medium text-zinc-300 mb-1.5">
                          {isCreatingDebt ? (language === 'ru' ? 'Имя человека' : 'Person Name') : (language === 'ru' ? 'Связанный долг *' : 'Related Debt *')}
                        </label>

                        {isCreatingDebt ? (
                          <div className="relative">
                            <input
                              type="text"
                              name="newDebtPerson"
                              // ВАЖНО: Привязываем к отдельному стейту
                              value={newDebtPerson}
                              onChange={handleChange}
                              placeholder={language === 'ru' ? "Кому / От кого" : "Person Name"}
                              required
                              disabled={isSubmitting}
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pl-10 disabled:bg-zinc-700/50"
                            />
                            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />

                            {/* Кнопка отмены создания нового, если категория позволяет */}
                            {!(formData.category === DEBT_SYSTEM_CATEGORIES.LENDING || formData.category === DEBT_SYSTEM_CATEGORIES.BORROWING) && (
                              <button
                                type="button"
                                onClick={() => { setIsCreatingDebt(false); setNewDebtPerson(''); setFormData(p => ({ ...p, debtId: '' })) }}
                                disabled={isSubmitting}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 hover:text-blue-300 px-2 py-1 disabled:opacity-50"
                              >
                                {language === 'ru' ? 'Выбрать' : 'Select'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              id="debtId"
                              name="debtId"
                              value={formData.debtId || ''}
                              onChange={handleChange}
                              required={!isCreatingDebt}
                              disabled={isCategoryLocked || isSubmitting}
                              className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                            >
                              <option value="" disabled>{language === 'ru' ? 'Выберите долг' : 'Select Debt'}</option>
                              <option value="NEW_DEBT" className="text-blue-400 font-semibold">
                                + {language === 'ru' ? 'Создать новый долг' : 'Create New Debt'}
                              </option>
                              <optgroup label={language === 'ru' ? 'Активные долги' : 'Active Debts'}>
                                {debts.filter(d => d.status === DebtStatus.ACTIVE).map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.person} ({formatCurrency(d.current_amount, d.currency)})
                                  </option>
                                ))}
                              </optgroup>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* WIDGET: DEBT CARD (Moved here from above) */}
                <AnimatePresence>
                  {debtWidgetData && !isCreatingDebt && (
                    <motion.div
                      layout
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className={`mt-4 rounded-2xl p-4 border relative overflow-hidden ${debtWidgetData.isIOwe
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-green-500/10 border-green-500/30'
                        }`}
                    >
                      <div className="relative z-10">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl backdrop-blur-sm ${debtWidgetData.isIOwe ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                              }`}>
                              {debtWidgetData.isIOwe ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
                            </div>
                            <div>
                              <p className={`text-xs uppercase tracking-wider font-medium ${debtWidgetData.isIOwe ? 'text-red-300' : 'text-green-300'
                                }`}>
                                {debtWidgetData.isIOwe ? (language === 'ru' ? 'Я должен' : 'I Owe') : (language === 'ru' ? 'Мне должны' : 'Owed to Me')}
                              </p>
                              <p className="text-white font-bold text-lg leading-tight">{debtWidgetData.person}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-zinc-400 text-xs">{language === 'ru' ? 'Остаток' : 'Remaining'}</p>
                            <p className="text-white font-bold text-lg">
                              {formatCurrency(debtWidgetData.current, debtWidgetData.currency)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
                            <div
                              className={`h-2.5 rounded-full transition-all duration-500 ease-out ${debtWidgetData.isIOwe ? 'bg-red-500' : 'bg-green-500'
                                }`}
                              style={{ width: `${Math.min(100, ((debtWidgetData.total - debtWidgetData.current) / debtWidgetData.total) * 100)}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between items-center text-xs text-zinc-400">
                            <span>{language === 'ru' ? 'Всего: ' : 'Total: '}{formatCurrency(debtWidgetData.total, debtWidgetData.currency)}</span>
                            {parseFloat(amountStr) > 0 && (
                              <span className="text-white font-medium flex items-center gap-1">
                                <span>→</span>
                                {formatCurrency(debtWidgetData.projected, debtWidgetData.currency)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SAVINGS SELECTOR */}
                <AnimatePresence>
                  {isSavingsTransaction && !isTransfer && (
                    <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="overflow-hidden">
                      <div className="pt-2">
                        <label htmlFor="goalId" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('savingsGoal')}</label>
                        <div className="relative">
                          <select id="goalId" name="goalId" value={formData.goalId || ''} onChange={handleChange} required disabled={isSavingsDeposit || isSubmitting} className="appearance-none w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent transition-all duration-200 pr-10 disabled:bg-zinc-700/50 disabled:cursor-not-allowed">
                            <option value="" disabled>{t('selectGoal')}</option>
                            {savingsGoals.map((goal) => (<option key={goal.id} value={goal.id}>{goal.name}</option>))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* BUDGET WIDGET */}
                <AnimatePresence>
                  {budgetInfo && !isSavingsTransaction && !isTransfer && (
                    <motion.div layout initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden">
                      {budgetInfo.type === 'exists' && (
                        <div className="mt-2 bg-zinc-800 p-3 rounded-xl border border-zinc-700/50 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-700 rounded-lg"><IconDisplay name={budgetInfo.budget.icon} className="w-5 h-5 text-white" /></div>
                            <div className="flex-grow min-w-0">
                              <p className="text-sm font-medium text-white truncate">{budgetInfo.budget.category} Budget</p>
                              <p className="text-xs text-zinc-400">{formatCurrency(budgetInfo.spent, budgetInfo.budget.currency)} of {formatCurrency(budgetInfo.budget.limit, budgetInfo.budget.currency)}</p>
                            </div>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-1.5"><div className={`h-1.5 rounded-full ${budgetInfo.progress > 85 ? 'bg-red-500' : 'bg-brand-blue'}`} style={{ width: `${Math.min(budgetInfo.progress, 100)}%` }} /></div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-5 gap-4">
                  <div className="col-span-3">
                    <label htmlFor="date-button" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('date')}</label>
                    <button type="button" disabled={isSubmitting} id="date-button" onClick={() => setIsDatePickerOpen(true)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 disabled:bg-zinc-700/50">
                      <span>{safeDate.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      <Calendar className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="time-button" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('time')}</label>
                    <button type="button" disabled={isSubmitting} id="time-button" onClick={() => setIsTimePickerOpen(true)} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 disabled:bg-zinc-700/50">
                      <span>{safeDate.toTimeString().slice(0, 5)}</span>
                      <Clock className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('descriptionOptional')}</label>
                  <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={2} disabled={isSubmitting} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 resize-none disabled:bg-zinc-700/50" />
                </div>
              </div>
            </fieldset>

            <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (isSavingsTransaction && !formData.goalId)}
                className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200 disabled:bg-zinc-600 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
              setFormData(prev => ({ ...prev, date: newTime.toISOString() }));
              setIsTimePickerOpen(false);
            }}
            initialTime={safeDate}
          />
        }
      </AnimatePresence>
    </>
  );
};