

import React from 'react';
import { Account, ExchangeRates, Transaction } from '../types';
import { AccountCard } from './AccountCard';
import { convertCurrency } from '../services/currency';
import { useLocalization } from '../context/LocalizationContext';

interface AccountListProps {
  accounts: Account[];
  transactions: Transaction[];
  rates: ExchangeRates;
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  totalBalance: number;
  defaultCurrency: string;
}

const calculateAccountBalance = (accountId: string, transactions: Transaction[], rates: ExchangeRates, accountCurrency: string) => {
    return transactions
        .filter(t => t.accountId === accountId)
        .reduce((sum, tx) => {
            const amountInAccountCurrency = convertCurrency(tx.amount, tx.currency, accountCurrency, rates);
            return sum + (tx.type === 'INCOME' ? amountInAccountCurrency : -amountInAccountCurrency);
        }, 0);
};

export const AccountList: React.FC<AccountListProps> = ({ accounts, transactions, rates, selectedAccountId, onSelectAccount, totalBalance, defaultCurrency }) => {
  const { t } = useLocalization();
  if (accounts.length === 0) {
    return (
        <div className="px-6 py-8 text-center text-gray-500">
            <p>No accounts found.</p>
            <p className="text-sm">Go to Profile {'>'} Settings to add your first account.</p>
        </div>
    );
  }

  const formattedTotalBalance = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: defaultCurrency,
  }).format(totalBalance);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-100 px-6">
          {t('accounts')}
      </h2>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex space-x-4 pb-4 px-6 py-4">
          {/* "All Accounts" Card */}
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

          {/* Individual Account Cards */}
          {accounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
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