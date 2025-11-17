import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useLocalization } from '../../../core/context/LocalizationContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onConfirm, onCancel, title, message }) => {
  const { t } = useLocalization();
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4" 
          aria-modal="true" 
          role="dialog"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 border border-zinc-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-600/10 sm:mx-auto sm:h-12 sm:w-12">
                <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden="true" />
              </div>
              <div className="mt-4">
                <h3 className="text-lg leading-6 font-semibold text-white" id="modal-title">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-zinc-400">
                    {message}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-zinc-800 text-base font-medium text-white hover:bg-zinc-700 focus:outline-none sm:text-sm transition-colors"
                onClick={onCancel}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2.5 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:text-sm transition-colors"
                onClick={onConfirm}
              >
                {t('delete')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};