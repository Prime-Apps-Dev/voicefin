import React from 'react';
import { Transaction, Account, ExchangeRates } from '../../core/types';
import { TransactionItem } from './TransactionItem';
import { useLocalization } from '../../core/context/LocalizationContext';
import { ArrowUpCircle } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  onSelectTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onViewAll: () => void;
  rates: ExchangeRates;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, accounts, onSelectTransaction, onDeleteTransaction, onViewAll, rates }) => {
  const { t } = useLocalization();
  
  const accountsById = React.useMemo(() => 
      Object.fromEntries(accounts.map(acc => [acc.id, acc])),
    [accounts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl font-semibold text-gray-100">
          {t('recentTransactions')}
        </h2>
        <button 
          onClick={onViewAll}
          className="text-sm text-brand-blue font-medium hover:text-blue-400 transition-colors">
          {t('viewAll')}
        </button>
      </div>
      
      {transactions.length > 0 ? (
        <ul className="space-y-3">
          {transactions.slice(0, 5).map(tx => (
            <TransactionItem 
              key={tx.id} 
              transaction={tx} 
              account={accountsById[tx.accountId]}
              onSelect={onSelectTransaction}
              onDelete={onDeleteTransaction}
              rates={rates}
            />
          ))}
        </ul>
      ) : (
        <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700/50 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
            <ArrowUpCircle className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-100 mb-2">
            {t('noTransactions')}
          </h3>
          <p className="text-gray-400 text-sm">
            {t('tapMicrophone')}
          </p>
        </div>
      )}
    </div>
  );
};