import React from 'react';
import { SummaryCard } from './SummaryCard';
import { ArrowDownCircle, ArrowUpCircle, Wallet, PiggyBank } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

interface FinancialOverviewProps {
    monthlyIncome: number;
    monthlyExpense: number;
    totalBalance: number;
    totalSavings: number;
    defaultCurrency: string;
    onNavigate: (screen: 'home' | 'savings' | 'profile') => void;
    onGenerateTips: () => void;
}

const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export const FinancialOverview: React.FC<FinancialOverviewProps> = (props) => {
    const { t } = useLocalization();

    return (
        <div className="px-6 py-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-100 px-2">
                {t('financialOverview')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SummaryCard
                    title={t('monthlyIncome')}
                    subtitle={t('thisMonth')}
                    amount={formatCurrency(props.monthlyIncome, props.defaultCurrency)}
                    icon={ArrowUpCircle}
                    gradient="bg-gradient-to-br from-green-start to-green-end"
                    onClick={() => { /* Can add navigation later */ }}
                />
                <SummaryCard
                    title={t('monthlyExpense')}
                    subtitle={t('thisMonth')}
                    amount={formatCurrency(props.monthlyExpense, props.defaultCurrency)}
                    icon={ArrowDownCircle}
                    gradient="bg-gradient-to-br from-red-start to-red-end"
                    onClick={() => { /* Can add navigation later */ }}
                />
                <SummaryCard
                    title={t('totalBalance')}
                    subtitle={t('available')}
                    amount={formatCurrency(props.totalBalance, props.defaultCurrency)}
                    icon={Wallet}
                    gradient="bg-gradient-to-br from-blue-start to-blue-end"
                    onClick={() => { /* Can add navigation later */ }}
                />
                <SummaryCard
                    title={t('savings')}
                    subtitle={t('totalSaved')}
                    amount={formatCurrency(props.totalSavings, props.defaultCurrency)}
                    icon={PiggyBank}
                    gradient="bg-gradient-to-br from-purple-start to-purple-end"
                    onClick={() => {
                        props.onNavigate('savings');
                    }}
                />
            </div>
        </div>
    );
};