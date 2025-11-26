import React from 'react';
import ReactDOM from 'react-dom';
import { formatMoney } from '../../utils/formatMoney';
import { useLocalization } from '../../core/context/LocalizationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Share2, Trash2, Calendar, FileText,
  ArrowUpCircle, ArrowDownCircle, Clock, Link as LinkIcon,
  RotateCcw, Pencil
} from 'lucide-react';
import { Debt, DebtType } from '../../core/types';
import * as api from '../../core/services/api';

interface DebtDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  onDelete: (debt: Debt) => void;
  onEdit: (debt: Debt) => void;
  onHistory: (debt: Debt) => void;
}

export const DebtDetailsModal: React.FC<DebtDetailsModalProps> = ({
  isOpen, onClose, debt, onDelete, onEdit, onHistory
}) => {
  if (!isOpen || !debt) return null;

  const isIOwe = debt.type === DebtType.I_OWE;
  // Проверяем, есть ли связь с другим пользователем
  const isLinked = !!(debt as any).linked_user_id;

  const handleShare = () => {
    // Генерируем ссылку
    const { shareUrl } = api.generateDebtShareLink(
      debt.id,
      debt.current_amount,
      debt.currency,
      debt.type
    );

    // Используем Telegram WebApp API если доступно, иначе обычное открытие
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[9999] px-4 py-[88px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="bg-zinc-900 rounded-2xl w-full max-h-[85vh] border border-zinc-800 overflow-hidden relative flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Image / Gradient */}
          <div className={`h-32 w-full ${isIOwe ? 'bg-gradient-to-br from-red-900/50 to-black' : 'bg-gradient-to-br from-emerald-900/50 to-black'} relative`}>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 bg-black/30 p-2 rounded-full text-white hover:bg-black/50 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className={`w-20 h-20 rounded-full border-4 border-zinc-900 flex items-center justify-center text-3xl font-bold shadow-xl ${isIOwe ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                {debt.person.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="pt-10 pb-6 px-6 text-center flex-1 overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-1">{debt.person}</h2>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 ${isIOwe ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}>
              {isIOwe ? <ArrowDownCircle size={12} /> : <ArrowUpCircle size={12} />}
              {isIOwe ? 'Я должен' : 'Мне должны'}
            </div>

            <div className="mb-6">
              <p className="text-4xl font-bold text-white tracking-tight">
                {debt.current_amount.toLocaleString()}
                <span className="text-xl text-zinc-500 ml-1 font-normal">{debt.currency}</span>
              </p>
              {debt.amount !== debt.current_amount && (
                <p className="text-xs text-zinc-500 mt-1">
                  Исходная сумма: {debt.amount.toLocaleString()} {debt.currency}
                </p>
              )}
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 flex flex-col items-center justify-center gap-1">
                <Calendar className="text-zinc-400 w-4 h-4" />
                <span className="text-xs text-zinc-400">Дата создания</span>
                <span className="text-sm font-medium text-white">
                  {new Date(debt.date).toLocaleDateString()}
                </span>
              </div>
              <div className="bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 flex flex-col items-center justify-center gap-1">
                {isLinked ? (
                  <>
                    <LinkIcon className="text-blue-400 w-4 h-4" />
                    <span className="text-xs text-blue-400">Статус</span>
                    <span className="text-sm font-medium text-white">Синхронизирован</span>
                  </>
                ) : (
                  <>
                    <Clock className="text-zinc-400 w-4 h-4" />
                    <span className="text-xs text-zinc-400">Статус</span>
                    <span className="text-sm font-medium text-white">Локальный</span>
                  </>
                )}
              </div>
            </div>

            {debt.description && (
              <div className="bg-zinc-800/30 p-3 rounded-xl mb-6 text-left flex gap-3">
                <FileText className="text-zinc-500 w-4 h-4 mt-0.5 shrink-0" />
                <p className="text-sm text-zinc-300 italic">"{debt.description}"</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={() => { onClose(); onEdit(debt); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Pencil size={16} />
                  Изменить
                </button>
                <button
                  onClick={() => { onClose(); onHistory(debt); }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} />
                  История
                </button>
              </div>

              <div className="flex gap-3">
                {/* Кнопка Share доступна только если НЕ синхронизировано */}
                {!isLinked && (
                  <button
                    onClick={handleShare}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                  >
                    <Share2 size={16} />
                    Поделиться
                  </button>
                )}

                <button
                  onClick={() => onDelete(debt)}
                  className={`flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${isLinked ? 'w-full' : ''}`}
                >
                  <Trash2 size={16} />
                  Удалить
                </button>
              </div>

              {isLinked && (
                <p className="text-[10px] text-zinc-500 mt-2">
                  * Удаление отправит запрос партнеру. Если он подтвердит, долг удалится у обоих.
                </p>
              )}
            </div>

          </div>
        </motion.div>
    </AnimatePresence>,
    document.body
  );
};