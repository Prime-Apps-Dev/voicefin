import React, { useState, useEffect } from 'react';
import { Account, AccountType } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon'; // Предполагается, что существует

type AccountFormMode = 'create' | 'edit';

interface AccountFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: Omit<Account, 'id'>) => Promise<void>;
    initialData: Partial<Account>; // Инициализируем частичными данными (без id)
    mode: AccountFormMode;
}

/**
 * ФОРМА СЧЕТА (AccountForm)
 * Используется для создания и редактирования объектов Account.
 */
const AccountForm: React.FC<AccountFormProps> = ({ isOpen, onClose, onSubmit, initialData, mode }) => {
    // Состояние формы
    const [name, setName] = useState(initialData.name || '');
    const [currency, setCurrency] = useState(initialData.currency || 'RUB');
    const [type, setType] = useState(initialData.type || AccountType.CARD);
    const [gradient, setGradient] = useState(initialData.gradient || '#6366f1'); // Цвет градиента (для отображения)
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Сброс состояния при открытии формы
    useEffect(() => {
        if (isOpen) {
            setName(initialData.name || '');
            setCurrency(initialData.currency || 'RUB');
            setType(initialData.type || AccountType.CARD);
            setGradient(initialData.gradient || '#6366f1');
            setIsSubmitting(false);
        }
    }, [isOpen, initialData]);

    const availableCurrencies = ['RUB', 'USD', 'EUR', 'KZT', 'GBP'];
    const availableColors = ['#6366f1', '#10b981', '#f97316', '#ef4444', '#06b6d4', '#8b5cf6'];

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !currency) {
            console.warn('Пожалуйста, заполните название и валюту.');
            return;
        }

        setIsSubmitting(true);

        const formData: Omit<Account, 'id'> = {
            name,
            currency,
            type,
            gradient,
        };

        try {
            await onSubmit(formData);
            // onClose вызывается в родительском компоненте после успешной обработки
        } catch (error) {
            console.error('Ошибка при сохранении счета:', error);
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
                        {mode === 'create' ? 'Новый Счет' : 'Редактировать Счет'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 transition rounded-full">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    
                    {/* 1. Название */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Название счета</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                            placeholder="Например, Основная Карта"
                            required
                        />
                    </div>
                    
                    {/* 2. Тип счета */}
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700">Тип</label>
                        <div className="flex space-x-2 mt-1 bg-gray-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setType(AccountType.CARD)}
                                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                                    type === AccountType.CARD 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-gray-600 hover:bg-white'
                                }`}
                            >
                                Карта
                            </button>
                            <button
                                type="button"
                                onClick={() => setType(AccountType.CASH)}
                                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                                    type === AccountType.CASH 
                                        ? 'bg-white text-indigo-600 shadow-sm' 
                                        : 'text-gray-600 hover:bg-white'
                                }`}
                            >
                                Наличные
                            </button>
                        </div>
                    </div>

                    {/* 3. Валюта */}
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

                    {/* 4. Цвет / Градиент */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Цвет карточки</label>
                        <div className="flex space-x-3 justify-start">
                            {availableColors.map(color => (
                                <button
                                    type="button"
                                    key={color}
                                    onClick={() => setGradient(color)}
                                    className="w-10 h-10 rounded-full border-2 p-0.5 transition duration-150 ease-in-out flex items-center justify-center"
                                    style={{ backgroundColor: color, borderColor: gradient === color ? color : 'transparent', outline: gradient === color ? `3px solid ${color}80` : 'none' }}
                                >
                                    {gradient === color && <CheckCircleIcon className="w-6 h-6 text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Кнопка Отправки */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !name}
                            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Сохранение...' : (mode === 'create' ? 'Создать Счет' : 'Сохранить Изменения')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default AccountForm;