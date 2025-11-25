import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, AlertCircle, ArrowRight } from 'lucide-react';
import { DebtType, DebtStatus } from '../../core/types';
import * as api from '../../core/services/api';
import { formatMoney } from '../../utils/formatMoney';
import { useLocalization } from '../../core/context/LocalizationContext';

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

  const { t, language } = useLocalization();
  const locale = language === 'ru' ? 'ru-RU' : 'en-US';

  const formatCurrency = (amount: number, currency: string) => {
    return formatMoney(amount, currency, locale);
  };

  React.useEffect(() => {
    if (!debtId) return;

    const loadDebt = async () => {
      try {
        setIsLoading(true);
        const data = await api.getSharedDebt(debtId);
        if (!data) {
          setError('Долг не найден или был удален.');
        } else {
          setSharedDebt(data);
        }
      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить данные.');
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

      const myType = sharedDebt.type === DebtType.I_OWE
        ? DebtType.OWED_TO_ME
        : DebtType.I_OWE;

      // 1. Создаем долг у себя
      const newDebt = await api.addDebt({
        person: sharedDebt.owner_name || 'Друг',
        amount: sharedDebt.amount,
        current_amount: sharedDebt.amount,
        currency: sharedDebt.currency,
        type: myType,
        date: new Date().toISOString(),
        description: `Синхронизировано: ${sharedDebt.description || ''}`,
        status: DebtStatus.ACTIVE,
        parent_debt_id: sharedDebt.id
      });

      // 2. ВАЖНО: Связываем пользователей в базе (Handshake)
      await api.linkDebtPartners(sharedDebt.id, newDebt.id);

      onDebtAdded();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Ошибка при сохранении долга');
      setIsLoading(false);
    }
  };

  if (!debtId) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[9999] px-4 py-[88px]"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-zinc-800/60"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-white bg-black/20 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-6 text-center">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ring-blue-500/10">
              <ArrowRight className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Входящий долг</h2>
            <p className="text-zinc-400 text-sm">Синхронизация данных</p>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                <p className="text-red-400 mb-4 text-sm">{error}</p>
                <button onClick={onClose} className="bg-zinc-800 text-white px-4 py-2 rounded-lg">Закрыть</button>
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
                <button
                  onClick={handleAccept}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Принять
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};