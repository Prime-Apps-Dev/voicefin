// src/shared/ui/buttons/RecordButton.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { useLocalization } from '../../../core/context/LocalizationContext';

interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void; // Используем один метод для переключения
  disabled?: boolean;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ 
  isRecording, 
  onToggle, 
  disabled 
}) => {
  const { t } = useLocalization();

  return (
    <div className="relative flex items-center justify-center">
      {/* Анимированная волна (пульсация) вокруг кнопки при записи */}
      {isRecording && (
        <motion.div
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeOut" 
          }}
          className="absolute w-full h-full bg-red-500/40 rounded-full z-0"
        />
      )}

      {/* Сама кнопка */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative z-10 flex items-center justify-center 
          w-16 h-16 rounded-full shadow-lg transition-all duration-300
          ${disabled ? 'opacity-50 cursor-not-allowed bg-zinc-700' : ''}
          ${isRecording 
            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
            : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'}
        `}
        aria-label={isRecording ? t('stopRecording') : t('startRecording')}
      >
        <motion.div
          initial={false}
          animate={{ 
            scale: isRecording ? 0.9 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {isRecording ? (
            <Square className="w-6 h-6 text-white fill-white" />
          ) : (
            <Mic className="w-7 h-7 text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
};