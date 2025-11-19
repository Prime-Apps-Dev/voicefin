import React from 'react';
import { Transaction, TransactionType, Account, ExchangeRates } from '../../core/types';
import { ArrowUpCircle, ArrowDownCircle, Trash2, ArrowRightLeft } from 'lucide-react';
import LongPressWrapper from '../../shared/layout/LongPressWrapper';
import { useLocalization } from '../../core/context/LocalizationContext';
import { convertCurrency } from '../../core/services/currency';
import { getLocalizedCategoryName } from '../../utils/constants';

interface TransactionItemProps {
  transaction: Transaction;
  account: Account | undefined;
  onSelect: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  rates: ExchangeRates;
  allAccounts?: Account[]; // Добавляем список всех счетов, чтобы найти имя счета зачисления
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, account, onSelect, onDelete, rates, allAccounts }) => {
  const { language } = useLocalization();
  const isIncome = transaction.type === TransactionType.INCOME;
  const isExpense = transaction.type === TransactionType.EXPENSE;
  const isTransfer = transaction.type === TransactionType.TRANSFER;
  
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  const formattedAmount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: transaction.currency,
  }).format(transaction.amount);
  
  const transactionDate = new Date(transaction.date);
  
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(transactionDate);

  const formattedTime = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).format(transactionDate);

  const isConverted = account && transaction.currency !== account.currency;
  let formattedConvertedAmount = '';

  if (isConverted) {
      const convertedAmount = convertCurrency(transaction.amount, transaction.currency, account.currency, rates);
      formattedConvertedAmount = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: account.currency,
      }).format(convertedAmount);
  }

  // Определяем имя целевого счета для перевода
  const toAccountName = React.useMemo(() => {
      if (isTransfer && transaction.toAccountId && allAccounts) {
          const toAccount = allAccounts.find(a => a.id === transaction.toAccountId);
          return toAccount ? toAccount.name : '...';
      }
      return '';
  }, [isTransfer, transaction.toAccountId, allAccounts]);

  const handleTap = (item: Transaction) => onSelect(item);
  const handleSwipeLeft = (item: Transaction) => onDelete(item);

  // Логика отображения иконки и цветов
  let IconComponent = ArrowDownCircle;
  let iconBgClass = 'bg-red-500/10 text-red-400';
  let amountColorClass = 'text-red-400';
  let sign = '-';

  if (isIncome) {
      IconComponent = ArrowUpCircle;
      iconBgClass = 'bg-green-500/10 text-green-400';
      amountColorClass = 'text-green-400';
      sign = '+';
  } else if (isTransfer) {
      IconComponent = ArrowRightLeft;
      iconBgClass = 'bg-blue-500/10 text-blue-400'; // Синий/Голубой цвет для переводов
      amountColorClass = 'text-blue-400';
      sign = ''; // Для переводов знак можно опустить или использовать стрелку
  }

  // --- ИСПОЛЬЗУЕМ ЛОКАЛИЗАЦИЮ ДЛЯ КАТЕГОРИИ ---
  const localizedCategory = getLocalizedCategoryName(transaction.category, language);

  const subtitle = isTransfer 
    ? `${language === 'ru' ? 'Перевод на' : 'Transfer to'} ${toAccountName}` 
    : `${localizedCategory} • ${account?.name}`;

  return (
    <li>
      <LongPressWrapper<Transaction>
        item={transaction}
        onTap={handleTap}
        onSwipeLeft={handleSwipeLeft}
        swipeDeleteIcon={Trash2}
        children={
          <div 
            className="bg-gray-800 p-4 rounded-2xl flex items-center space-x-4 cursor-pointer hover:bg-gray-700/50 transition-colors duration-200 border border-gray-700/50 w-full"
            aria-label={`Transaction: ${transaction.name}`}
            role="button"
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${iconBgClass}`}>
              <IconComponent className="w-7 h-7" />
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-white truncate">{transaction.name}</p>
              <p className="text-sm text-gray-400">{subtitle}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`font-bold text-lg ${amountColorClass}`}>{sign} {formattedAmount}</p>
              {isConverted && (
                <p className="text-xs text-gray-500">
                  ({sign} {formattedConvertedAmount})
                </p>
              )}
              <p className={`text-sm text-gray-500 ${isConverted ? 'mt-0' : 'mt-1'}`}>{formattedDate} • {formattedTime}</p>
            </div>
          </div>
        }
      />
    </li>
  );
};