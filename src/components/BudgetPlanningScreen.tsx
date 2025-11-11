import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Budget, Category, Account, Transaction, TransactionType } from '../types';
import { 
    fetchUserProfile, 
    fetchBudgetsByMonth, 
    addBudget, 
    updateBudget, // <--- ДОБАВЛЕН ИМПОРТ ДЛЯ РЕЖИМА РЕДАКТИРОВАНИЯ
    fetchTransactionsByPeriod 
} from '../services/data-access';
import { Header } from './Header'; // Предполагается, что существует
import { PlusIcon } from './icons/PlusIcon'; // Предполагается, что существует
import BudgetForm from './BudgetForm'; // Предполагается, что существует
import { BudgetSummary } from './BudgetSummary'; // Предполагается, что существует

// --- Имитация Auth Context ---
const MOCK_USER_ID = 'user-uuid-from-auth-service'; 
// --- Конец Имитации ---

// Вспомогательная функция для получения ключа месяца (YYYY-MM)
const getMonthKey = (date: Date): string => {
    const year = date.getFullYear();
    // getMonth() возвращает 0-11, поэтому добавляем 1
    const month = String(date.getMonth() + 1).padStart(2, '0'); 
    return `${year}-${month}`;
};

// Вспомогательная функция для получения диапазона дат месяца
const getMonthDateRange = (date: Date): { start: string, end: string } => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // День 0 следующего месяца — это последний день текущего
    
    return {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
    };
};

type BudgetFormMode = 'create' | 'edit';

/**
 * ЭКРАН ПЛАНИРОВАНИЯ БЮДЖЕТА (BudgetPlanningScreen)
 * Работает с реляционной таблицей 'budgets'.
 */
