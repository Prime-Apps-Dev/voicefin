import React, { useState, useEffect } from 'react';
import { SavingsGoal } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon'; // Предполагается, что существует

type GoalFormMode = 'create' | 'edit';

interface SavingsGoalFormProps {
    isOpen: boolean;
    onClose: () => void;
    // FormData включает currentamount, который может быть изменен при создании
    onSubmit: (formData: Omit<SavingsGoal, 'id'>) => Promise<void>; 
    initialData: Partial<SavingsGoal>;
    mode: GoalFormMode;
}

/**
 * ФОРМА ЦЕЛИ СБЕРЕЖЕНИЙ (SavingsGoalForm)
 * Используется для создания и редактирования объектов SavingsGoal.
 */
const SavingsGoalForm: React.FC<SavingsGoalFormProps> = ({ isOpen, onClose, onSubmit, initialData, mode }) => {
    // Состояние формы
    const [name, setName] = useState(initialData.name || '');
    const [targetAmount, setTargetAmount] = useState(initialData.targetamount || 0);
    const [currentAmount, setCurrentAmount] = useState(initialData.currentamount || 0);
    const [icon, setIcon] = useState(initialData.icon || '🎯');
    const [currency, setCurrency] = useState(initialData.currency || 'RUB');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Сброс состояния при открытии формы
    useEffect(() => {
        if (isOpen) {
            setName(initialData.name || '');
            setTargetAmount(initialData.targetamount || 0);
            setCurrentAmount(initialData.currentamount || 0);
            setIcon(initialData.icon || '🎯');
            setCurrency(initialData.currency || 'RUB');
            setIsSubmitting(false);
        }
    }, [isOpen, initialData]);

    const availableIcons = ['🎯', '🏡', '🚗', '🎓', '🏖️', '💻', '💍', '👶', '🐶', '✈️'];
    const availableCurrencies = ['RUB', 'USD', 'EUR', 'KZT', 'GBP'];

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || targetAmount <= 0) {
            console.warn('Пожалуйста, заполните название и целевую сумму.');
            return;
        }

        setIsSubmitting(true);

        const formData: Omit<SavingsGoal, 'id'> = {
            name,
            targetamount: targetAmount,
            // currentAmount можно установить только при создании или использовать существующее значение при редактировании
            currentamount: mode === 'create' ? currentAmount : initialData.currentamount || 0,
            icon,
            currency,
        };

        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Ошибка при сохранении цели:', error);
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-70 flex items-end justify-center z-50 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-t-3xl shadow-2xl w-full max-w-lg transform transition-transform duration-300 translate-y-0"
                 role="dialog"
                 aria-modal="true"
            >
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {mode === 'create' ? 'Новая Цель Сбережений' : 'Редактировать Цель'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 transition rounded-full">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    
                    {/* 1. Название */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Название цели</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                            placeholder="Например, Отпуск на Бали"
                            required
                        />
                    </div>
                    
                    {/* 2. Иконка */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Иконка</label>
                        <div className="flex flex-wrap gap-3">
                            {availableIcons.map(i => (
                                <button
                                    type="button"
                                    key={i}
                                    onClick={() => setIcon(i)}
                                    className={`w-10 h-10 text-xl rounded-full border-2 p-1 transition duration-150 ease-in-out flex items-center justify-center ${
                                        icon === i ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:bg-gray-100'
                                    }`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Целевая Сумма */}
                    <div>
                        <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700">Целевая сумма</label>
                        <div className="mt-1 flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                {currency}
                            </span>
                            <input
                                id="targetAmount"
                                type="number"
                                step="0.01"
                                value={targetAmount || ''}
                                onChange={(e) => setTargetAmount(parseFloat(e.target.value) || 0)}
                                className="flex-1 block w-full rounded-r-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 font-bold"
                                placeholder="100000.00"
                                required
                            />
                        </div>
                    </div>
                    
                    {/* 4. Текущая Сумма (Только при создании) */}
                    {mode === 'create' && (
                        <div>
                            <label htmlFor="currentAmount" className="block text-sm font-medium text-gray-700">Начальная сумма накопления</label>
                             <div className="mt-1 flex rounded-lg shadow-sm">
                                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                    {currency}
                                </span>
                                <input
                                    id="currentAmount"
                                    type="number"
                                    step="0.01"
                                    value={currentAmount || ''}
                                    onChange={(e) => setCurrentAmount(parseFloat(e.target.value) || 0)}
                                    className="flex-1 block w-full rounded-r-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 font-bold"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Примечание: Текущая сумма при редактировании меняется только через транзакции.
                            </p>
                        </div>
                    )}
                    
                    {/* 5. Валюта */}
                    <div>
                        <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Валюта</label>
                        <select
                            id="currency"
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                            required
                        >
                            {availableCurrencies.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Кнопка Отправки */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !name || targetAmount <= 0}
                            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Сохранение...' : (mode === 'create' ? 'Создать Цель' : 'Сохранить Изменения')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default SavingsGoalForm;