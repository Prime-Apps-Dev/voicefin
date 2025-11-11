import React, { useState, useEffect } from 'react';
import { Category, TransactionType } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon'; // Предполагается, что существует

type CategoryFormMode = 'create' | 'edit';

interface CategoryFormProps {
    isOpen: boolean;
    onClose: () => void;
    // FormData включает isfavorite/isdefault, которые могут быть изменены в форме
    onSubmit: (formData: Omit<Category, 'id'>) => Promise<void>;
    initialData: Partial<Category>;
    mode: CategoryFormMode;
}

/**
 * ФОРМА КАТЕГОРИИ (CategoryForm)
 * Используется для создания и редактирования объектов Category.
 */
const CategoryForm: React.FC<CategoryFormProps> = ({ isOpen, onClose, onSubmit, initialData, mode }) => {
    // Состояние формы
    const [name, setName] = useState(initialData.name || '');
    const [icon, setIcon] = useState(initialData.icon || '🛍️');
    const [type, setType] = useState(initialData.type || TransactionType.EXPENSE);
    const [isFavorite, setIsFavorite] = useState(initialData.isfavorite || false);
    const [isDefault, setIsDefault] = useState(initialData.isdefault || false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Сброс состояния при открытии формы
    useEffect(() => {
        if (isOpen) {
            setName(initialData.name || '');
            setIcon(initialData.icon || '🛍️');
            setType(initialData.type || TransactionType.EXPENSE);
            setIsFavorite(initialData.isfavorite || false);
            setIsDefault(initialData.isdefault || false);
            setIsSubmitting(false);
        }
    }, [isOpen, initialData]);

    const availableIcons = ['🛍️', '🏠', '🚗', '☕', '🍜', '🏥', '💸', '🎁', '💡', '💰'];

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !icon) {
            console.warn('Пожалуйста, заполните название и выберите иконку.');
            return;
        }

        setIsSubmitting(true);

        const formData: Omit<Category, 'id'> = {
            name,
            icon,
            type,
            isfavorite: isFavorite,
            isdefault: isDefault,
        };

        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Ошибка при сохранении категории:', error);
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
                        {mode === 'create' ? 'Новая Категория' : 'Редактировать Категорию'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 transition rounded-full">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                    
                    {/* 1. Название */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Название категории</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                            placeholder="Например, Продукты, Зарплата"
                            required
                        />
                    </div>
                    
                    {/* 2. Тип */}
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700">Тип транзакции</label>
                        <div className="flex space-x-2 mt-1 bg-gray-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setType(TransactionType.EXPENSE)}
                                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                                    type === TransactionType.EXPENSE 
                                        ? 'bg-red-500 text-white shadow-md' 
                                        : 'text-gray-600 hover:bg-white'
                                }`}
                            >
                                Расход
                            </button>
                            <button
                                type="button"
                                onClick={() => setType(TransactionType.INCOME)}
                                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                                    type === TransactionType.INCOME 
                                        ? 'bg-green-500 text-white shadow-md' 
                                        : 'text-gray-600 hover:bg-white'
                                }`}
                            >
                                Доход
                            </button>
                        </div>
                    </div>

                    {/* 3. Иконка */}
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

                    {/* 4. Чекбоксы (Избранное / По умолчанию) */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center">
                            <input
                                id="isFavorite"
                                type="checkbox"
                                checked={isFavorite}
                                onChange={(e) => setIsFavorite(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isFavorite" className="ml-3 block text-sm font-medium text-gray-700">
                                Добавить в избранное
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="isDefault"
                                type="checkbox"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="isDefault" className="ml-3 block text-sm font-medium text-gray-700">
                                Категория по умолчанию (для авто-парсинга)
                            </label>
                        </div>
                    </div>


                    {/* Кнопка Отправки */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || !name}
                            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Сохранение...' : (mode === 'create' ? 'Создать Категорию' : 'Сохранить Изменения')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default CategoryForm;