import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Budget, Transaction, TransactionType, Category, ExchangeRates } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import { ChevronLeft, ChevronRight, Plus, Target } from 'lucide-react';
import { BudgetCard } from './BudgetCard';
import { convertCurrency } from '../services/currency';

interface BudgetPlanningScreenProps {
    budgets: Budget[];
    transactions: Transaction[];
    categories: Category[];
    onBack: () => void;
    onAddBudget: (monthkey: string) => void;
    onEditBudget: (budget: Budget) => void;
    onDeleteBudget: (budget: Budget) => void;
    onAddTransaction: (budget: Budget) => void;
    onViewHistory: (budget: Budget) => void;
    onCarryOver: (fromMonth: string, toMonth: string) => void;
    rates: ExchangeRates;
    defaultCurrency: string;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export const BudgetPlanningScreen: React.FC<BudgetPlanningScreenProps> = (props) => {
    const { 
        budgets, transactions, onBack, onAddBudget, onEditBudget, 
        onDeleteBudget, onAddTransaction, onViewHistory, onCarryOver,
        rates, defaultCurrency
    } = props;
    const { t, language } = useLocalization();
    const [selectedDate, setSelectedDate] = useState(new Date());

    const currentmonthkey = useMemo(() => `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`, [selectedDate]);

    useEffect(() => {
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        
        const monthlyBudgets = budgets.filter(b => b.monthkey === currentmonthkey);

        if (selectedMonthStart > currentMonthStart && monthlyBudgets.length === 0) {
            const prevDate = new Date(selectedDate);
            prevDate.setMonth(prevDate.getMonth() - 1);
            const prevmonthkey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
            const prevMonthBudgets = budgets.filter(b => b.monthkey === prevmonthkey);
            if (prevMonthBudgets.length > 0) {
                onCarryOver(prevmonthkey, currentmonthkey);
            }
        }
    }, [selectedDate, budgets, currentmonthkey, onCarryOver]);

    const monthlyBudgets = useMemo(() => budgets.filter(b => b.monthkey === currentmonthkey), [budgets, currentmonthkey]);
    
    const getSpentAmount = (budget: Budget) => {
        return transactions
            .filter(t => {
                const txDate = new Date(t.date);
                return t.category === budget.category &&
                       t.type === TransactionType.EXPENSE &&
                       txDate.getFullYear() === selectedDate.getFullYear() &&
                       txDate.getMonth() === selectedDate.getMonth();
            })
            .reduce((sum, t) => {
                const amountInBudgetCurrency = convertCurrency(t.amount, t.currency, budget.currency, rates);
                return sum + amountInBudgetCurrency;
            }, 0);
    };

    const changeMonth = (direction: number) => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(15); // Avoid month-end issues
            newDate.setMonth(newDate.getMonth() + direction);
            return newDate;
        });
    };

    const monthlySummary = useMemo(() => {
        const totalPlanned = monthlyBudgets.reduce((sum, b) => sum + convertCurrency(b.limit, b.currency, defaultCurrency, rates), 0);
        
        const relevantTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return t.type === TransactionType.EXPENSE &&
                   txDate.getFullYear() === selectedDate.getFullYear() &&
                   txDate.getMonth() === selectedDate.getMonth() &&
                   monthlyBudgets.some(b => b.category === t.category);
        });
        
        const totalSpent = relevantTransactions.reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, defaultCurrency, rates), 0);

        return { totalPlanned, totalSpent };
    }, [monthlyBudgets, transactions, selectedDate, defaultCurrency, rates]);
    
    const sortedBudgets = useMemo(() => {
        return [...monthlyBudgets].sort((a, b) => {
          const spentA = getSpentAmount(a);
          const spentB = getSpentAmount(b);
          const progressA = a.limit > 0 ? (spentA / a.limit) * 100 : 0;
          const progressB = b.limit > 0 ? (spentB / b.limit) * 100 : 0;
          
          const isOverA = spentA > a.limit;
          const isOverB = spentB > b.limit;

          if(isOverA && !isOverB) return -1;
          if(!isOverA && isOverB) return 1;

          return progressB - progressA;
        });
      }, [monthlyBudgets, transactions, selectedDate, rates]);


    return (
        <div className="min-h-screen bg-gray-900 flex flex-col pb-24">
            <header className="px-4 pt-8 pb-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeft className="w-6 h-6 text-white" /></button>
                <h1 className="text-xl font-bold text-white">{t('budgetPlanningTitle')}</h1>
                <button onClick={() => onAddBudget(currentmonthkey)} className="p-2 rounded-full hover:bg-gray-700" aria-label={t('addBudget')}><Plus className="w-6 h-6 text-white" /></button>
            </header>
            <main className="flex-grow px-4 space-y-6">
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-2xl p-4 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronLeft className="w-5 h-5" /></button>
                        <span className="font-semibold text-white text-lg">{selectedDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}</span>
                        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                <motion.div
                    key={currentmonthkey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-green-500 to-green-700 rounded-3xl p-6 text-white shadow-lg"
                >
                    <h2 className="text-sm font-medium opacity-80 mb-2">{t('budgetOverview')}</h2>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <div className="text-xs opacity-70">{t('totalBudget')}</div>
                            <div className="text-lg font-bold">{formatCurrency(monthlySummary.totalPlanned, defaultCurrency)}</div>
                        </div>
                        <div>
                            <div className="text-xs opacity-70">{t('spent')}</div>
                            <div className="text-lg font-bold">{formatCurrency(monthlySummary.totalSpent, defaultCurrency)}</div>
                        </div>
                        <div>
                            <div className="text-xs opacity-70">{t('remaining')}</div>
                            <div className="text-lg font-bold">{formatCurrency(monthlySummary.totalPlanned - monthlySummary.totalSpent, defaultCurrency)}</div>
                        </div>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 mt-4">
                        <div
                            className="bg-white h-2 rounded-full"
                            style={{ width: `${monthlySummary.totalPlanned > 0 ? Math.min((monthlySummary.totalSpent / monthlySummary.totalPlanned) * 100, 100) : 0}%` }}
                        ></div>
                    </div>
                </motion.div>

                <div>
                    <h2 className="text-lg font-semibold text-white mb-4 px-2">{t('budgetCategories')}</h2>
                    {sortedBudgets.length > 0 ? (
                        <div className="space-y-4">
                            {sortedBudgets.map(budget => (
                                <BudgetCard
                                    key={budget.id}
                                    budget={budget}
                                    spent={getSpentAmount(budget)}
                                    onTap={onAddTransaction}
                                    onDoubleTap={onViewHistory}
                                    onLongPress={onEditBudget}
                                    onSwipeLeft={onDeleteBudget}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-gray-800 rounded-2xl border border-gray-700/50">
                            <Target className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-white">{t('noBudgetsForMonth', { month: selectedDate.toLocaleDateString(language, { month: 'long' }) })}</h3>
                            <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto">{t('noBudgetsDescription')}</p>
                            <button onClick={() => onAddBudget(currentmonthkey)} className="mt-4 px-5 py-2.5 bg-brand-blue text-white text-sm font-medium rounded-xl hover:bg-blue-500">{t('createBudget')}</button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};