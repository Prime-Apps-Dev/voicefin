// src/features/debts/DebtsScreen.tsx

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Plus, ArrowDownCircle, ArrowUpCircle, Scale, Layers, Trash2, AlertCircle } from 'lucide-react';
import { useAppData } from '../../core/context/AppDataContext';
import { Debt, DebtType, TransactionType } from '../../core/types';
import LongPressWrapper from '../../shared/layout/LongPressWrapper';
import { ConfirmationModal } from '../../shared/ui/modals/ConfirmationModal';
import { TextInputModal } from '../../shared/ui/modals/TextInputModal';
import { TransactionForm } from '../transactions/TransactionForm';
import { COMMON_CURRENCIES, SYSTEM_CATEGORY_NAMES } from '../../utils/constants';

interface DebtsScreenProps {
  onBack: () => void;
}

// --- COMPONENTS ---

const DebtWidget = ({ 
  title, subtitle, amount, count, currency, type, onClick 
}: { 
  title: string; subtitle: string; amount: number; count: number; currency: string; type: 'red' | 'green' | 'blue' | 'orange'; onClick?: () => void
}) => {
  const gradients = {
    red: 'bg-gradient-to-br from-red-500 via-red-600 to-red-800 shadow-red-900/20',
    green: 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 shadow-emerald-900/20',
    blue: 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 shadow-blue-900/20',
    orange: 'bg-gradient-to-br from-orange-500 via-orange-600 to-orange-800 shadow-orange-900/20',
  };

  const Icons = {
    red: ArrowDownCircle,
    green: ArrowUpCircle,
    blue: Scale,
    orange: Scale
  };

  const Icon = Icons[type];

  return (
    <div onClick={onClick} className={`relative overflow-hidden ${gradients[type]} rounded-3xl p-6 text-white shadow-lg min-h-[140px] flex flex-col justify-between cursor-pointer transform transition-transform hover:scale-[1.02]`}>
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-sm">
            <Icon className="w-6 h-6" />
          </div>
          <div className="text-right">
            <div className="text-sm font-medium opacity-90">{title}</div>
            <div className="text-xs opacity-70">{count} {count === 1 ? 'item' : 'items'}</div>
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold mb-1 truncate">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)}
          </div>
          <div className="text-sm opacity-80">{subtitle}</div>
        </div>
      </div>
    </div>
  );
};

