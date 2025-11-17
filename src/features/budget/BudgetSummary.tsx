
import React from 'react';
import { Sparkles } from 'lucide-react';
import { useLocalization } from '../../core/context/LocalizationContext';

interface BudgetSummaryProps {
  monthlyIncome: number;
  monthlyExpense: number;
  incomeGoal: number;
  expenseGoal: number;
  defaultCurrency: string;
  onGenerateTips: () => void;
  isGeneratingTips: boolean;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

const BudgetScale = ({ title, current, goal, currency, colorClass }: { title: string; current: number; goal: number; currency: string; colorClass: string; }) => {
    const { t } = useLocalization();
    const percentage = goal > 0 ? (current / goal) * 100 : 0;
    
    return (
        <div className="bg-gray-800 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                    className={`${colorClass} h-2.5 rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span className="font-medium">{formatCurrency(current, currency)}</span>
                <span className="opacity-70">{t('goal')}: {formatCurrency(goal, currency)}</span>
            </div>
        </div>
    );
};


export const BudgetSummary: React.FC<BudgetSummaryProps> = ({ monthlyIncome, monthlyExpense, incomeGoal, expenseGoal, defaultCurrency, onGenerateTips, isGeneratingTips }) => {
    const { t } = useLocalization();
    return (
        <div className="w-full space-y-4">
            <BudgetScale
                title={t('monthlyIncome')}
                current={monthlyIncome}
                goal={incomeGoal}
                currency={defaultCurrency}
                colorClass="bg-brand-green"
            />
            <BudgetScale
                title={t('monthlyExpense')}
                current={monthlyExpense}
                goal={expenseGoal}
                currency={defaultCurrency}
                colorClass="bg-brand-red"
            />
            <div className="pt-2">
                <button
                    onClick={onGenerateTips}
                    disabled={isGeneratingTips}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed"
                >
                    {isGeneratingTips ? (
                        <>
                            <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                            <span>{t('generating')}</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            <span>{t('getSavingsTips')}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};