import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavingsGoal, Transaction, Account, ExchangeRates } from '../../core/types';
import { TransactionItem } from '../../features/transactions/TransactionItem';
import { X } from 'lucide-react';
import { useLocalization } from '../../core/context/LocalizationContext';

interface GoalTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal;
  transactions: Transaction[];
  accounts: Account[];
  onSelectTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  rates: ExchangeRates;
}

export const GoalTransactionsModal: React.FC<GoalTransactionsModalProps> = ({
  isOpen,
  onClose,
  goal,
  transactions,
  accounts,
  onSelectTransaction,
  onDeleteTransaction,
  rates,
}) => {
  const { t } = useLocalization();

  const goalTransactions = React.useMemo(() => {
    return transactions
      .filter(tx => tx.goalId === goal.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, goal.id]);

  const accountsById = React.useMemo(() =>
    Object.fromEntries(accounts.map(acc => [acc.id, acc])),
    [accounts]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[100] px-4 py-[56px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full h-full overflow-hidden flex flex-col border border-zinc-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white tracking-tight truncate pr-4">Transactions for "{goal.name}"</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all duration-200"
                >
                  <X className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              {goalTransactions.length > 0 ? (
                <ul className="space-y-3">
                  {goalTransactions.map(tx => (
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
                <div className="text-center py-10 text-zinc-400">
                  <p>No transactions found for this goal yet.</p>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end flex-shrink-0">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-500 active:scale-95 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};