const DebtItem = ({ debt, onPress, onLongPress, onDelete }: { debt: Debt; onPress: () => void; onLongPress: () => void; onDelete: () => void }) => {
  const isIOwe = debt.type === DebtType.I_OWE;
  
  return (
    <LongPressWrapper
      onTap={onPress}
      onLongPress={onLongPress}
      onSwipeLeft={onDelete}
      swipeDeleteIcon={Trash2}
      item={debt}
    >
      <div className="relative overflow-hidden bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4 flex items-center justify-between mb-3">
         {/* Progress Bar Background */}
         <div 
            className={`absolute bottom-0 left-0 h-1 ${isIOwe ? 'bg-red-500/30' : 'bg-emerald-500/30'}`} 
            style={{ width: `${Math.min((debt.currentAmount / debt.amount) * 100, 100)}%` }}
         />
         
         <div className="flex items-center gap-4 z-10">
            <div className={`p-3 rounded-xl ${isIOwe ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {isIOwe ? <ArrowDownCircle className="w-6 h-6" /> : <ArrowUpCircle className="w-6 h-6" />}
            </div>
            <div>
                <h3 className="text-white font-semibold text-lg">{debt.person}</h3>
                <p className="text-zinc-400 text-sm truncate max-w-[150px]">{debt.description || 'No description'}</p>
            </div>
         </div>

         <div className="text-right z-10">
            <p className={`font-bold text-lg ${isIOwe ? 'text-red-400' : 'text-emerald-400'}`}>
                {new Intl.NumberFormat('en-US', { style: 'currency', currency: debt.currency }).format(debt.currentAmount)}
            </p>
            <p className="text-zinc-500 text-xs">of {new Intl.NumberFormat('en-US', { style: 'currency', currency: debt.currency }).format(debt.amount)}</p>
         </div>
      </div>
    </LongPressWrapper>
  );
};

export const DebtsScreen: React.FC<DebtsScreenProps> = ({ onBack }) => {
  const { debts, displayCurrency, handleSaveDebt, handleDeleteDebt, categories, accounts, savingsGoals, handleAddTransaction, budgets, transactions, rates, handleSaveBudget } = useAppData();

  const [activeTab, setActiveTab] = useState<'all' | 'owe' | 'owed'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [transactionModalData, setTransactionModalData] = useState<{ isOpen: boolean, debt: Debt | null }>({ isOpen: false, debt: null });
  const [deleteConfirmation, setDeleteConfirmation] = useState<Debt | null>(null);

  // --- FORM STATE ---
  const [formPerson, setFormPerson] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formType, setFormType] = useState<DebtType>(DebtType.I_OWE);
  const [formCurrency, setFormCurrency] = useState(displayCurrency);

  const resetForm = () => {
      setFormPerson('');
      setFormAmount('');
      setFormType(DebtType.I_OWE);
      setFormCurrency(displayCurrency);
      setEditingDebt(null);
      setIsAddModalOpen(false);
  };

  const openEdit = (debt: Debt) => {
      setFormPerson(debt.person);
      setFormAmount(debt.amount.toString());
      setFormType(debt.type);
      setFormCurrency(debt.currency);
      setEditingDebt(debt);
      setIsAddModalOpen(true);
  };

  const handleSave = async () => {
      if (!formPerson || !formAmount) return;
      
      const payload = {
          person: formPerson,
          amount: parseFloat(formAmount),
          currentAmount: editingDebt ? editingDebt.currentAmount : parseFloat(formAmount), // Reset current if new? No, keep logic simple
          currency: formCurrency,
          type: formType,
          date: editingDebt ? editingDebt.date : new Date().toISOString(),
          // If editing, keep ID, else undefined (context handles creation)
          ...(editingDebt ? { id: editingDebt.id } : {})
      };
      
      await handleSaveDebt(payload);
      resetForm();
  };

  // --- CALCULATIONS ---
  const { iOweTotal, owedTotal, iOweCount, owedCount, filteredDebts } = useMemo(() => {
      const iOwe = debts.filter(d => d.type === DebtType.I_OWE);
      const owed = debts.filter(d => d.type === DebtType.OWED_TO_ME);
      
      const iOweSum = iOwe.reduce((acc, d) => acc + d.currentAmount, 0); // Simplified currency conversion for widget (should be converted)
      const owedSum = owed.reduce((acc, d) => acc + d.currentAmount, 0);

      let filtered = debts;
      if (activeTab === 'owe') filtered = iOwe;
      if (activeTab === 'owed') filtered = owed;

      return { 
          iOweTotal: iOweSum, 
          owedTotal: owedSum, 
          iOweCount: iOwe.length, 
          owedCount: owed.length,
          filteredDebts: filtered
      };
  }, [debts, activeTab]);

  const netBalance = owedTotal - iOweTotal;

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col pb-24 relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/50 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
                <h1 className="text-xl font-bold text-white">Debts</h1>
                <p className="text-xs text-zinc-400">Manage loans and borrowings</p>
            </div>
        </div>
        <button 
            onClick={() => setIsAddModalOpen(true)} 
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all"
        >
            <Plus className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-grow px-4 py-6 space-y-8 overflow-y-auto">
        
        {/* Widgets Swiper (Simplified as Grid for now) */}
        <div className="space-y-4">
            <DebtWidget 
                title="Balance" 
                subtitle={netBalance >= 0 ? "Positive" : "Negative"}
                amount={Math.abs(netBalance)}
                count={debts.length}
                currency={displayCurrency}
                type={netBalance >= 0 ? 'blue' : 'orange'}
            />
            <div className="grid grid-cols-2 gap-4">
                <DebtWidget 
                    title="I Owe" 
                    subtitle="To pay"
                    amount={iOweTotal}
                    count={iOweCount}
                    currency={displayCurrency}
                    type="red"
                    onClick={() => setActiveTab('owe')}
                />
                <DebtWidget 
                    title="Owed to Me" 
                    subtitle="To receive"
                    amount={owedTotal}
                    count={owedCount}
                    currency={displayCurrency}
                    type="green"
                    onClick={() => setActiveTab('owed')}
                />
            </div>
        </div>

        {/* Filters */}
        <div className="flex p-1 bg-zinc-800 rounded-xl">
            {(['all', 'owe', 'owed'] as const).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab 
                        ? 'bg-zinc-700 text-white shadow-md' 
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                >
                    {tab === 'all' ? 'All' : tab === 'owe' ? 'I Owe' : 'Owed to Me'}
                </button>
            ))}
        </div>

        {/* List */}
        <div className="space-y-2 pb-10">
            <AnimatePresence mode="popLayout">
                {filteredDebts.length > 0 ? (
                    filteredDebts.map(debt => (
                        <motion.div
                            key={debt.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                        >
                            <DebtItem 
                                debt={debt} 
                                onPress={() => setTransactionModalData({ isOpen: true, debt })}
                                onLongPress={() => openEdit(debt)}
                                onDelete={() => setDeleteConfirmation(debt)}
                            />
                        </motion.div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                        <Layers className="w-12 h-12 mb-3 opacity-50" />
                        <p>No debts found</p>
                    </div>
                )}
            </AnimatePresence>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* ADD/EDIT DEBT MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-zinc-900 rounded-2xl w-full max-w-sm border border-zinc-800 overflow-hidden shadow-xl"
                >
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white">{editingDebt ? 'Edit Debt' : 'New Debt'}</h2>
                        <button onClick={resetForm} className="text-zinc-400 hover:text-white">✕</button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Person / Entity</label>
                            <input 
                                value={formPerson}
                                onChange={e => setFormPerson(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. John Doe"
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Amount</label>
                                <input 
                                    type="number"
                                    value={formAmount}
                                    onChange={e => setFormAmount(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="w-1/3">
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Currency</label>
                                <select 
                                    value={formCurrency} 
                                    onChange={e => setFormCurrency(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500"
                                >
                                    {COMMON_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Type</label>
                            <div className="grid grid-cols-2 gap-2 bg-zinc-800 p-1 rounded-xl">
                                <button 
                                    onClick={() => setFormType(DebtType.I_OWE)}
                                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${formType === DebtType.I_OWE ? 'bg-red-500/20 text-red-400' : 'text-zinc-400'}`}
                                >
                                    I Owe
                                </button>
                                <button 
                                    onClick={() => setFormType(DebtType.OWED_TO_ME)}
                                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${formType === DebtType.OWED_TO_ME ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-400'}`}
                                >
                                    Owed to Me
                                </button>
                            </div>
                        </div>
                        <button 
                            onClick={handleSave}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold mt-4"
                        >
                            Save Debt
                        </button>
                    </div>
                </motion.div>
             </motion.div>
        )}
      </AnimatePresence>

      {/* TRANSACTION MODAL (REPAYMENT) */}
      <AnimatePresence>
        {transactionModalData.isOpen && transactionModalData.debt && (
            <TransactionForm
                transaction={{
                    name: `Repayment: ${transactionModalData.debt.person}`,
                    amount: 0, // User enters amount
                    currency: transactionModalData.debt.currency,
                    // Logic:
                    // If I Owe -> I am repaying -> Expense -> Category: Repayment
                    // If Owed to Me -> They are repaying -> Income -> Category: Repayment
                    type: transactionModalData.debt.type === DebtType.I_OWE ? TransactionType.EXPENSE : TransactionType.INCOME,
                    category: transactionModalData.debt.type === DebtType.I_OWE 
                        ? SYSTEM_CATEGORY_NAMES.DEBT_REPAYMENT_SENT 
                        : SYSTEM_CATEGORY_NAMES.DEBT_REPAYMENT_RECEIVED,
                    date: new Date().toISOString(),
                    debtId: transactionModalData.debt.id,
                    accountId: accounts[0]?.id
                } as any}
                categories={categories}
                accounts={accounts}
                savingsGoals={savingsGoals}
                budgets={budgets}
                transactions={transactions}
                onCreateBudget={handleSaveBudget}
                rates={rates}
                defaultCurrency={displayCurrency}
                onConfirm={(tx) => {
                    handleAddTransaction(tx);
                    setTransactionModalData({ isOpen: false, debt: null });
                }}
                onCancel={() => setTransactionModalData({ isOpen: false, debt: null })}
                // Lock category so user doesn't break logic easily
                isCategoryLocked={true}
            />
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title="Delete Debt?"
        message="This will delete the debt record. Related transactions will remain but will be unlinked."
        onConfirm={() => {
            if (deleteConfirmation) handleDeleteDebt(deleteConfirmation.id);
            setDeleteConfirmation(null);
        }}
        onCancel={() => setDeleteConfirmation(null)}
      />
    </div>
  );
};