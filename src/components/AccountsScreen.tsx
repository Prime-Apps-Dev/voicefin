// src/components/AccountsScreen.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Account, Transaction, ExchangeRates, TransactionType } from '../types'; // Добавил TransactionType
import { AccountListItem } from './AccountListItem';
import { useLocalization } from '../context/LocalizationContext';
import { ChevronLeft, Plus, Wallet } from 'lucide-react';
import { convertCurrency } from '../services/currency'; // Добавил импорт конвертации

interface AccountsScreenProps {
  accounts: Account[];
  transactions: Transaction[];
  rates: ExchangeRates;
  onBack: () => void;
  onOpenAddForm: () => void;
  onOpenActions: (account: Account) => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  accounts,
  transactions,
  rates,
  onBack,
  onOpenAddForm,
  onOpenActions,
}) => {
  const { t } = useLocalization();

  // ✅ ИСПРАВЛЕННАЯ ЛОГИКА ПОДСЧЕТА (аналогично AccountList)
  const accountsWithBalances = React.useMemo(() => {
    return accounts.map(account => {
      const balance = transactions.reduce((sum, tx) => {
          // Конвертируем сумму транзакции в валюту текущего счета
          const amountInAccountCurrency = convertCurrency(tx.amount, tx.currency, account.currency, rates);
          
          if (tx.type === TransactionType.INCOME && tx.accountId === account.id) {
              return sum + amountInAccountCurrency;
          } 
          else if (tx.type === TransactionType.EXPENSE && tx.accountId === account.id) {
              return sum - amountInAccountCurrency;
          }
          else if (tx.type === TransactionType.TRANSFER) {
               if (tx.accountId === account.id) {
                   // Списание (мы отправитель)
                   return sum - amountInAccountCurrency;
               } else if (tx.toAccountId === account.id) {
                   // Зачисление (мы получатель)
                   return sum + amountInAccountCurrency;
               }
          }
          return sum;
      }, 0);

      return { ...account, balance };
    });
  }, [accounts, transactions, rates]); // Добавил rates в зависимости

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="w-28 h-28 bg-gray-800 rounded-full flex items-center justify-center mb-6">
        <Wallet className="w-14 h-14 text-gray-600" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{t('noAccountsFound')}</h2>
      <p className="text-gray-400 max-w-xs">{t('noAccountsDescription')}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      
      <header className="p-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{t('myAccounts')}</h1>
        <button onClick={onOpenAddForm} className="p-2 rounded-full hover:bg-gray-700" aria-label={t('addAccount')}>
          <Plus className="w-6 h-6 text-white" />
        </button>
      </header>

      <main className="flex-grow pb-24">
        {accounts.length === 0 ? (
          renderEmptyState()
        ) : (
          <motion.div
            className="space-y-4 px-4 py-2"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            {accountsWithBalances.map((account) => (
              <AccountListItem
                key={account.id}
                account={account}
                onOpenActions={() => onOpenActions(account)}
              />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};