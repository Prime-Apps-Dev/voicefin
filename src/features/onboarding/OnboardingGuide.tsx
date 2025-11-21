// src/features/onboarding/OnboardingGuide.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { useLocalization } from '../../core/context/LocalizationContext';
import { Loader2, X } from 'lucide-react';

// ИНТЕРФЕЙС ОСТАВЛЯЕМ ПОЛНЫМ ДЛЯ СОВМЕСТИМОСТИ С App.tsx
interface OnboardingGuideProps {
  onFinish: () => void;
  initialDebtId: string | null;
  onDebtActionComplete: (debtId: string | null) => void; 
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ onFinish, initialDebtId }) => {
  const { t } = useLocalization();

  // ВРЕМЕННЫЙ КОМПОНЕНТ ДЛЯ ДИАГНОСТИКИ:
  // Если вы видите этот экран, то проблема в логике шагов онбординга.
  // Если экран все равно черный, то проблема в App.tsx или контекстах.
  
  const debugText = initialDebtId 
    ? t('onboardingWelcomeTitle') + ' (Deep Link Debug)'
    : t('onboardingWelcomeTitle') + ' (Standard Debug)';
    
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // Очень яркий цвет, чтобы точно видеть, если компонент рендерится
      className="fixed inset-0 bg-indigo-900/95 backdrop-blur-md flex items-center justify-center z-[100] p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm h-[28rem] flex flex-col items-center justify-center p-8 border border-zinc-800/60"
      >
        <Loader2 className="w-10 h-10 text-indigo-400 mb-6 animate-spin" />
        <h2 className="text-xl font-bold text-white mb-3">{debugText}</h2>
        <p className="text-zinc-400 leading-relaxed text-center">
            {t('onboardingWelcomeText')} (DEBUG MODE)
        </p>
        <p className="text-sm text-red-400 mt-4">
             Если вы видите этот текст, нажмите "Закрыть" и сообщите мне.
        </p>

        <button
            onClick={onFinish}
            className="mt-8 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-500 transition-all duration-200"
        >
            {t('skip')} / Закрыть (DEBUG)
        </button>
      </motion.div>
    </motion.div>
  );
};