const BudgetPlanningScreen: React.FC = () => {
    // Состояние для выбранного месяца
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const currentMonthKey = useMemo(() => getMonthKey(currentMonth), [currentMonth]);
    
    // Данные: Бюджеты из БД, Категории из JSONB
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    
    // Состояние UI
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [formMode, setFormMode] = useState<BudgetFormMode>('create');

    // ------------------------------------------------------------------
    // 1. ЛОГИКА ЗАГРУЗКИ (Profiles.data.categories, Budgets, Transactions)
    // ------------------------------------------------------------------
    const loadData = useCallback(async (month: Date) => {
        setIsLoading(true);
        setError(null);
        const monthKey = getMonthKey(month);
        const { start: startDate, end: endDate } = getMonthDateRange(month);

        try {
            // 1. Загрузка категорий из JSONB (Profiles)
            const profile = await fetchUserProfile(MOCK_USER_ID);
            if (profile) {
                setCategories(profile.data.categories.filter(c => c.type === TransactionType.EXPENSE));
            } else {
                setError('Не удалось загрузить данные пользователя.');
                setCategories([]);
                return;
            }

            // 2. Загрузка бюджетов из реляционной таблицы 'budgets'
            const budgetsData = await fetchBudgetsByMonth(MOCK_USER_ID, monthKey);
            setBudgets(budgetsData);

            // 3. Загрузка транзакций из реляционной таблицы 'transactions' для расчета остатка
            const transactionsData = await fetchTransactionsByPeriod(MOCK_USER_ID, startDate, endDate);
            setTransactions(transactionsData.filter(t => t.type === TransactionType.EXPENSE)); // Только расходы

        } catch (err) {
            console.error('Ошибка при загрузке данных бюджета:', err);
            setError('Ошибка при загрузке данных бюджета. Пожалуйста, попробуйте позже.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(currentMonth);
    }, [currentMonth, loadData]); // Перезагружаем при смене месяца

    // ------------------------------------------------------------------
    // 2. ЛОГИКА ОБНОВЛЕНИЯ (ЗАПИСЬ В budgets)
    // ------------------------------------------------------------------
    
    const handleFormSubmit = async (formData: Omit<Budget, 'id'> | Budget) => {
        setIsModalOpen(false);
        setIsLoading(true);
        setError(null);
    
        try {
            if (formMode === 'create') {
                // Создание нового бюджета
                const newBudget = await addBudget(MOCK_USER_ID, formData as Omit<Budget, 'id'>);
                if (newBudget) {
                    // Обновляем локальное состояние с новым бюджетом
                    setBudgets(prev => [...prev, newBudget]);
                }
            } else if (editingBudget) {
                // Редактирование существующего бюджета
                
                // *** ПРИМЕЧАНИЕ МАСТЕРА: В data-access.ts нужно добавить updateBudget, 
                // который будет выполнять UPDATE или UPSERT.
                
                // Создаем полный объект Budget для обновления, используя ID редактируемого объекта.
                const budgetToUpdate: Budget = {
                    // Распространяем поля из формы, кастуя к Budget для получения всех свойств
                    ...(formData as Budget), 
                    // Гарантируем, что ID - это ID редактируемого бюджета
                    id: editingBudget.id, 
                };

                console.warn("Редактирование бюджета требует реализации updateBudget в data-access.ts");
                // ИСПОЛЬЗУЕМ updateBudget ВМЕСТО addBudget ДЛЯ ИСПРАВЛЕНИЯ ОШИБКИ ТИПИЗАЦИИ
                await updateBudget(MOCK_USER_ID, budgetToUpdate); 
            }
            // Перезагружаем данные, чтобы увидеть изменения и обновить расчеты
            await loadData(currentMonth); 
    
        } catch (err) {
            console.error('Ошибка при сохранении бюджета:', err);
            setError('Не удалось сохранить бюджет.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // ------------------------------------------------------------------
    // 3. СМЕНА МЕСЯЦА
    // ------------------------------------------------------------------

    const changeMonth = (delta: number) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
            return newDate;
        });
    };
    
    const getMonthName = (date: Date) => {
        return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    };

    // ------------------------------------------------------------------
    // 4. РЕНДЕРИНГ
    // ------------------------------------------------------------------

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <p className="text-xl text-indigo-600">Загрузка плана бюджета...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-700 bg-red-100 rounded-lg">
                <p className="font-bold">Ошибка:</p>
                <p>{error}</p>
                <button onClick={() => loadData(currentMonth)} className="mt-2 text-indigo-600 hover:text-indigo-800">
                    Повторить попытку
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header title="Планирование Бюджета" />

            <main className="flex-grow p-4 space-y-6">
                
                {/* Навигация по месяцам */}
                <div className="flex items-center justify-center p-3 bg-white rounded-xl shadow-md">
                    <button onClick={() => changeMonth(-1)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                        {'<'}
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 mx-4 w-40 text-center">
                        {getMonthName(currentMonth)}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                        {'>'}
                    </button>
                </div>

                {/* Сводка Бюджета (Total) */}
                {/* Предполагаем, что BudgetSummary принимает текущие данные */}
                <BudgetSummary budgets={budgets} transactions={transactions} />

                {/* Бюджет по Категориям */}
                <h3 className="text-xl font-bold text-gray-800 pt-4 border-t mt-6">Бюджет по Категориям</h3>
                
                <div className="space-y-3">
                    {/* Объединяем категории с бюджетами и транзакциями для отображения */}
                    {categories.map(category => {
                        const budgetEntry = budgets.find(b => b.category === category.id);
                        const spent = transactions
                            .filter(t => t.category === category.id)
                            .reduce((sum, t) => sum + t.amount, 0);
                        
                        // Отображение Категории Бюджета
                        return (
                            <div 
                                key={category.id} 
                                className="p-4 bg-white rounded-xl shadow-sm flex justify-between items-center cursor-pointer hover:shadow-md transition"
                                onClick={() => {
                                    if (budgetEntry) {
                                        setEditingBudget(budgetEntry);
                                        setFormMode('edit');
                                    } else {
                                        // Создание нового бюджета для этой категории
                                        setEditingBudget({
                                            id: crypto.randomUUID(), // Временно, будет заменено в форме
                                            monthkey: currentMonthKey,
                                            category: category.id,
                                            limit: 0,
                                            icon: category.icon,
                                            currency: 'RUB', // Предполагаем валюту
                                        } as Budget); 
                                        setFormMode('create');
                                    }
                                    setIsModalOpen(true);
                                }}
                            >
                                <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{category.icon}</span>
                                    <span className="font-semibold text-gray-800">{category.name}</span>
                                </div>
                                <div>
                                    <p className={`text-right font-bold ${budgetEntry ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        {budgetEntry ? `Лимит: ${budgetEntry.limit.toFixed(2)} ${budgetEntry.currency}` : 'Не установлен'}
                                    </p>
                                    {budgetEntry && (
                                        <p className={`text-sm text-right ${spent > budgetEntry.limit ? 'text-red-500' : 'text-green-500'}`}>
                                            Остаток: {(budgetEntry.limit - spent).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                
            </main>

            {/* Модальное окно для создания/редактирования бюджета */}
            {isModalOpen && (
                <BudgetForm
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleFormSubmit}
                    initialData={editingBudget || { monthkey: currentMonthKey, category: '', limit: 0, icon: '', currency: 'RUB' } as Budget}
                    mode={formMode}
                    categories={categories} // Передаем список категорий для выбора
                />
            )}
        </div>
    );
};

export default BudgetPlanningScreen;