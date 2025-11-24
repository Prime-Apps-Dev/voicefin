import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Account } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

interface AccountActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onAddTransaction: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

const ActionButton = ({ icon: Icon, label, onClick, colorClass }: { icon: React.ElementType, label: string, onClick: () => void, colorClass: string }) => (
  <button onClick={onClick} className="w-full flex items-center p-4 rounded-xl hover:bg-zinc-800 transition-colors">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${colorClass}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-lg font-medium text-zinc-200">{label}</span>
  </button>
)

export const AccountActionsModal: React.FC<AccountActionsModalProps> = ({ isOpen, onClose, account, onAddTransaction, onEdit, onDelete }) => {
  const { t } = useLocalization();

  return (
    <AnimatePresence>
      {isOpen && account && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-end justify-center z-[9999]"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 w-full max-w-md rounded-t-3xl p-4 border-t border-zinc-800/60 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 px-2">
              <div className="flex flex-col">
                <h2 className="text-2xl font-bold text-white">{account.name}</h2>
                <p className="text-zinc-400">{t('actions')}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-800">
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-2">
              <ActionButton
                label={t('addTransaction')}
                icon={Plus}
                onClick={() => onAddTransaction(account)}
                colorClass="bg-blue-600"
              />
              <ActionButton
                label={t('editAccount')}
                icon={Pencil}
                onClick={() => onEdit(account)}
                colorClass="bg-yellow-500"
              />
              <ActionButton
                label={t('deleteAccount')}
                icon={Trash2}
                onClick={() => onDelete(account)}
                colorClass="bg-red-600"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};