import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Account, AccountType } from '../types';
import { COMMON_CURRENCIES, ACCOUNT_GRADIENTS } from '../constants';
import { CheckCircle, ChevronDown } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (account: Omit<Account, 'id'> | Account) => void;
  account?: Account | null;
}

const defaultState = {
    name: '',
    currency: 'USD',
    gradient: ACCOUNT_GRADIENTS[0].class,
    type: AccountType.CARD,
};

export const AccountForm: React.FC<AccountFormProps> = ({ isOpen, onClose, onSave, account }) => {
  const { t } = useLocalization();
  const [formData, setFormData] = useState(defaultState);

  useEffect(() => {
    if (isOpen) {
        if (account) {
          const { id, ...dataToSet } = account;
          setFormData(dataToSet);
        } else {
          setFormData(defaultState);
        }
    }
  }, [account, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGradientChange = (gradientClass: string) => {
    setFormData(prev => ({ ...prev, gradient: gradientClass }));
  };
  
  const handleTypeChange = (type: AccountType) => {
      setFormData(prev => ({ ...prev, type }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
        if (account && 'id' in account) {
            onSave({ ...formData, id: account.id });
        } else {
            onSave(formData);
        }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col border border-zinc-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex-shrink-0">
                <h2 className="text-xl font-semibold text-white tracking-tight">{account ? t('editAccount') : t('createAccount')}</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="px-6 py-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('accountName')}</label>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200" />
                </div>
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('currency')}</label>
                  <div className="relative">
                    <select name="currency" value={formData.currency} onChange={handleChange} className="w-full appearance-none px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all duration-200 pr-10">
                      {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                   <label className="block text-sm font-medium text-zinc-300 mb-1.5">{t('accountType')}</label>
                   <div className="mt-1 flex gap-2">
                      <button type="button" onClick={() => handleTypeChange(AccountType.CARD)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${formData.type === AccountType.CARD ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{t('card')}</button>
                      <button type="button" onClick={() => handleTypeChange(AccountType.CASH)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${formData.type === AccountType.CASH ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>{t('cash')}</button>
                   </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">{t('color')}</label>
                  <div className="mt-2 grid grid-cols-6 gap-2">
                    {ACCOUNT_GRADIENTS.map(g => (
                      <div key={g.name} onClick={() => handleGradientChange(g.class)} className={`w-10 h-10 rounded-full bg-gradient-to-br ${g.class} cursor-pointer flex items-center justify-center transition-all hover:scale-110 border-2 ${formData.gradient === g.class ? 'border-blue-500' : 'border-transparent'}`}>
                        {formData.gradient === g.class && <CheckCircle className="w-6 h-6 text-white" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end space-x-3 flex-shrink-0">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200">{t('cancel')}</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200">{t('save')}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};