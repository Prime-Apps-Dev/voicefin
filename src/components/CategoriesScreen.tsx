import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, Star } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';
import { Category, TransactionType } from '../types';
import { ICONS } from './icons';

interface CategoriesScreenProps {
  categories: Category[];
  onBack: () => void;
  onCreateCategory: (type: TransactionType) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onToggleFavorite: (category: Category) => void;
}

const IconDisplay: React.FC<{ name: string; className?: string; }> = ({ name, className }) => {
    const IconComponent = ICONS[name] || ICONS.LayoutGrid;
    return <IconComponent className={className} />;
};

const CategoryItem: React.FC<{
  category: Category;
  onSelect: (category: Category) => void;
  onToggleFavorite: (category: Category) => void;
  isFavoriteDisabled: boolean;
}> = ({ category, onSelect, onToggleFavorite, isFavoriteDisabled }) => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-center bg-gray-800 p-3 rounded-2xl border border-gray-700/50"
        >
            <button onClick={() => onSelect(category)} className="flex items-center gap-4 flex-grow text-left">
                <div className="w-10 h-10 bg-gray-700 rounded-xl flex items-center justify-center flex-shrink-0">
                    <IconDisplay name={category.icon} className="w-5 h-5 text-gray-300" />
                </div>
                <span className="text-white font-medium truncate">{category.name}</span>
            </button>
            <button
                onClick={() => onToggleFavorite(category)}
                disabled={isFavoriteDisabled && !category.isFavorite}
                className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Toggle favorite"
            >
                <Star className={`w-5 h-5 transition-colors ${category.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-500'}`} />
            </button>
        </motion.div>
    );
};


export const CategoriesScreen: React.FC<CategoriesScreenProps> = (props) => {
  const { categories, onBack, onCreateCategory, onEditCategory, onToggleFavorite } = props;
  const { t, language } = useLocalization();
  const [activeTab, setActiveTab] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');

  const { expenseCategories, incomeCategories, favorites } = useMemo(() => {
    const expenseCats: Category[] = [];
    const incomeCats: Category[] = [];
    const favs: Category[] = [];

    for (const cat of categories) {
        if (cat.type === TransactionType.EXPENSE) {
            expenseCats.push(cat);
        } else {
            incomeCats.push(cat);
        }
        if (cat.isFavorite) {
            favs.push(cat);
        }
    }
    return { expenseCategories: expenseCats, incomeCategories: incomeCats, favorites: favs };
  }, [categories]);
  
  const localeCompare = (a: Category, b: Category) => a.name.localeCompare(b.name, language === 'ru' ? 'ru' : 'en');
  
  const sortedExpenses = useMemo(() => [...expenseCategories].sort(localeCompare), [expenseCategories, language]);
  const sortedIncomes = useMemo(() => [...incomeCategories].sort(localeCompare), [incomeCategories, language]);

  const handleCreate = () => {
    const type = activeTab === 'INCOME' ? TransactionType.INCOME : TransactionType.EXPENSE;
    onCreateCategory(type);
  };
  
  const TabButton = ({ tab, label }: { tab: typeof activeTab; label: string }) => (
    <button
        onClick={() => setActiveTab(tab)}
        className={`w-full py-2 rounded-full text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-brand-green text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}
    >
        {label}
    </button>
  );

  const renderCategoryList = (categoryList: Category[]) => (
      <div className="space-y-3">
          <AnimatePresence>
              {categoryList.map(cat => (
                  <CategoryItem 
                      key={cat.id} 
                      category={cat} 
                      onSelect={onEditCategory}
                      onToggleFavorite={onToggleFavorite}
                      isFavoriteDisabled={favorites.length >= 10}
                  />
              ))}
          </AnimatePresence>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col pb-24">
      <header className="px-4 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{t('categories')}</h1>
        <button onClick={handleCreate} className="p-2 rounded-full hover:bg-gray-700" aria-label={t('addNewCategory')}>
          <Plus className="w-6 h-6 text-white" />
        </button>
      </header>

      <main className="flex-grow px-4 space-y-6">
        <div className="flex justify-center p-1 bg-gray-800 rounded-full">
            <TabButton tab="INCOME" label={t('income')} />
            <TabButton tab="ALL" label={t('allCategories')} />
            <TabButton tab="EXPENSE" label={t('expense')} />
        </div>

        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
            >
                {activeTab === 'ALL' && (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-300 px-2">{t('expense')} {t('categories')}</h2>
                            {renderCategoryList(sortedExpenses)}
                        </div>
                        {sortedIncomes.length > 0 && <div className="border-t border-gray-700/50" />}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-300 px-2">{t('income')} {t('categories')}</h2>
                            {renderCategoryList(sortedIncomes)}
                        </div>
                    </div>
                )}
                {activeTab === 'EXPENSE' && renderCategoryList(sortedExpenses)}
                {activeTab === 'INCOME' && renderCategoryList(sortedIncomes)}
            </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};