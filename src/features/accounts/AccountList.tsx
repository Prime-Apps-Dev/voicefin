// src/components/AccountList.tsx

import React from 'react';
import { formatMoney } from '../../utils/formatMoney';
import { useLocalization } from '../../core/context/LocalizationContext';
import { Account, ExchangeRates, Transaction, TransactionType } from '../../core/types'; // Добавил TransactionType
import { AccountCard } from './AccountCard';
import { convertCurrency } from '../../core/services/currency';

interface AccountListProps {
  accounts: Account[];
  transactions: Transaction[];
  rates: ExchangeRates;
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  totalBalance: number;
  defaultCurrency: string;
}

// ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ ПОДСЧЕТА БАЛАНСА
const calculateAccountBalance = (accountId: string, transactions: Transaction[], rates: ExchangeRates, accountCurrency: string) => {
  return transactions.reduce((sum, tx) => {
    // 1. Конвертируем сумму транзакции в валюту этого счета
    const amountInAccountCurrency = convertCurrency(tx.amount, tx.currency, accountCurrency, rates);

    // 2. Логика для разных типов транзакций
    if (tx.type === TransactionType.INCOME && tx.accountId === accountId) {
      return sum + amountInAccountCurrency;
    }
    else if (tx.type === TransactionType.EXPENSE && tx.accountId === accountId) {
      return sum - amountInAccountCurrency;
    }
    else if (tx.type === TransactionType.TRANSFER) {
      // Если это перевод, проверяем роль счета
      if (tx.accountId === accountId) {
        // Мы отправитель -> вычитаем
        return sum - amountInAccountCurrency;
      } else if (tx.toAccountId === accountId) {
        // Мы получатель -> прибавляем
        return sum + amountInAccountCurrency;
      }
    }

    return sum;
  }, 0);
};

export const AccountList: React.FC<AccountListProps> = ({ accounts, transactions, rates, selectedAccountId, onSelectAccount, totalBalance, defaultCurrency }) => {
  const { t, language } = useLocalization();

  if (accounts.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-gray-500">
        <p>No accounts found.</p>
        <p className="text-sm">Go to Profile {'>'} Settings to add your first account.</p>
      </div>
    );
  }

  const locale = language === 'ru' ? 'ru-RU' : 'en-US';
  const formattedTotalBalance = formatMoney(totalBalance, defaultCurrency, locale);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100 px-6">
        {t('accounts')}
      </h2>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-4 px-6 py-4">
          {/* Карточка "Все счета" */}
          <div
            onClick={() => onSelectAccount('all')}
            className={`
              flex-shrink-0 w-64 h-36 p-4 rounded-xl shadow-lg
              flex flex-col justify-between cursor-pointer
              transition-all duration-300 transform
              bg-gray-700
              ${selectedAccountId === 'all' ? 'ring-4 ring-brand-green scale-105' : 'ring-2 ring-transparent hover:scale-105'}
            `}
          >
            <div>
              <p className="font-semibold text-white text-lg">{t('allAccounts')}</p>
            </div>
            <div>
              <p className="text-white text-xs opacity-80">{t('totalBalanceCard')}</p>
              <p className="font-bold text-white text-2xl">{formattedTotalBalance}</p>
            </div>
          </div>

          {/* Карточки отдельных счетов */}
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              // Используем обновленную функцию подсчета
              balance={calculateAccountBalance(account.id, transactions, rates, account.currency)}
              isActive={selectedAccountId === account.id}
              onClick={() => onSelectAccount(account.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};