import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useLocalization } from '../../core/context/LocalizationContext';
import { formatMoney } from '../../utils/formatMoney';

interface BudgetRolloverModalProps {
    isOpen: boolean;
    onConfirm: (selectedCategories: string[]) => void;
    onSkip: () => void;
    rolloverData: { category: string; amount: number }[] | null;
    defaultCurrency: string;
}

export const BudgetRolloverModal: React.FC<BudgetRolloverModalProps> = ({
    isOpen,
    onConfirm,
    onSkip,
    rolloverData,
    defaultCurrency
}) => {
    const { t, language } = useLocalization();
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && rolloverData) {
            // Select all by default
            setSelectedCategories(rolloverData.map(d => d.category));
        }
    }, [isOpen, rolloverData]);

    const toggleCategory = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const formatCurrency = (amount: number) => {
        const locale = language === 'ru' ? 'ru-RU' : 'en-US';
        return formatMoney(amount, defaultCurrency, locale);
    };

    if (!rolloverData) return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4"
                    aria-modal="true"
                    role="dialog"
                >
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md border border-zinc-800/60 flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-800">
                            <h3 className="text-xl font-bold text-white mb-1">
                                {t('budgetRolloverTitle') || 'Budget Rollover'}
                            </h3>
                            <p className="text-sm text-zinc-400">
                                {t('budgetRolloverDescription') || 'Transfer remaining budget from last month?'}
                            </p>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {rolloverData.map((item) => {
                                const isSelected = selectedCategories.includes(item.category);
                                const isPositive = item.amount > 0;

                                return (
                                    <div
                                        key={item.category}
                                        onClick={() => toggleCategory(item.category)}
                                        className={`
                      relative flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all
                      ${isSelected
                                                ? 'bg-zinc-800/80 border-brand-green/30'
                                                : 'bg-zinc-800/30 border-transparent hover:bg-zinc-800/50'}
                    `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center border transition-colors
                        ${isSelected
                                                    ? 'bg-brand-green border-brand-green'
                                                    : 'border-zinc-600 bg-transparent'}
                      `}>
                                                {isSelected && <Check className="w-4 h-4 text-white" />}
                                            </div>
                                            <span className="font-medium text-white">{item.category}</span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                                {isPositive ? '+' : ''}{formatCurrency(item.amount)}
                                            </span>
                                            {isPositive ? (
                                                <TrendingUp className="w-4 h-4 text-green-400 opacity-50" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4 text-red-400 opacity-50" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-zinc-800 grid grid-cols-2 gap-3">
                            <button
                                onClick={onSkip}
                                className="w-full py-3.5 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-colors"
                            >
                                {t('skip') || 'Skip'}
                            </button>
                            <button
                                onClick={() => onConfirm(selectedCategories)}
                                className="w-full py-3.5 rounded-xl bg-brand-green text-white font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                            >
                                {t('apply') || 'Apply'}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};
