import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';
import { useLocalization } from '../../../core/context/LocalizationContext';

interface TextInputModalProps {
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  text: string;
  onTextChange: (text: string) => void;
}

export const TextInputModal: React.FC<TextInputModalProps> = ({ isOpen, isProcessing, onClose, onSubmit, text, onTextChange }) => {
  const { t } = useLocalization();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex flex-col justify-end items-center z-[9999]"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            className="bg-zinc-900 rounded-t-3xl shadow-xl w-full max-w-md border-t border-zinc-800/60 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">{t('addByTextTitle')}</h2>
              <form onSubmit={handleSubmit} className="flex items-start gap-3">
                <textarea
                  value={text}
                  onChange={(e) => onTextChange(e.target.value)}
                  placeholder={t('addByTextPlaceholder')}
                  rows={3}
                  autoFocus
                  className="flex-grow bg-zinc-800 border-zinc-700 rounded-xl focus:ring-blue-600 focus:border-transparent text-white p-3 resize-none w-full px-4 py-3 placeholder-zinc-500 focus:outline-none focus:ring-2 transition-all duration-200"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isProcessing || !text.trim()}
                  className="w-14 h-14 flex-shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-95"
                >
                  {isProcessing ? (
                    <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-6 h-6" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};