// src/components/TranscriptionReview.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../context/LocalizationContext'; // Используем ваш хук локализации
import { Transaction, TransactionType, ExchangeRates } from '../types'; // Предполагаем импорт типов
import { Loader2, Edit3, Save, X, Activity } from 'lucide-react'; 
import { convertCurrency } from '../services/currency'; // Используем вашу функцию конвертации

interface TranscriptionReviewProps {
  isProcessing: boolean;
  transcription: string;
  transaction: Transaction | null;
  onSave: (transaction: Transaction) => void;
  onCancel: () => void; 
  rates: ExchangeRates;
  defaultCurrency: string;
  language: string;
}

// Простая иконка спиннера
const SpinnerIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <Loader2 className="animate-spin" {...props} />
);

/**
 * Модальное окно для отображения процесса транскрипции и финального обзора транзакции.
 */
export const TranscriptionReview: React.FC<TranscriptionReviewProps> = ({
  isProcessing,
  transcription,
  transaction,
  onSave,
  onCancel,
  rates,
  defaultCurrency,
  language,
}) => {
  const { t } = useLocalization();
  const [displayedText, setDisplayedText] = useState('');

  // Эффект "печатной машинки" или потокового появления текста
  useEffect(() => {
    // В режиме потоковой обработки просто устанавливаем самую последнюю полученную транскрипцию
    if (isProcessing) {
        setDisplayedText(transcription);
    } else if (transaction) {
        // Если обработка закончена и транзакция есть, показываем финальный текст
        setDisplayedText(transcription);
    }
  }, [transcription, transaction, isProcessing]);
  
  const handleSave = useCallback(() => {
    if (transaction) {
      onSave(transaction);
    }
  }, [transaction, onSave]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const formatCurrencyLocal = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };


  // --- РЕНДЕРИНГ ЭКРАНОВ ---

  // 1. Состояние: Транзакция готова (Финальный шаг)
  if (transaction) {
    const amountClass = transaction.type === TransactionType.EXPENSE ? 'text-red-500' : 'text-brand-green';

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 p-6 flex flex-col justify-center items-center">
        
        <div className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-zinc-800/60">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">{t('reviewTransaction')}</h2>
                <button onClick={handleCancel} className="text-zinc-500 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>
            
            <div className="space-y-4">
                <div className="p-4 border border-brand-green/50 bg-brand-green/10 rounded-xl shadow-inner space-y-3">
                    <p className="font-semibold text-lg text-white flex items-center">
                      <Save size={20} className="mr-2 text-brand-green" />
                      {t('transactionReadyForReview')}
                    </p>
                    
                    <div className="space-y-2 text-zinc-300">
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                            <span className="text-sm font-medium">{t('description')}:</span>
                            <span className="font-medium text-white">{transaction.name}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-800 pb-2">
                            <span className="text-sm font-medium">{t('category')}:</span>
                            <span className="font-medium text-white">{transaction.category}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm font-medium">{t('amount')}:</span>
                            <span className={`font-bold text-xl ${amountClass}`}>
                                {transaction.type === TransactionType.EXPENSE ? '-' : '+'}
                                {formatCurrencyLocal(transaction.amount, transaction.currency)}
                            </span>
                        </div>
                        {transaction.goalId && (
                            <div className="flex justify-between pt-2 border-t border-zinc-800">
                                <span className="text-sm font-medium">{t('savingsGoal')}:</span>
                                <span className="font-medium text-white">{transaction.goalId}</span> {/* В идеале отобразить имя цели */}
                            </div>
                        )}
                        {/* Конвертация в дефолтную валюту для справки */}
                         {transaction.currency !== defaultCurrency && (
                            <p className="text-xs text-zinc-400 text-right mt-2">
                                ≈ {formatCurrencyLocal(convertCurrency(transaction.amount, transaction.currency, defaultCurrency, rates), defaultCurrency)}
                            </p>
                         )}
                    </div>
                </div>

                {/* Полная транскрипция для контекста */}
                <div className="pt-2 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 mb-1">{t('voiceInput')}:</p>
                    <p className="text-sm italic text-zinc-400 max-h-24 overflow-y-auto">{transcription}</p>
                </div>

            </div>

            <div className="mt-6 flex justify-between space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-semibold hover:bg-zinc-700 transition-colors"
              >
                <Edit3 size={20} className="mr-2" />
                {t('editOrCancel')}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-brand-green text-white rounded-xl font-semibold hover:bg-green-600 transition-colors active:scale-[0.98]"
              >
                <Save size={20} className="mr-2" />
                {t('saveTransaction')}
              </button>
            </div>
        </div>
      </div>
    );
  }

  // 2. Состояние: Обработка / Ожидание транзакции (Промежуточный шаг)
  if (isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex flex-col items-center p-6 pt-20">
        
        <div className="w-16 h-16 mb-8 text-blue-500">
          <SpinnerIcon className="w-full h-full" />
        </div>
        
        <p className="text-xl font-bold text-white mb-8 text-center tracking-tight">
          {transcription.length > 0 ? t('analyzingForTransaction') : t('analyzingAudio')}
        </p>

        {/* Отображение анимированной транскрипции */}
        {displayedText && (
          <div className="p-4 bg-zinc-800 rounded-xl border border-zinc-700 w-full max-w-md shadow-lg">
            <p className="text-sm text-blue-400 mb-2 font-semibold flex items-center">
                <Activity size={16} className="mr-1.5" />
                {t('youSaid')}
            </p>
            <p className="text-lg font-medium text-white whitespace-pre-wrap">
              {/* Используем displayedText, которое обновляется потоково */}
              {displayedText}
              {/* Добавляем мигающий курсор */}
              {isProcessing && <span className="animate-pulse opacity-50">|</span>} 
            </p>
          </div>
        )}

        <button
          onClick={handleCancel}
          className="mt-16 px-5 py-2.5 text-red-400 border border-red-400/50 rounded-xl hover:bg-red-900/20 transition-colors flex items-center"
        >
          <X size={18} className="mr-1" />
          {t('cancelProcessing')}
        </button>
      </div>
    );
  }

  // По умолчанию компонент не рендерится, когда не активен
  return null;
};