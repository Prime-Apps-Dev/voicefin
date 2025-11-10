import React from 'react';
import { Transaction, TransactionType, Account, ExchangeRates } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Trash2 } from 'lucide-react';
import LongPressWrapper from './LongPressWrapper';
import { useLocalization } from '../context/LocalizationContext';
import { convertCurrency } from '../services/currency';

interface TransactionItemProps {
  transaction: Transaction;
  account: Account | undefined;
  onSelect: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  rates: ExchangeRates;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, account, onSelect, onDelete, rates }) => {
  const { language } = useLocalization();
  const isIncome = transaction.type === TransactionType.INCOME;
  
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

  // FIX: Passing props directly to the generic LongPressWrapper component was causing a type inference failure,
  // resulting in a "missing children" error. Defining explicit handlers for tap and swipe events
  // helps TypeScript correctly infer the component's props and types.
  const handleTap = (item: Transaction) => onSelect(item);
  const handleSwipeLeft = (item: Transaction) => onDelete(item);

  return (
    <li>
      {/* FIX: Explicitly provide the generic type argument to the `LongPressWrapper` component to resolve a TypeScript type inference issue. */}
      {/* FIX: Explicitly pass the `children` prop to the generic `LongPressWrapper` component to resolve a TypeScript type inference issue where the child elements were not being correctly identified, causing a "missing children" error. */}
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
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isIncome ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {isIncome ? <ArrowUpCircle className="w-7 h-7" /> : <ArrowDownCircle className="w-7 h-7" />}
            </div>
            <div className="flex-grow min-w-0">
              <p className="font-semibold text-white truncate">{transaction.name}</p>
              <p className="text-sm text-gray-400">{transaction.category} • {account?.name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`font-bold text-lg ${isIncome ? 'text-green-400' : 'text-red-400'}`}>{isIncome ? '+' : '-'} {formattedAmount}</p>
              {isConverted && (
                <p className="text-xs text-gray-500">
                  ({isIncome ? '+' : '-'} {formattedConvertedAmount})
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