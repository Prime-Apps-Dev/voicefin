import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Banknote, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';
import { Transaction, SavingsGoal, ExchangeRates, TransactionType } from '../types';
import { convertCurrency } from '../services/currency';
import { DatePicker } from './DatePicker';
import * as api from '../services/api';


interface AnalyticsScreenProps {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  defaultCurrency: string;
  rates: ExchangeRates;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

// Animation Variants
const zoomInOut = {
  initial: { scale: 0.95, opacity: 0 },
  whileInView: { scale: 1, opacity: 1, transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1] } }
};

const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const formatDateRange = (start: Date, end: Date, language: string): string => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';

    if (isSameDay(start, end)) {
        return start.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
    }

    const isFullSingleMonth = start.getDate() === 1 &&
                              new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate() === end.getDate() &&
                              start.getFullYear() === end.getFullYear() &&
                              start.getMonth() === end.getMonth();

    if (isFullSingleMonth) {
        return start.toLocaleString(locale, { month: 'long', year: 'numeric' });
    }
    
    const isFullSingleYear = start.getDate() === 1 && start.getMonth() === 0 &&
                             end.getDate() === 31 && end.getMonth() === 11 &&
                             start.getFullYear() === end.getFullYear();

    if (isFullSingleYear) {
        return start.getFullYear().toString();
    }


    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const yearOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    if (start.getFullYear() !== end.getFullYear()) {
        return `${start.toLocaleDateString(locale, yearOptions)} - ${end.toLocaleDateString(locale, yearOptions)}`;
    }

    return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}`;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ transactions, savingsGoals, defaultCurrency, rates }) => {
  const { t, language } = useLocalization();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');

  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  });

  const handleDateApply = useCallback((newStart: Date, newEnd: Date) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    setIsDatePickerOpen(false);
    setAiInsights(null);
  }, []);

  const handlePeriodChange = (direction: 'prev' | 'next') => {
    const newStartDate = new Date(startDate);
    const newEndDate = new Date(endDate);
    const offset = direction === 'prev' ? -1 : 1;

    switch (period) {
      case 'day':
        newStartDate.setDate(newStartDate.getDate() + offset);
        newEndDate.setDate(newEndDate.getDate() + offset);
        break;
      case 'week':
        newStartDate.setDate(newStartDate.getDate() + 7 * offset);
        newEndDate.setDate(newEndDate.getDate() + 7 * offset);
        break;
      case 'month':
        newStartDate.setMonth(newStartDate.getMonth() + offset, 1);
        newEndDate.setFullYear(newStartDate.getFullYear());
        newEndDate.setMonth(newStartDate.getMonth() + 1, 0);
        newEndDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        const targetYear = newStartDate.getFullYear() + offset;
        newStartDate.setFullYear(targetYear, 0, 1);
        newEndDate.setFullYear(targetYear, 11, 31);
        newEndDate.setHours(23, 59, 59, 999);
        break;
    }
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setAiInsights(null);
  };

  const setDateRangeForPeriod = (newPeriod: typeof period) => {
    const now = new Date();
    let newStart: Date;
    let newEnd: Date;

    switch (newPeriod) {
        case 'day':
            newStart = new Date(now.setHours(0, 0, 0, 0));
            newEnd = new Date(now.setHours(23, 59, 59, 999));
            break;
        case 'week':
            const dayOfWeek = now.getDay();
            const firstDayOfWeek = new Date(now);
            firstDayOfWeek.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday is the first day of the week
            firstDayOfWeek.setHours(0, 0, 0, 0);

            newStart = firstDayOfWeek;
            newEnd = new Date(newStart);
            newEnd.setDate(newEnd.getDate() + 6);
            newEnd.setHours(23, 59, 59, 999);
            break;
        case 'year':
            newStart = new Date(now.getFullYear(), 0, 1);
            newEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        case 'month':
        default:
            newStart = new Date(now.getFullYear(), now.getMonth(), 1);
            newEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
    }
    setStartDate(newStart);
    setEndDate(newEnd);
    setPeriod(newPeriod);
    setAiInsights(null);
  };

  const isNextDisabled = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const nextPeriodStartDate = new Date(startDate);
    nextPeriodStartDate.setHours(0, 0, 0, 0);

    switch (period) {
      case 'day':
        nextPeriodStartDate.setDate(nextPeriodStartDate.getDate() + 1);
        break;
      case 'week':
        nextPeriodStartDate.setDate(nextPeriodStartDate.getDate() + 7);
        break;
      case 'month':
        nextPeriodStartDate.setMonth(nextPeriodStartDate.getMonth() + 1, 1); // Set to day 1 of next month
        break;
      case 'year':
        nextPeriodStartDate.setFullYear(nextPeriodStartDate.getFullYear() + 1, 0, 1); // Set to Jan 1 of next year
        break;
    }
    
    return nextPeriodStartDate > now;
  }, [startDate, period]);


  const periodData = useMemo(() => {
    const periodTransactions = transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      return txDate >= startOfDay && txDate <= endDate;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals: { [key: string]: number } = {};

    periodTransactions.forEach(tx => {
      const amountInDefault = convertCurrency(tx.amount, tx.currency, defaultCurrency, rates);
      if (tx.type === TransactionType.INCOME) {
        totalIncome += amountInDefault;
      } else {
        totalExpense += amountInDefault;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amountInDefault;
      }
    });
    
    const sortedCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      totalIncome,
      totalExpense,
      netSavings: totalIncome - totalExpense,
      topCategories: sortedCategories,
    };
  }, [transactions, defaultCurrency, rates, startDate, endDate]);


  const handleGenerateAnalysis = async () => {
    setIsGenerating(true);
    setAiInsights(null);
    try {
        const payload = {
            language,
            dateRange: formatDateRange(startDate, endDate, language),
            totalIncome: formatCurrency(periodData.totalIncome, defaultCurrency),
            totalExpense: formatCurrency(periodData.totalExpense, defaultCurrency),
            netSavings: formatCurrency(periodData.netSavings, defaultCurrency),
            topCategories: periodData.topCategories.map(([name, amount]) => [name, formatCurrency(amount, defaultCurrency)]),
            totalInSavingsGoals: formatCurrency(savingsGoals.reduce((sum, g) => sum + convertCurrency(g.currentAmount, g.currency, defaultCurrency, rates), 0), defaultCurrency)
        };
        
        const analysis = await api.generateFinancialAnalysis(transactions, language);
        setAiInsights(aiInsights);
    } catch (error) {
        console.error("Failed to generate financial analysis:", error);
        setAiInsights("Sorry, I couldn't generate an analysis at this moment. Please try again later.");
    } finally {
        setIsGenerating(false);
    }
  };

  const periodTypes: Array<'day' | 'week' | 'month' | 'year'> = ['day', 'week', 'month', 'year'];

  return (

    <div className="min-h-screen bg-gray-900 pb-32 pt-4">
        <div className="px-6 pb-6 space-y-4">
            <h1 className="text-2xl font-bold text-white mb-2">{t('analyticsTitle')}</h1>

             {/* Date Controls */}
            <motion.div variants={zoomInOut} whileInView="whileInView" viewport={{ once: true }} className="bg-gray-800/70 backdrop-blur-sm rounded-3xl p-4 border border-gray-700/50 space-y-4">
                <div className="flex justify-around bg-gray-700 p-1 rounded-full text-sm">
                    {periodTypes.map(p => (
                        <button
                            key={p}
                            onClick={() => setDateRangeForPeriod(p)}
                            className={`w-full py-1.5 rounded-full transition-colors capitalize ${period === p ? 'bg-brand-green text-white font-semibold' : 'text-gray-300 hover:bg-gray-600'}`}
                        >
                            {t(p)}
                        </button>
                    ))}
                </div>
                <div className="flex items-center justify-between">
                    <button onClick={() => handlePeriodChange('prev')} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><ChevronLeft className="w-6 h-6"/></button>
                    <button 
                        onClick={() => setIsDatePickerOpen(true)}
                        className="flex-grow text-center p-2 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <span className="font-semibold text-white">{formatDateRange(startDate, endDate, language)}</span>
                    </button>
                    <button 
                        onClick={() => handlePeriodChange('next')} 
                        disabled={isNextDisabled}
                        className="p-2 rounded-full hover:bg-gray-700 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed"
                    >
                        <ChevronRight className="w-6 h-6"/>
                    </button>
                </div>
            </motion.div>

            {/* Income vs Expense Summary */}
            <motion.div className="bg-gray-800/70 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50" variants={zoomInOut} whileInView="whileInView" viewport={{ once: true }}>
                <h2 className="text-xl font-semibold text-gray-100 mb-4">{t('incomeVsExpense')}</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3"><div className="p-2 bg-green-500/10 rounded-lg"><ArrowUp className="w-5 h-5 text-green-400"/></div><span className="text-gray-300">{t('income')}</span></div>
                       <span className="font-semibold text-green-400">{formatCurrency(periodData.totalIncome, defaultCurrency)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3"><div className="p-2 bg-red-500/10 rounded-lg"><ArrowDown className="w-5 h-5 text-red-400"/></div><span className="text-gray-300">{t('expense')}</span></div>
                       <span className="font-semibold text-red-400">{formatCurrency(periodData.totalExpense, defaultCurrency)}</span>
                    </div>
                     <div className="border-t border-gray-700 my-2"></div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3"><div className="p-2 bg-blue-500/10 rounded-lg"><Banknote className="w-5 h-5 text-blue-400"/></div><span className="font-semibold text-white">{t('netSavings')}</span></div>
                       <span className={`font-bold text-lg ${periodData.netSavings >= 0 ? 'text-white' : 'text-red-400'}`}>{formatCurrency(periodData.netSavings, defaultCurrency)}</span>
                    </div>
                </div>
            </motion.div>
            
            {/* Spending by Category */}
            <motion.div className="bg-gray-800/70 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50" variants={zoomInOut} whileInView="whileInView" viewport={{ once: true }}>
                <h2 className="text-xl font-semibold text-gray-100 mb-4">{t('spendingByCategory')}</h2>
                {periodData.topCategories.length > 0 ? (
                  <div className="space-y-4">
                      {periodData.topCategories.map(([category, amount]) => {
                          const percentage = periodData.totalExpense > 0 ? (amount / periodData.totalExpense) * 100 : 0;
                          return (
                              <div key={category}>
                                  <div className="flex justify-between text-sm mb-1">
                                      <span className="text-gray-300">{category}</span>
                                      <span className="text-gray-400">{formatCurrency(amount, defaultCurrency)}</span>
                                  </div>
                                  <div className="w-full bg-gray-700 rounded-full h-2">
                                      <div className="bg-brand-purple h-2 rounded-full" style={{ width: `${percentage}%` }} />
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">{t('noTransactions')}</p>
                )}
            </motion.div>
            
             {/* AI Financial Advisor */}
            <motion.div className="bg-gray-800/70 backdrop-blur-sm rounded-3xl p-6 border border-gray-700/50" variants={zoomInOut} whileInView="whileInView" viewport={{ once: true }}>
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-yellow-400/10 rounded-2xl">
                        <Sparkles className="w-6 h-6 text-yellow-400"/>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-100">{t('aiFinancialAdvisor')}</h2>
                        <p className="text-gray-400 text-sm mt-1">{t('getInsights')}</p>
                    </div>
                </div>
                
                <div className="mt-6">
                    {aiInsights ? (
                         <motion.div 
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           className="text-gray-300 whitespace-pre-wrap prose prose-sm text-sm"
                           style={{ wordWrap: 'break-word' }}
                           dangerouslySetInnerHTML={{ __html: aiInsights.replace(/### (.*)/g, '<h3 class="text-white font-semibold text-base mt-3 mb-1">$1</h3>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\* ([^*]+)/g, '<li class="ml-4 mb-1 list-disc">$1</li>') }}
                        />
                    ) : (
                         <button
                            onClick={handleGenerateAnalysis}
                            disabled={isGenerating}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed"
                         >
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                                    <span>{t('analyzingData')}</span>
                                </>
                            ) : (
                                <span>{t('generateAnalysis')}</span>
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
        <DatePicker
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onApply={handleDateApply}
            initialStartDate={startDate}
            initialEndDate={endDate}
        />
    </div>
  );
};