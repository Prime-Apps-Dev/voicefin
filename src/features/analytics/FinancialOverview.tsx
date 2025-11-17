import React from 'react';
import { SummaryCard } from '../../shared/ui/cards/SummaryCard';
// Иконка Wallet удалена, так как карточка Total Balance больше не используется
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from 'lucide-react';
import { useLocalization } from '../../core/context/LocalizationContext';

interface FinancialOverviewProps {
    monthlyIncome: number;
    monthlyExpense: number;
    // totalBalance: number; // УДАЛЕНА: Информация дублируется в списке счетов
    totalSavings: number;
    defaultCurrency: string;
    
    // onNavigate оставляем, но предполагаем, что он будет расширен в родительском компоненте.
    // Пока оставляем его для навигации на "savings".
    onNavigate: (screen: 'home' | 'savings' | 'profile') => void;
    onGenerateTips: () => void;

    // НОВЫЕ СВОЙСТВА: Специфичные обработчики для навигации на историю транзакций с фильтром
    onExpenseClick: () => void;
    onIncomeClick: () => void;
}

const formatCurrency = (amount: number, currency: string) => {
    // В дальнейшем эту функцию следует вынести в отдельный файл src/utils/currency.ts, 
    // как мы обсуждали ранее, для централизованного форматирования.
    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency,
    }).format(amount);
};

export const FinancialOverview: React.FC<FinancialOverviewProps> = (props) => {
    const { t } = useLocalization();

    const {
        monthlyIncome,
        monthlyExpense,
        totalSavings,
        defaultCurrency,
        onNavigate,
        onExpenseClick, // Деструктурируем новый обработчик
        onIncomeClick,  // Деструктурируем новый обработчик
    } = props;
    
    return (
        <div className="px-6 py-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-100 px-2">
                {t('financialOverview')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* КАРТОЧКА ДОХОДОВ */}
                <SummaryCard
                    title={t('monthlyIncome')}
                    subtitle={t('thisMonth')}
                    amount={formatCurrency(monthlyIncome, defaultCurrency)}
                    icon={ArrowUpCircle}
                    gradient="bg-gradient-to-br from-green-start to-green-end"
                    // ИЗМЕНЕНИЕ: Используем новый обработчик для перехода на "Transactions History" (Доходы)
                    onClick={onIncomeClick}
                />
                
                {/* КАРТОЧКА РАСХОДОВ */}
                <SummaryCard
                    title={t('monthlyExpense')}
                    subtitle={t('thisMonth')}
                    amount={formatCurrency(monthlyExpense, defaultCurrency)}
                    icon={ArrowDownCircle}
                    gradient="bg-gradient-to-br from-red-start to-red-end"
                    // ИЗМЕНЕНИЕ: Используем новый обработчик для перехода на "Transactions History" (Расходы)
                    onClick={onExpenseClick}
                />
                
                {/* КАРТОЧКА TOTAL BALANCE УДАЛЕНА */}
                
                {/* КАРТОЧКА НАКОПЛЕНИЙ */}
                <SummaryCard
                    title={t('savings')}
                    subtitle={t('totalSaved')}
                    amount={formatCurrency(totalSavings, defaultCurrency)}
                    icon={PiggyBank}
                    gradient="bg-gradient-to-br from-purple-start to-purple-end"
                    onClick={() => {
                        onNavigate('savings');
                    }}
                />
            </div>
        </div>
    );
};