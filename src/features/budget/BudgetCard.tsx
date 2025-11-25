import React from 'react';
import { formatMoney } from '../../utils/formatMoney';
import { useLocalization } from '../../core/context/LocalizationContext';
import { motion } from 'framer-motion';
import LongPressWrapper from '../../shared/layout/LongPressWrapper';
import { Budget } from '../../core/types';
import { ICONS } from '../../shared/ui/icons/icons';
import { Trash2 } from 'lucide-react';

interface BudgetCardProps {
    budget: Budget;
    spent: number;
    onTap: (budget: Budget) => void;
    onDoubleTap: (budget: Budget) => void;
    onLongPress: (budget: Budget) => void;
    onSwipeLeft: (budget: Budget) => void;
}

const IconDisplay: React.FC<{ name: string; className?: string; }> = ({ name, className }) => {
    const IconComponent = ICONS[name] || ICONS.LayoutGrid;
    return <IconComponent className={className} />;
};

const formatCurrency = (amount: number, currency: string, language: string) => {
    const locale = language === 'ru' ? 'ru-RU' : 'en-US';
    return formatMoney(amount, currency, locale);
};

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, spent, onTap, onDoubleTap, onLongPress, onSwipeLeft }) => {
    const { t, language } = useLocalization();
    const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    const isOver = spent > budget.limit;
    const remaining = budget.limit - spent;

    const getGradient = () => {
        if (isOver) return 'bg-gradient-to-br from-red-500 via-red-600 to-red-700 shadow-red-500/20';
        if (progress > 85) return 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 shadow-orange-500/20';
        return 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <LongPressWrapper<Budget>
                item={budget}
                onTap={onTap}
                onDoubleTap={onDoubleTap}
                onLongPress={onLongPress}
                onSwipeLeft={onSwipeLeft}
                swipeDeleteIcon={Trash2}
                children={
                    <div className={`relative overflow-hidden rounded-3xl p-5 shadow-lg text-white w-full transform transition-transform duration-300 hover:scale-102 cursor-pointer ${getGradient()}`}>
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white/20 rounded-xl">
                                        <IconDisplay name={budget.icon} className="w-7 h-7" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg break-words">{budget.category}</h3>
                                        <p className="text-sm text-white/80">
                                            {isOver
                                                ? `${t('exceededBy')} ${formatCurrency(spent - budget.limit, budget.currency, language)}`
                                                : `${formatCurrency(remaining, budget.currency, language)} ${t('remaining')}`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium text-white/90">
                                    <span className="text-white font-medium">{formatCurrency(spent, budget.currency, language)}</span>
                                    <span className="text-gray-400"> / {formatCurrency(budget.amount, budget.currency, language)}</span>
                                </div>
                                <div className="w-full bg-black/20 rounded-full h-2.5">
                                    <div
                                        className="bg-white h-2.5 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                }
            />
        </motion.div>
    );
};