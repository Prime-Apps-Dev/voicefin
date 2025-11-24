import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Account, Category, TransactionType } from '../../../core/types';
import { useLocalization } from '../../../core/context/LocalizationContext';
import { X } from 'lucide-react';
import { COMMON_CURRENCIES } from '../../../utils/constants';

export interface Filters {
  type: 'all' | 'income' | 'expense';
  selectedCategories: string[];
  selectedAccounts: string[];
  amountFilter: {
    min: number | string | null;
    max: number | string | null;
    currency: string;
  };
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  initialFilters: Filters;
  accounts: Account[];
  categories: Category[];
  defaultCurrency: string;
}

export const FilterModal: React.FC<FilterModalProps> = (props) => {
  const { isOpen, onClose, onApply, initialFilters, accounts, categories, defaultCurrency } = props;
  const { t } = useLocalization();
  const [filters, setFilters] = useState<Filters>(initialFilters);

  useEffect(() => {
    if (isOpen) {
      setFilters(initialFilters);
    }
  }, [isOpen, initialFilters]);

  const handleApply = () => {
    onApply({
      ...filters,
      amountFilter: {
        ...filters.amountFilter,
        min: Number(filters.amountFilter.min) || null,
        max: Number(filters.amountFilter.max) || null,
      }
    });
    onClose();
  };

  const handleReset = () => {
    const freshFilters: Filters = {
      type: 'all',
      selectedCategories: [],
      selectedAccounts: [],
      amountFilter: { min: '', max: '', currency: defaultCurrency },
    };
    setFilters(freshFilters);
    onApply(freshFilters);
    onClose();
  };

  const toggleSelection = (key: 'selectedCategories' | 'selectedAccounts', value: string) => {
    setFilters(prev => {
      const currentSelection = prev[key];
      const newSelection = currentSelection.includes(value)
        ? currentSelection.filter(item => item !== value)
        : [...currentSelection, value];
      return { ...prev, [key]: newSelection };
    })
  }

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.name.localeCompare(b.name)), [categories]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] px-4 py-[56px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full h-full overflow-hidden flex flex-col border border-zinc-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white tracking-tight">{t('filterTransactions')}</h2>
              <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-zinc-800"><X className="w-5 h-5 text-zinc-400" /></button>
            </header>

            <main className="overflow-y-auto px-6 py-4 space-y-6">
              {/* Transaction Type */}
              <section>
                <h3 className="text-base font-semibold text-zinc-200 mb-3">{t('transactionType')}</h3>
                <div className="grid grid-cols-3 gap-2 p-1 bg-zinc-800 rounded-full">
                  <button onClick={() => setFilters(f => ({ ...f, type: 'all' }))} className={`py-2 rounded-full text-sm font-medium ${filters.type === 'all' ? 'bg-brand-green text-white' : 'text-zinc-300 hover:bg-zinc-700'}`}>{t('all')}</button>
                  <button onClick={() => setFilters(f => ({ ...f, type: 'income' }))} className={`py-2 rounded-full text-sm font-medium ${filters.type === 'income' ? 'bg-brand-green text-white' : 'text-zinc-300 hover:bg-zinc-700'}`}>{t('income')}</button>
                  <button onClick={() => setFilters(f => ({ ...f, type: 'expense' }))} className={`py-2 rounded-full text-sm font-medium ${filters.type === 'expense' ? 'bg-brand-green text-white' : 'text-zinc-300 hover:bg-zinc-700'}`}>{t('expense')}</button>
                </div>
              </section>

              {/* Accounts */}
              <section>
                <h3 className="text-base font-semibold text-zinc-200 mb-3">{t('accounts')}</h3>
                <div className="flex flex-wrap gap-2">
                  {accounts.map(acc => (
                    <button key={acc.id} onClick={() => toggleSelection('selectedAccounts', acc.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filters.selectedAccounts.includes(acc.id) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>{acc.name}</button>
                  ))}
                </div>
              </section>

              {/* Categories */}
              <section>
                <h3 className="text-base font-semibold text-zinc-200 mb-3">{t('categories')}</h3>
                <div className="flex flex-wrap gap-2">
                  {sortedCategories.map(cat => (
                    <button key={cat.id} onClick={() => toggleSelection('selectedCategories', cat.name)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filters.selectedCategories.includes(cat.name) ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'}`}>{cat.name}</button>
                  ))}
                </div>
              </section>

              {/* Amount */}
              <section>
                <h3 className="text-base font-semibold text-zinc-200 mb-3">{t('amountRange')}</h3>
                <div className="grid grid-cols-2 gap-3 items-center">
                  <input
                    type="number"
                    placeholder={t('amountLowHigh').split(':')[0]} // Min
                    value={filters.amountFilter.min ?? ''}
                    onChange={e => setFilters(f => ({ ...f, amountFilter: { ...f.amountFilter, min: e.target.value } }))}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder={t('amountHighLow').split(':')[0]} // Max
                    value={filters.amountFilter.max ?? ''}
                    onChange={e => setFilters(f => ({ ...f, amountFilter: { ...f.amountFilter, max: e.target.value } }))}
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl py-3 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="col-span-2">
                    <select
                      value={filters.amountFilter.currency}
                      onChange={e => setFilters(f => ({ ...f, amountFilter: { ...f.amountFilter, currency: e.target.value } }))}
                      className="w-full appearance-none bg-zinc-800 border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </section>
            </main>

            <footer className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-between">
              <button onClick={handleReset} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800">{t('reset')}</button>
              <button onClick={handleApply} className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600">{t('applyFilters')}</button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};