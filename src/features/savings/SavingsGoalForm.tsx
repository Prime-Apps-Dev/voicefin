import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SavingsGoal } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';
import { COMMON_CURRENCIES } from '../../utils/constants';
import { ICON_NAMES, ICONS } from '../../shared/ui/icons/icons';
import { ChevronDown } from 'lucide-react';

const defaultState: Omit<SavingsGoal, 'id' | 'currentAmount'> = {
  name: '',
  icon: 'Target',
  targetAmount: 0,
  currency: 'USD',
};

export const SavingsGoalForm: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Omit<SavingsGoal, 'id' | 'currentAmount'> | SavingsGoal) => void;
  goal?: SavingsGoal | null;
  defaultCurrency: string;
}> = ({ isOpen, onClose, onSave, goal, defaultCurrency }) => {
  const { t } = useLocalization();
  const [formData, setFormData] = useState({ ...defaultState, currency: defaultCurrency });
  const [targetAmountStr, setTargetAmountStr] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (goal) {
        setFormData({
          name: goal.name,
          icon: goal.icon,
          targetAmount: goal.targetAmount,
          currency: goal.currency || defaultCurrency,
        });
        setTargetAmountStr(String(goal.targetAmount));
      } else {
        setFormData({ ...defaultState, currency: defaultCurrency });
        setTargetAmountStr('');
      }
    }
  }, [goal, isOpen, defaultCurrency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'targetAmount') {
      const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      setTargetAmountStr(sanitizedValue);
      setFormData(prev => ({
        ...prev,
        targetAmount: parseFloat(sanitizedValue) || 0,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.targetAmount > 0) {
      if (goal && 'id' in goal) {
        onSave({ ...goal, ...formData });
      } else {
        onSave(formData);
      }
    }
  };

  const IconDisplay: React.FC<{ name: string; className?: string; }> = ({ name, className }) => {
    const IconComponent = ICONS[name] || ICONS.Target;
    return <IconComponent className={className} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] px-4 py-[88px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full h-full overflow-hidden flex flex-col border border-zinc-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex-shrink-0">
              <h2 className="text-xl font-semibold text-white tracking-tight">{goal ? t('editGoal') : t('createGoal')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="px-6 py-6 space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('goalName')}</label>
                    <span className="text-xs text-zinc-500">{formData.name.length} / 50</span>
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    maxLength={50}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="targetAmount" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('targetAmount')}</label>
                    <input type="text" inputMode="decimal" name="targetAmount" value={targetAmountStr} onChange={handleChange} required className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white" />
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
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">{t('goalIcon')}</label>
                  {/* Изменено на flex flex-wrap justify-around для равномерного распределения пространства (justify-content) */}
                  <div className="h-48 overflow-y-auto flex flex-wrap justify-around gap-x-2 gap-y-2 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    {ICON_NAMES.map(iconName => {
                      const isSelected = formData.icon === iconName;
                      return (
                        <button type="button" key={iconName} onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                          className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${isSelected ? 'bg-brand-purple text-white ring-2 ring-brand-purple' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                          <IconDisplay name={iconName} className="w-6 h-6" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-end space-x-3 flex-shrink-0">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200">{t('cancel')}</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-purple text-white text-sm font-medium rounded-xl hover:bg-purple-500 active:scale-95 transition-all duration-200">{t('save')}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
