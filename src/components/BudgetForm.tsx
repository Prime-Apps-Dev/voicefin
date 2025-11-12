// src/components/BudgetForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Budget, Category } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { ICONS } from './icons';
import { ChevronDown } from 'lucide-react';
import { COMMON_CURRENCIES } from '../constants';

const defaultState: Omit<Budget, 'id'> = {
  monthKey: '',
  category: '',
  limit: 0,
  icon: 'LayoutGrid',
  currency: 'USD',
};

export const BudgetForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Omit<Budget, 'id'> | Budget) => void;
  budget?: Partial<Budget> | null;
  allCategories: Category[];
  budgetsForMonth: Budget[];
  onCreateNewCategory: () => void;
  defaultCurrency: string;
}> = ({ isOpen, onClose, onSave, budget, allCategories, budgetsForMonth, onCreateNewCategory, defaultCurrency }) => {
  const { t, language } = useLocalization();
  const [formData, setFormData] = useState(defaultState);
  const [limitStr, setLimitStr] = useState('');
  
  // НОВОЕ: Локальное состояние для выпадающих списков
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const availableCategories = useMemo(() => {
    const budgetedCategories = budgetsForMonth
        .filter(b => !budget || b.id !== budget.id) // Исключаем текущий редактируемый бюджет
        .map(b => b.category);
        
    let unbudgeted = allCategories.filter(c => !budgetedCategories.includes(c.name)).map(c => c.name);
    
    // Если мы редактируем, убедимся, что категория этого бюджета доступна в списке
    if (budget && 'category' in budget && budget.category && !unbudgeted.includes(budget.category)) {
        unbudgeted = [budget.category, ...unbudgeted];
    }
    return unbudgeted.sort();
  }, [allCategories, budgetsForMonth, budget]);

  // НОВОЕ: Генерируем списки для выбора
  const currentNumericYear = useMemo(() => new Date().getFullYear(), []);
  const years = useMemo(() => [currentNumericYear - 1, currentNumericYear, currentNumericYear + 1], [currentNumericYear]);

  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(currentNumericYear, i, 15); // Год не важен, нужен для локализации
      const monthName = monthDate.toLocaleDateString(language, { month: 'long' });
      const monthValue = String(i + 1).padStart(2, '0');
      return { name: monthName, value: monthValue };
    });
  }, [language, currentNumericYear]);


  useEffect(() => {
    if (isOpen) {
        let initialMonthKey = '';
        let initialYear = '';
        let initialMonth = '';

        const now = new Date();
        const defaultYear = String(now.getFullYear());
        const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');

        // 1. Проверяем, есть ли monthKey в переданном бюджете (редактирование или создание)
        if (budget && budget.monthKey) {
            initialMonthKey = budget.monthKey;
            const parts = initialMonthKey.split('-');
            if (parts.length === 2) {
              initialYear = parts[0];
              initialMonth = parts[1];
            } else {
              // Fallback, если monthKey в плохом формате
              initialYear = defaultYear;
              initialMonth = defaultMonth;
              initialMonthKey = `${initialYear}-${initialMonth}`;
            }
        } else {
            // 2. Создание нового бюджета, используем текущий год и месяц
            initialYear = defaultYear;
            initialMonth = defaultMonth;
            initialMonthKey = `${initialYear}-${initialMonth}`;
        }
        
        // Устанавливаем состояние для селекторов
        setSelectedYear(initialYear);
        setSelectedMonth(initialMonth);

        const initialData: Partial<Budget> = {
            ...defaultState,
            currency: defaultCurrency,
            ...budget,
            monthKey: initialMonthKey, // Явно устанавливаем monthKey
        };

        if (!initialData.category && availableCategories.length > 0) {
            initialData.category = availableCategories[0];
        }

        if (initialData.category) {
            const categoryDetails = allCategories.find(c => c.name === initialData.category);
            if (categoryDetails) {
                initialData.icon = categoryDetails.icon;
            }
        }

        setFormData(initialData as Budget);
        setLimitStr(String(initialData.limit || ''));
    }
  }, [budget, isOpen, defaultCurrency, allCategories, availableCategories]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    if (value === '__CREATE_NEW__') {
      onCreateNewCategory();
    } else {
      const categoryDetails = allCategories.find(c => c.name === value);
      setFormData(prev => ({ 
          ...prev, 
          category: value,
          icon: categoryDetails ? categoryDetails.icon : 'LayoutGrid'
      }));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'limit') {
      const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      setLimitStr(sanitizedValue);
      setFormData(prev => ({ ...prev, limit: parseFloat(sanitizedValue) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // НОВОЕ: Обработчик для селекторов месяца и года
  const handleMonthYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newMonthKey = '';
    
    if (name === 'year') {
      setSelectedYear(value);
      newMonthKey = `${value}-${selectedMonth}`;
    } else { // name === 'month'
      setSelectedMonth(value);
      newMonthKey = `${selectedYear}-${value}`;
    }
    
    setFormData(prev => ({ ...prev, monthKey: newMonthKey }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.category && formData.limit > 0 && formData.monthKey) {
      onSave(formData);
    }
  };
  
  const IconDisplay: React.FC<{ name: string; className?: string; }> = ({ name, className }) => {
    const IconComponent = ICONS[name] || ICONS.LayoutGrid;
    return <IconComponent className={className} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={onClose}
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
                <h2 className="text-xl font-semibold text-white tracking-tight">{budget && 'id' in budget ? t('editBudget') : t('createBudget')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="px-6 py-6 space-y-4">
                
                {/* НОВЫЙ БЛОК: Выбор месяца и года */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="month" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('month')}</label>
                    <div className="relative">
                      <select name="month" value={selectedMonth} onChange={handleMonthYearChange} required className="w-full appearance-none px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-200 pr-10">
                        {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('year')}</label>
                    <div className="relative">
                      <select name="year" value={selectedYear} onChange={handleMonthYearChange} required className="w-full appearance-none px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-200 pr-10">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('category')}</label>
                  <div className="relative">
                    <select name="category" value={formData.category} onChange={handleCategoryChange} required className="w-full appearance-none px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-200 pr-10">
                      {availableCategories.length > 0 ? (
                        availableCategories.map(c => <option key={c} value={c}>{c}</option>)
                      ) : (
                        <option value="" disabled>No available categories</option>
                      )}
                      <option value="__CREATE_NEW__">＋ Create New Category...</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="limit" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('budgetLimit')}</label>
                        <input type="text" inputMode="decimal" name="limit" value={limitStr} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" />
                    </div>
                    <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('currency')}</label>
                         <div className="relative">
                            <select name="currency" value={formData.currency} onChange={handleChange} required className="w-full appearance-none px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-200 pr-10">
                                {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                        </div>
                    </div>
                 </div>
              </div>

              <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end space-x-3 flex-shrink-0">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200">{t('cancel')}</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-200">{t('save')}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};