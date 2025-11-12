import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Transaction, Account, Category, ExchangeRates, TransactionType } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { ChevronLeft, Search, SlidersHorizontal, ArrowDownUp, X } from 'lucide-react';
import { TransactionItem } from './TransactionItem';
import { FilterModal, Filters } from './FilterModal';
import { convertCurrency } from '../services/currency';

interface TransactionHistoryScreenProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  rates: ExchangeRates;
  defaultCurrency: string;
  onSelectTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onBack: () => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export const TransactionHistoryScreen: React.FC<TransactionHistoryScreenProps> = (props) => {
  const {
    transactions, accounts, categories, rates,
    defaultCurrency, onSelectTransaction, onDeleteTransaction, onBack
  } = props;
  const { t } = useLocalization();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  const initialFilters = useMemo((): Filters => ({
    type: 'all',
    selectedCategories: [],
    selectedAccounts: [],
    amountFilter: {
      min: null,
      max: null,
      currency: defaultCurrency,
    },
  }), [defaultCurrency]);

  const [filters, setFilters] = useState<Filters>(initialFilters);

  const accountsById = useMemo(() => Object.fromEntries(accounts.map(acc => [acc.id, acc])), [accounts]);

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...transactions];

    // Search
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(tx =>
        tx.name.toLowerCase().includes(lowercasedTerm) ||
        tx.description?.toLowerCase().includes(lowercasedTerm) ||
        tx.category.toLowerCase().includes(lowercasedTerm)
      );
    }

    // Filters
    if (filters.type !== 'all') {
      filtered = filtered.filter(tx => tx.type.toLowerCase() === filters.type);
    }
    if (filters.selectedAccounts.length > 0) {
      filtered = filtered.filter(tx => filters.selectedAccounts.includes(tx.accountid));
    }
    if (filters.selectedCategories.length > 0) {
      filtered = filtered.filter(tx => filters.selectedCategories.includes(tx.category));
    }
    
    const { min, max, currency: filterCurrency } = filters.amountFilter;
    if ((min !== null && min !== '') || (max !== null && max !== '')) {
      filtered = filtered.filter(tx => {
        const amountInFilterCurrency = convertCurrency(tx.amount, tx.currency, filterCurrency, rates);
        const minCheck = (min !== null && min !== '') ? amountInFilterCurrency >= Number(min) : true;
        const maxCheck = (max !== null && max !== '') ? amountInFilterCurrency <= Number(max) : true;
        return minCheck && maxCheck;
      });
    }

    // Sort
    switch (sortOption) {
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'amount-desc':
        filtered.sort((a, b) => {
            const amountB = convertCurrency(b.amount, b.currency, defaultCurrency, rates);
            const amountA = convertCurrency(a.amount, a.currency, defaultCurrency, rates);
            return amountB - amountA;
        });
        break;
      case 'amount-asc':
        filtered.sort((a, b) => {
            const amountA = convertCurrency(a.amount, a.currency, defaultCurrency, rates);
            const amountB = convertCurrency(b.amount, b.currency, defaultCurrency, rates);
            return amountA - amountB;
        });
        break;
      case 'date-desc':
      default:
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }

    return filtered;
  }, [transactions, searchTerm, sortOption, filters, defaultCurrency, rates]);
  
  const totalAmount = useMemo(() => {
    return filteredAndSortedTransactions.reduce((acc, tx) => {
        const amount = convertCurrency(tx.amount, tx.currency, defaultCurrency, rates);
        return acc + (tx.type === TransactionType.INCOME ? amount : -amount);
    }, 0);
  }, [filteredAndSortedTransactions, defaultCurrency, rates]);

  const cycleSortOption = () => {
    const options: SortOption[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
    const currentIndex = options.indexOf(sortOption);
    setSortOption(options[(currentIndex + 1) % options.length]);
  };
  
  const getSortLabel = () => {
    switch(sortOption) {
      case 'date-desc': return t('dateNewest');
      case 'date-asc': return t('dateOldest');
      case 'amount-desc': return t('amountHighLow');
      case 'amount-asc': return t('amountLowHigh');
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <header className="px-4 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{t('transactionHistory')}</h1>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-grow flex flex-col pb-24">
        <div className="px-4 pt-2 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchTransactions')}
              className="w-full bg-gray-800 border-gray-700 rounded-xl py-3 pl-12 pr-10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-700">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {/* Filter/Sort Buttons */}
          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center justify-center gap-2 py-3 bg-gray-800 rounded-xl text-white font-medium hover:bg-gray-700">
                 <SlidersHorizontal className="w-4 h-4"/>
                 <span>{t('filters')}</span>
             </button>
             <button onClick={cycleSortOption} className="flex items-center justify-center gap-2 py-3 bg-gray-800 rounded-xl text-white font-medium hover:bg-gray-700">
                 <ArrowDownUp className="w-4 h-4"/>
                 <span className="truncate text-sm">{getSortLabel()}</span>
             </button>
          </div>
          
           {/* Results Summary */}
           <div className="px-2 text-sm text-gray-400 flex justify-between">
                <span>{t('resultsSummary', { count: filteredAndSortedTransactions.length })}</span>
                <span>{t('total')}: <span className="font-semibold text-white">{new Intl.NumberFormat(undefined, {style: 'currency', currency: defaultCurrency}).format(totalAmount)}</span></span>
           </div>
        </div>

        <div className="flex-grow overflow-y-auto px-4 py-2">
            <AnimatePresence>
                {filteredAndSortedTransactions.length > 0 ? (
                    <motion.ul
                        className="space-y-3"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          hidden: { opacity: 0 },
                          visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
                        }}
                    >
                        {filteredAndSortedTransactions.map(tx => (
                            <motion.li key={tx.id} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
                                <TransactionItem
                                    transaction={tx}
                                    account={accountsById[tx.accountid]}
                                    onSelect={onSelectTransaction}
                                    onDelete={onDeleteTransaction}
                                    rates={rates}
                                />
                            </motion.li>
                        ))}
                    </motion.ul>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20 px-6 text-gray-500"
                    >
                        <Search className="w-16 h-16 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-200 mb-2">{t('noTransactionsFound')}</h3>
                        <p>{t('tryDifferentFilters')}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </main>
      
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        onApply={setFilters}
        initialFilters={filters}
        accounts={accounts}
        categories={categories}
        defaultCurrency={defaultCurrency}
      />
    </div>
  );
};
