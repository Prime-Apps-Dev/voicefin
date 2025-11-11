import React, { useState, useEffect } from 'react';
import { Budget, Category, TransactionType } from '../types';
import { addBudget } from '../services/data-access'; // Нужен для обновления/создания

type BudgetFormMode = 'create' | 'edit';

interface BudgetFormProps {
    isOpen: boolean;
    onClose: () => void;
    // onSubmit принимает полный объект Budget (с id или без)
    onSubmit: (formData: Omit<Budget, 'id'>) => Promise<void>;
    initialData: Partial<Budget>;
    mode: BudgetFormMode;
    categories: Category[]; // Список категорий расходов для выбора
}

/**
 * ФОРМА БЮДЖЕТА (BudgetForm)
 * Используется для создания/редактирования объектов Budget в реляционной таблице.
 */
const BudgetForm: React.FC<BudgetFormProps> = ({ isOpen, onClose, onSubmit, initialData, mode, categories }) => {
    // Состояние формы
    const [monthKey, setMonthKey] = useState(initialData.monthkey || new Date().toISOString().substring(0, 7)); // YYYY-MM
    const [categoryId, setCategoryId] = useState(initialData.category || '');
    const [limit, setLimit] = useState(initialData.limit || 0);
    const [currency, setCurrency] = useState(initialData.currency || 'RUB');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Сброс состояния при открытии формы
    useEffect(() => {
        if (isOpen) {
            setMonthKey(initialData.monthkey || new Date().toISOString().substring(0, 7));
            setCategoryId(initialData.category || '');
            setLimit(initialData.limit || 0);
            setCurrency(initialData.currency || 'RUB');
            setIsSubmitting(false);

            // Если режим редактирования, то категория уже должна быть выбрана
            if (mode === 'edit' && initialData.category) {
                setCategoryId(initialData.category);
            }
        }
    }, [isOpen, initialData, mode]);

    // Фильтруем категории только для расходов (бюджетирование обычно для расходов)
    const expenseCategories = useMemo(() => 
        categories.filter(c => c.type === TransactionType.EXPENSE), 
        [categories]
    );

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!categoryId || limit <= 0) {
            console.warn('Пожалуйста, выберите категорию и укажите лимит.');
            return;
        }

        setIsSubmitting(true);
        
        // Находим иконку категории для сохранения
        const categoryIcon = categories.find(c => c.id === categoryId)?.icon || '💸';

        const formData: Omit<Budget, 'id'> = {
            monthkey: monthKey,
            category: categoryId,
            limit: limit,
            icon: categoryIcon,
            currency: currency,
        };

        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Ошибка при сохранении бюджета:', error);
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
                        {mode === 'create' ? 'Установить Бюджет' : 'Редактировать Бюджет'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 transition rounded-full">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    
                    {/* 1. Месяц (YYYY-MM) */}
                    <div>
                        <label htmlFor="month" className="block text-sm font-medium text-gray-700">Месяц</label>
                        <input
                            id="month"
                            type="month"
                            value={monthKey}
                            onChange={(e) => setMonthKey(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                            required
                            disabled={mode === 'edit'} // Месяц обычно не меняется при редактировании
                        />
                    </div>
                    
                    {/* 2. Категория */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">Категория расхода *</label>
                        <select
                            id="category"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                            required
                            disabled={mode === 'edit'} // Категория обычно не меняется при редактировании
                        >
                            <option value="" disabled>Выберите категорию</option>
                            {expenseCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Лимит */}
                    <div>
                        <label htmlFor="limit" className="block text-sm font-medium text-gray-700">Лимит бюджета</label>
                        <div className="mt-1 flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                {currency}
                            </span>
                            <input
                                id="limit"
                                type="number"
                                step="0.01"
                                value={limit || ''}
                                onChange={(e) => setLimit(parseFloat(e.target.value) || 0)}
                                className="flex-1 block w-full rounded-r-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 text-lg font-bold"
                                placeholder="50000.00"
                                required
                            />
                        </div>
                    </div>
                    
                    {/* 4. Валюта (Может быть скрыта, если предполагается основная валюта) */}
                    {/* <input type="hidden" value={currency} /> */}

                    {/* Кнопка Отправки */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !categoryId || limit <= 0}
                            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Сохранение...' : (mode === 'create' ? 'Установить Бюджет' : 'Сохранить Изменения')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default BudgetForm;