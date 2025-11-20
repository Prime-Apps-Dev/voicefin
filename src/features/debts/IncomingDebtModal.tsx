import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, AlertCircle, ArrowRight } from 'lucide-react';
import { DebtType, DebtStatus } from '../../core/types';
import * as api from '../../core/services/api';

interface IncomingDebtModalProps {
  debtId: string | null; 
  onClose: () => void;
  onDebtAdded: () => void;
  defaultCurrency: string;
}

export const IncomingDebtModal: React.FC<IncomingDebtModalProps> = ({
  debtId,
  onClose,
  onDebtAdded,
  defaultCurrency
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sharedDebt, setSharedDebt] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при открытии
  React.useEffect(() => {
    if (!debtId) return;

    const loadDebt = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 Запрос данных долга:', debtId);

        const data = await api.getSharedDebt(debtId);
        
        if (!data) {
          console.warn('❌ Данные долга пусты или не найдены');
          setError('Долг не найден или был удален.');
        } else {
          console.log('✅ Долг загружен:', data);
          setSharedDebt(data);
        }
      } catch (err: any) {
        console.error('🔥 Ошибка загрузки долга:', err);
        // Показываем сообщение ошибки, чтобы понимать причину
        setError(err.message || 'Не удалось загрузить данные долга.');
      } finally {
        setIsLoading(false);
      }
    };

    loadDebt();
  }, [debtId]);

  const handleAccept = async () => {
    if (!sharedDebt) return;

    try {
      setIsLoading(true);

      // Инвертируем тип: если он говорит "Я должен", значит мне "Мне должны"
      const myType = sharedDebt.type === DebtType.I_OWE 
        ? DebtType.OWED_TO_ME 
        : DebtType.I_OWE;

      await api.addDebt({
        person: sharedDebt.owner_name || 'Друг',
        amount: sharedDebt.amount,
        current_amount: sharedDebt.amount,
        currency: sharedDebt.currency,
        type: myType,
        date: new Date().toISOString(),
        description: `Синхронизировано: ${sharedDebt.description || ''}`,
        status: DebtStatus.ACTIVE,
        // @ts-ignore: parent_debt_id есть в базе, но может отсутствовать в типах TS
        parent_debt_id: sharedDebt.id 
      });

      onDebtAdded();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Ошибка при сохранении долга');
      setIsLoading(false);
    }
  };

  if (!debtId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // z-[9999] гарантирует, что окно будет ПОВЕРХ всего (онбординга, лоадеров)
        className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-zinc-900 rounded-2xl w-full max-w-sm border border-zinc-700 overflow-hidden shadow-2xl relative"
        >
          {/* Кнопка закрытия */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white bg-black/20 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Хедер */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-6 text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-blue-500/10">
                <ArrowRight className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">Входящий долг</h2>
              <p className="text-zinc-400 text-sm">Синхронизация данных</p>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-zinc-500 text-sm">Загрузка информации...</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-400 mb-4 text-sm">{error}</p>
                <button onClick={onClose} className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm">
                    Закрыть
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-zinc-400 text-sm">От кого:</span>
                    <span className="text-white font-medium">{sharedDebt.owner_name}</span>
                  </div>
                  
                  <div className="flex justify-between items-center my-3">
                     <span className="text-2xl font-bold text-white">
                        {sharedDebt.amount} <span className="text-lg text-zinc-400">{sharedDebt.currency}</span>
                     </span>
                  </div>

                  <div className="text-sm p-2 rounded bg-zinc-800 text-zinc-300">
                    {sharedDebt.type === 'I_OWE' 
                      ? 'Этот пользователь говорит, что должен вам.' 
                      : 'Этот пользователь говорит, что вы должны ему.'}
                  </div>
                </div>

                <div className="text-center">
                   <p className="text-zinc-400 text-sm mb-4">
                     Добавить в ваш список как <br/>
                     <strong className="text-white">
                       {sharedDebt.type === 'I_OWE' ? '"Мне должны"' : '"Я должен"'}
                     </strong>?
                   </p>
                   
                   <button
                    onClick={handleAccept}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     <CheckCircle className="w-5 h-5" />
                     Принять
                   </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};