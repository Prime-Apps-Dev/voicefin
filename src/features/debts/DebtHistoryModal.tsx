// src/features/debts/DebtHistoryModal.tsx

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { Debt, Transaction, TransactionType, DebtType } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';
import { DEBT_SYSTEM_CATEGORIES } from '../../utils/constants';

interface DebtHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  currency: string;
}

export const DebtHistoryModal: React.FC<DebtHistoryModalProps> = ({
  isOpen,
  onClose,
  debt,
  transactions,
  onDeleteTransaction,
  currency, // Валюта долга
}) => {
  const { t, language } = useLocalization();

  if (!debt) return null;

  // Фильтруем транзакции только для этого долга
  const debtTransactions = transactions
    .filter(tx => tx.debtId === debt.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number, curr: string) => {
    return new Intl.NumberFormat(language === 'ru' ? 'ru-RU' : 'en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  };

  // Определяем, является ли транзакция "выдачей" или "погашением"
  const getTransactionLabel = (tx: Transaction) => {
    if (tx.id === debt.initial_transaction_id) {
      return language === 'ru' ? 'Создание долга' : 'Debt Creation';
    }
    if (tx.category === DEBT_SYSTEM_CATEGORIES.LENDING || tx.category === DEBT_SYSTEM_CATEGORIES.BORROWING) {
      return language === 'ru' ? 'Увеличение долга' : 'Debt Increase';
    }
    return language === 'ru' ? 'Погашение' : 'Repayment';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-[56px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="w-full h-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h2 className="text-lg font-bold text-white">{debt.person}</h2>
                <p className="text-xs text-zinc-400">History of payments</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {debtTransactions.length === 0 ? (
                <div className="text-center py-10 text-zinc-500">
                  <p>No transaction history found</p>
                </div>
              ) : (
                debtTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="bg-zinc-800/50 rounded-xl p-3 flex items-center justify-between border border-zinc-700/50 hover:bg-zinc-800 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === TransactionType.INCOME
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                        }`}>
                        {/* Логика иконки: 
                          Если это "Я должен" (I_OWE), то погашение (EXPENSE) - это хорошо (стрелка ВНИЗ, к долгу)
                          Если это "Мне должны" (OWED_TO_ME), то погашение (INCOME) - это хорошо (стрелка ВНИЗ, ко мне)
                          Создание долга (initial_tx) - всегда "плохо" (стрелка ВВЕРХ, от меня)
                        */}
                        {tx.id === debt.initial_transaction_id ? (
                          // Создание долга
                          debt.type === DebtType.I_OWE ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />
                        ) : (
                          // Погашение
                          debt.type === DebtType.I_OWE ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {getTransactionLabel(tx)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(tx.date)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`font-bold ${tx.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                        {tx.type === TransactionType.INCOME ? '+' : '-'}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                      <button
                        onClick={() => onDeleteTransaction(tx.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-4 bg-zinc-800/30 border-t border-zinc-800 text-center">
              <p className="text-xs text-zinc-400 mb-1">Remaining Balance</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(debt.current_amount, debt.currency)}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};