import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, XCircle, RefreshCw, Bell, Wallet, Trash2 } from 'lucide-react';
import { TransactionRequest, Account } from '../../core/types';

interface TransactionRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: TransactionRequest[];
  accounts: Account[];
  onConfirm: (request: TransactionRequest, accountId: string) => Promise<void>;
  onReject: (request: TransactionRequest) => Promise<void>;
}

export const TransactionRequestsModal: React.FC<TransactionRequestsModalProps> = ({
  isOpen, onClose, requests, accounts, onConfirm, onReject
}) => {
  const [selectedAccount, setSelectedAccount] = useState<string>(accounts[0]?.id || '');
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 py-[88px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-zinc-900 rounded-2xl w-full h-full border border-zinc-800 overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">Входящие</h2>
                <p className="text-xs text-zinc-400">Запросы на синхронизацию</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {activeRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-zinc-600" />
                </div>
                <p className="text-zinc-400 font-medium">Всё чисто!</p>
                <p className="text-zinc-600 text-sm mt-1">Нет новых запросов.</p>
              </div>
            ) : (
              activeRequests.map(req => {
                const isDeletion = req.transaction_type === 'DELETE';

                return (
                  <div key={req.id} className={`bg-zinc-800/50 rounded-xl p-4 border ${isDeletion ? 'border-red-500/30 bg-red-900/10' : 'border-zinc-700'} shadow-lg`}>

                    {/* Инфо о транзакции */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm text-zinc-400 mb-0.5">От партнера:</p>
                        <p className="text-white font-medium text-sm flex items-center gap-2">
                          {req.sender_name || 'Пользователь'}
                        </p>
                      </div>

                      {isDeletion ? (
                        <div className="px-2 py-1 rounded-lg text-xs font-bold border bg-red-500/20 border-red-500/30 text-red-400 flex items-center gap-1">
                          <Trash2 size={12} />
                          Удаление
                        </div>
                      ) : (
                        <div className={`px-2 py-1 rounded-lg text-xs font-bold border ${req.transaction_type === 'INCOME'
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                          {req.transaction_type === 'INCOME' ? '+ Доход' : '- Расход'}
                        </div>
                      )}
                    </div>

                    {!isDeletion && (
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-2xl font-bold text-white">{req.amount}</span>
                        <span className="text-zinc-400 font-medium">{req.currency}</span>
                      </div>
                    )}

                    {/* Описание */}
                    {req.description && (
                      <div className="bg-zinc-900/50 p-2.5 rounded-lg mb-4 border border-zinc-800">
                        <p className="text-sm text-zinc-300 italic">"{req.description}"</p>
                      </div>
                    )}

                    {isDeletion && (
                      <p className="text-sm text-red-300 mb-4">
                        Партнер хочет удалить этот долг. Если вы согласитесь, он будет удален и у вас.
                      </p>
                    )}

                    {/* Действия */}
                    <div className="space-y-3 pt-2 border-t border-zinc-700/50">
                      {!isDeletion && (
                        <div>
                          <label className="text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            Выбрать счет для записи:
                          </label>
                          <div className="relative">
                            <select
                              value={selectedAccount}
                              onChange={(e) => setSelectedAccount(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-500 appearance-none"
                            >
                              {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({acc.currency})
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                              ▼
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={async () => {
                            if (!selectedAccount && !isDeletion) return; // Для удаления счет не нужен
                            setProcessingId(req.id);
                            await onConfirm(req, selectedAccount);
                            setProcessingId(null);
                          }}
                          disabled={!!processingId || (!selectedAccount && !isDeletion)}
                          className={`flex-1 ${isDeletion ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} active:scale-95 transition-all text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {processingId === req.id ? <RefreshCw className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          {isDeletion ? 'Удалить' : 'Подтвердить'}
                        </button>

                        <button
                          onClick={async () => {
                            setProcessingId(req.id);
                            await onReject(req);
                            setProcessingId(null);
                          }}
                          disabled={!!processingId}
                          className="px-4 bg-zinc-800 hover:bg-red-900/20 hover:text-red-400 text-zinc-400 rounded-xl border border-zinc-700 transition-colors flex items-center justify-center"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};