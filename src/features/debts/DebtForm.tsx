// src/features/debts/DebtForm.tsx
// ФОРМА СОЗДАНИЯ/РЕДАКТИРОВАНИЯ ДОЛГА

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Debt, DebtType } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';
import { COMMON_CURRENCIES } from '../../utils/constants';
import { ChevronDown, Calendar, X } from 'lucide-react';
import { DatePicker } from '../../shared/ui/modals/DatePicker';

interface DebtFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (debt: Omit<Debt, 'id' | 'created_at' | 'updated_at'>) => void;
  debt?: Debt | null;
  defaultCurrency: string;
  categories: string[]; // Категории долгов
}

const defaultState = {
  person: '',
  description: '',
  category: '',
  amount: '',
  currency: 'USD',
  type: DebtType.I_OWE,
  date: new Date().toISOString(),
  due_date: '',
};

export const DebtForm: React.FC<DebtFormProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  debt, 
  defaultCurrency,
  categories 
}) => {
  const { t, language } = useLocalization();
  const [formData, setFormData] = useState(defaultState);
  const [amountStr, setAmountStr] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isDueDatePickerOpen, setIsDueDatePickerOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (debt) {
        setFormData({
          person: debt.person,
          description: debt.description || '',
          category: debt.category || '',
          amount: debt.amount.toString(),
          currency: debt.currency,
          type: debt.type,
          date: debt.date,
          due_date: debt.due_date || '',
        });
        setAmountStr(debt.amount.toString());
      } else {
        setFormData({ ...defaultState, currency: defaultCurrency });
        setAmountStr('');
      }
    }
  }, [debt, isOpen, defaultCurrency]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'amount') {
      const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
      setAmountStr(sanitizedValue);
      setFormData(prev => ({ ...prev, amount: sanitizedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleTypeChange = (type: DebtType) => {
    setFormData(prev => ({ ...prev, type }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!formData.person.trim()) {
      alert('Please enter a person name');
      return;
    }

    onSave({
      person: formData.person.trim(),
      description: formData.description.trim(),
      category: formData.category.trim(),
      amount: amount,
      current_amount: amount, // Initially, full amount is owed
      currency: formData.currency,
      type: formData.type,
      status: 'ACTIVE',
      date: formData.date,
      due_date: formData.due_date || undefined,
    });
  };

  const safeDate = new Date(formData.date);
  const safeDueDate = formData.due_date ? new Date(formData.due_date) : null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 rounded-2xl w-full max-w-md border border-zinc-800 overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">
                  {debt ? 'Edit Debt' : 'New Debt'}
                </h2>
                <button 
                  onClick={onClose} 
                  className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Person Name */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Person / Entity *
                  </label>
                  <input 
                    name="person"
                    value={formData.person}
                    onChange={handleChange}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>

                {/* Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-zinc-800 p-1 rounded-xl">
                    <button 
                      type="button"
                      onClick={() => handleTypeChange(DebtType.I_OWE)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.type === DebtType.I_OWE 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      I Owe
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleTypeChange(DebtType.OWED_TO_ME)}
                      className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.type === DebtType.OWED_TO_ME 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Owed to Me
                    </button>
                  </div>
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Amount *
                    </label>
                    <input 
                      type="text"
                      inputMode="decimal"
                      name="amount"
                      value={amountStr}
                      onChange={handleChange}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Currency
                    </label>
                    <div className="relative">
                      <select 
                        name="currency" 
                        value={formData.currency} 
                        onChange={handleChange}
                        className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 pr-10"
                      >
                        {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Category (Optional)
                  </label>
                  <div className="relative">
                    <select 
                      name="category" 
                      value={formData.category} 
                      onChange={handleChange}
                      className="w-full appearance-none bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 pr-10"
                    >
                      <option value="">None</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDatePickerOpen(true)}
                      className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      <span className="text-sm">
                        {safeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <Calendar className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">
                      Due Date
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsDueDatePickerOpen(true)}
                      className="w-full flex items-center justify-between bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                    >
                      <span className="text-sm">
                        {safeDueDate 
                          ? safeDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : 'None'
                        }
                      </span>
                      <Calendar className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 resize-none"
                    placeholder="Add notes..."
                  />
                </div>

                {/* Submit Button */}
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold mt-4 transition-colors"
                >
                  {debt ? 'Update Debt' : 'Create Debt'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Pickers */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <DatePicker
            isOpen={isDatePickerOpen}
            onClose={() => setIsDatePickerOpen(false)}
            onApply={(start) => {
              setFormData(prev => ({ ...prev, date: start.toISOString() }));
              setIsDatePickerOpen(false);
            }}
            initialStartDate={safeDate}
            initialEndDate={safeDate}
            selectionMode="single"
          />
        )}

        {isDueDatePickerOpen && (
          <DatePicker
            isOpen={isDueDatePickerOpen}
            onClose={() => setIsDueDatePickerOpen(false)}
            onApply={(start) => {
              setFormData(prev => ({ ...prev, due_date: start.toISOString() }));
              setIsDueDatePickerOpen(false);
            }}
            initialStartDate={safeDueDate || new Date()}
            initialEndDate={safeDueDate || new Date()}
            selectionMode="single"
          />
        )}
      </AnimatePresence>
    </>
  );
};