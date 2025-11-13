import React from 'react';
import { motion } from 'framer-motion';
import { Account, Transaction, ExchangeRates } from '../types';
import { AccountListItem } from './AccountListItem';
import { useLocalization } from '../context/LocalizationContext';
import { ChevronLeft, Plus, Wallet } from 'lucide-react';

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

  const accountsWithBalances = React.useMemo(() => {
    return accounts.map(account => {
      const balance = transactions
        .filter(t => t.accountId === account.id)
        .reduce((sum, tx) => {
          // Assuming direct calculation in account's currency for simplicity here
          return sum + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
        }, 0);
      return { ...account, balance };
    });
  }, [accounts, transactions]);

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
    // Корневой div с отступом для маски
    <div className="min-h-screen bg-gray-900 flex flex-col">
      
      {/* "Липкий" header */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-700">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold text-white">{t('myAccounts')}</h1>
        <button onClick={onOpenAddForm} className="p-2 rounded-full hover:bg-gray-700" aria-label={t('addAccount')}>
          <Plus className="w-6 h-6 text-white" />
        </button>
      </header>

      {/* Основной контент */}
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