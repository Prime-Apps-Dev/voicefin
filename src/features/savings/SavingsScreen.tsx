import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Target, Trash2, Car, Home, GraduationCap, Plane, Gift, Heart, ShoppingCart, Laptop, Sprout, PiggyBank, Gamepad2 } from 'lucide-react';
import { SavingsGoal } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';
import LongPressWrapper from '../../shared/layout/LongPressWrapper';

// Icon component map
const iconMap: { [key: string]: React.ElementType } = {
  Car, Home, GraduationCap, Plane, Gift, Heart, ShoppingCart, Laptop, Target, Sprout, PiggyBank, Gamepad2,
  default: Target,
};

const IconDisplay: React.FC<{ name: string; className?: string; }> = ({ name, className }) => {
  const IconComponent = iconMap[name] || iconMap.default;
  return <IconComponent className={className} />;
};

interface SavingsGoalCardProps {
  goal: SavingsGoal;
  onTap: (goal: SavingsGoal) => void;
  onDoubleTap: (goal: SavingsGoal) => void;
  onLongPress: (goal: SavingsGoal) => void;
  onSwipeLeft: (goal: SavingsGoal) => void;
}

const SavingsGoalCard: React.FC<SavingsGoalCardProps> = ({ goal, onTap, onDoubleTap, onLongPress, onSwipeLeft }) => {
  const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <LongPressWrapper<SavingsGoal>
        item={goal}
        onTap={onTap}
        onDoubleTap={onDoubleTap}
        onLongPress={onLongPress}
        onSwipeLeft={onSwipeLeft}
        swipeDeleteIcon={Trash2}
        children={
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 p-5 rounded-2xl shadow-lg text-white w-full transform transition-transform duration-300 hover:scale-102 cursor-pointer">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full opacity-50" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white/20 rounded-xl">
                    <IconDisplay name={goal.icon} className="w-7 h-7" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-lg break-words">{goal.name}</h3>
                    <p className="text-sm text-purple-200">{progress.toFixed(1)}% complete</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium text-purple-100">
                  <span>{formatCurrency(goal.currentAmount, goal.currency)}</span>
                  <span>{formatCurrency(goal.targetAmount, goal.currency)}</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2.5">
                  <div
                    className="bg-white h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        }
      />
    </motion.div>
  );
};


interface SavingsScreenProps {
  goals: SavingsGoal[];
  onAddGoal: () => void;
  onAddToGoal: (goal: SavingsGoal) => void;
  onViewGoalHistory: (goal: SavingsGoal) => void;
  onEditGoal: (goal: SavingsGoal) => void;
  onDeleteGoal: (goal: SavingsGoal) => void;
}

export const SavingsScreen: React.FC<SavingsScreenProps> = (props) => {
  const { goals, onAddGoal, onAddToGoal, onViewGoalHistory, onEditGoal, onDeleteGoal } = props;
  const { t } = useLocalization();

  return (
    // 1. Корневой div с отступом для маски
    <div className="min-h-screen bg-gray-900">
        
        {/* 2. Новый "липкий" header */}
        <header className="sticky top-0 bg-gray-900/80 backdrop-blur-sm z-10 px-4 pt-4 flex items-center justify-between">
           <h1 className="pl-2 text-2xl font-bold text-white">{t('mySavingsGoals')}</h1>
           <button 
              onClick={onAddGoal} 
              className="p-2 rounded-full text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              aria-label={t('addGoal')}
          >
             <Plus className="w-6 h-6" />
           </button>
        </header>

        {/* 3. Основной контент */}
        <main className="max-w-4xl mx-auto p-4 pb-32">
            {/* Старый div, но уже без header'а внутри */}
            <div className="space-y-4 px-2">
                {goals.length > 0 ? (
                  <div className="space-y-4">
                    {goals.map(goal => (
                      <SavingsGoalCard 
                        key={goal.id} 
                        goal={goal}
                        onTap={onAddToGoal}
                        onDoubleTap={onViewGoalHistory}
                        onLongPress={onEditGoal}
                        onSwipeLeft={onDeleteGoal}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700/50">
                    <Target className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white">{t('noGoals')}</h3>
                    <p className="text-gray-400 mt-2 max-w-xs mx-auto">{t('addFirstGoal')}</p>
                  </div>
                )}
            </div>
        </main>
    </div>
  );
};