import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Transaction, 
    TransactionType, 
    Account, 
    Category, 
    SavingsGoal 
} from '../types';
import { 
    fetchUserProfile, 
    addTransaction 
} from '../services/data-access';

// Предполагаемые импорты компонентов UI
import { TextInputModal } from './TextInputModal'; 
import { DatePicker } from './DatePicker'; 
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import { ArrowDownIcon } from './icons/ArrowDownIcon';

// --- Имитация Auth Context ---
const MOCK_USER_ID = 'user-uuid-from-auth-service'; 
// --- Конец Имитации ---

type TransactionFormMode = 'create' | 'edit';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    // При создании, ID не нужен, при редактировании — нужен
    onSubmit: (transactionData: Omit<Transaction, 'id'>) => Promise<void>; 
    initialData: Partial<Transaction> & { type: TransactionType };
    mode: TransactionFormMode;
}

/**
 * ФОРМА ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ ТРАНЗАКЦИИ (TransactionForm)
 * Загружает метаданные из JSONB (Accounts, Categories, Goals) 
 * и сохраняет транзакцию в реляционную таблицу 'transactions'.
 */
const TransactionForm: React.FC<TransactionFormProps> = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    initialData, 
    mode 
}) => {
    // Состояние формы
    const [amount, setAmount] = useState(initialData.amount || 0);
    const [name, setName] = useState(initialData.name || '');
    const [date, setDate] = useState(initialData.date || new Date().toISOString().split('T')[0]);
    const [type, setType] = useState(initialData.type);
    const [accountId, setAccountId] = useState(initialData.accountid || '');
    const [categoryId, setCategoryId] = useState(initialData.category || '');
    const [goalId, setGoalId] = useState(initialData.goalid || undefined);
    const [description, setDescription] = useState(initialData.description || '');

    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Списки для выбора из JSONB
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

    // ------------------------------------------------------------------
    // 1. ЗАГРУЗКА МЕТАДАННЫХ (ACCOUNTS, CATEGORIES, GOALS) ИЗ JSONB
    // ------------------------------------------------------------------
    const loadMetadata = useCallback(async () => {
        setIsLoadingMetadata(true);
        try {
            const profile = await fetchUserProfile(MOCK_USER_ID);
            if (profile) {
                setAccounts(profile.data.accounts);
                setCategories(profile.data.categories);
                setGoals(profile.data.savingsGoals);

                // Если это новая транзакция, устанавливаем значения по умолчанию
                if (mode === 'create') {
                    if (profile.data.accounts.length > 0) {
                        setAccountId(profile.data.accounts[0].id); // Первый счет по умолчанию
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки метаданных:', error);
        } finally {
            setIsLoadingMetadata(false);
        }
    }, [mode]);

    useEffect(() => {
        loadMetadata();
    }, [loadMetadata]);
    
    // ------------------------------------------------------------------
    // 2. ФИЛЬТРАЦИЯ КАТЕГОРИЙ ПО ТИПУ
    // ------------------------------------------------------------------

    const availableCategories = useMemo(() => {
        return categories.filter(c => c.type === type);
    }, [categories, type]);

    const currency = useMemo(() => {
        return accounts.find(acc => acc.id === accountId)?.currency || 'RUB';
    }, [accounts, accountId]);

    // ------------------------------------------------------------------
    // 3. ОБРАБОТКА ОТПРАВКИ
    // ------------------------------------------------------------------

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (amount <= 0 || !name || !accountId || !categoryId) {
            // Использование custom modal или toast вместо alert
            console.warn('Пожалуйста, заполните все обязательные поля (Сумма, Название, Счет, Категория).');
            return;
        }

        setIsSubmitting(true);
        
        // Находим валюту счета для транзакции
        const finalCurrency = currency;
        
        // Формируем объект транзакции (без id, так как он генерируется в БД)
        const transactionData: Omit<Transaction, 'id'> = {
            accountid: accountId,
            name: name,
            amount: amount,
            currency: finalCurrency,
            category: categoryId,
            date: date,
            type: type,
            description: description || undefined,
            goalid: type === TransactionType.EXPENSE ? undefined : goalId, // Привязываем к цели только для доходов/сбережений
        };

        try {
            // Вызываем внешний onSubmit, который должен вызвать addTransaction/updateTransaction
            await onSubmit(transactionData); 
            // Примечание: Для создания вызывается addTransaction, 
            // который сохраняет данные в реляционную таблицу!
            
            onClose(); // Закрываем модальное окно после успешной отправки
        } catch (error) {
            console.error('Ошибка при сохранении транзакции:', error);
            setIsSubmitting(false);
        }
    };
    
    if (!isOpen) return null;

    if (isLoadingMetadata) {
        return (
             <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
                    <p className="text-center text-indigo-600">Загрузка данных...</p>
                </div>
             </div>
        );
    }

    // ------------------------------------------------------------------
    // 4. РЕНДЕРИНГ
    // ------------------------------------------------------------------

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-70 flex items-end justify-center z-50 transition-opacity duration-300">
            <div className="bg-white p-6 rounded-t-3xl shadow-2xl w-full max-w-lg transform transition-transform duration-300 translate-y-0"
                 role="dialog"
                 aria-modal="true"
            >
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                        {mode === 'create' ? 'Новая Транзакция' : 'Редактировать Транзакцию'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 transition rounded-full">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-4 overflow-y-auto max-h-[70vh]">
                    
                    {/* 1. Тип Транзакции (Расход/Доход) */}
                    <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType(TransactionType.EXPENSE)}
                            className={`flex-1 py-2 rounded-lg font-semibold transition ${
                                type === TransactionType.EXPENSE 
                                    ? 'bg-red-500 text-white shadow-md' 
                                    : 'text-gray-600 hover:bg-white'
                            }`}
                        >
                            <ArrowDownIcon className="w-5 h-5 inline mr-1" /> Расход
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
                            <ArrowUpIcon className="w-5 h-5 inline mr-1" /> Доход
                        </button>
                    </div>

                    {/* 2. Сумма */}
                    <div className="relative">
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                            Сумма *
                        </label>
                        <div className="mt-1 flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                                {currency}
                            </span>
                            <input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={amount || ''}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                className="flex-1 block w-full rounded-r-lg border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 p-3 text-lg font-bold"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>
                    
                    {/* 3. Название / Описание */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Название (Обязательно)
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                            placeholder={type === TransactionType.EXPENSE ? 'Покупка продуктов' : 'Зарплата'}
                            required
                        />
                    </div>
                    
                    {/* 4. Счет */}
                    <div>
                        <label htmlFor="account" className="block text-sm font-medium text-gray-700">
                            Счет *
                        </label>
                        <select
                            id="account"
                            value={accountId}
                            onChange={(e) => setAccountId(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                            required
                        >
                            {accounts.length === 0 ? (
                                <option value="" disabled>Нет доступных счетов</option>
                            ) : (
                                accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({acc.currency})
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    
                    {/* 5. Категория */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Категория *
                        </label>
                        <select
                            id="category"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                            required
                        >
                            {availableCategories.length === 0 ? (
                                <option value="" disabled>Нет доступных категорий ({type === TransactionType.EXPENSE ? 'Расхода' : 'Дохода'})</option>
                            ) : (
                                availableCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.icon} {cat.name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                    
                    {/* 6. Цель Сбережений (Только для Доходов) */}
                    {type === TransactionType.INCOME && (
                        <div>
                            <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
                                Привязать к цели сбережений (Опционально)
                            </label>
                            <select
                                id="goal"
                                value={goalId || ''}
                                onChange={(e) => setGoalId(e.target.value || undefined)}
                                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                            >
                                <option value="">Не привязывать</option>
                                {goals.length === 0 ? (
                                    <option value="" disabled>Нет активных целей сбережений</option>
                                ) : (
                                    goals.map(goal => (
                                        <option key={goal.id} value={goal.id}>
                                            {goal.icon} {goal.name} ({goal.targetamount.toFixed(0)} {goal.currency})
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    )}
                    
                    {/* 7. Дата */}
                    <div className="relative">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                            Дата
                        </label>
                        {/* Используем компонент DatePicker (предполагаем, что он существует) */}
                        <DatePicker 
                            selectedDate={date} 
                            onDateChange={setDate} 
                            inputClassName="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 bg-white"
                        />
                    </div>

                    {/* 8. Подробное Описание (опционально) */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Подробное описание (опционально)
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3"
                            placeholder="Дополнительные детали транзакции..."
                        />
                    </div>

                    {/* Кнопка Отправки */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || isLoadingMetadata}
                            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition disabled:opacity-50"
                        >
                            {isSubmitting ? 'Сохранение...' : (mode === 'create' ? 'Добавить Транзакцию' : 'Сохранить Изменения')}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

// Заглушка для компонента DatePicker, если он не был предоставлен
// В реальном приложении этот компонент должен быть импортирован
const DatePicker: React.FC<{
    selectedDate: string;
    onDateChange: (date: string) => void;
    inputClassName: string;
}> = ({ selectedDate, onDateChange, inputClassName }) => {
    return (
        <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className={inputClassName}
        />
    );
};

export default TransactionForm;