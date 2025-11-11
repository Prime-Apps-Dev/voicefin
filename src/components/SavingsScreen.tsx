import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, SavingsGoal, Account, Transaction } from '../types';
import { 
    fetchUserProfile, 
    updateUserDataJsonB, 
    fetchTransactionsByPeriod 
} from '../services/data-access';
import { Header } from './Header'; // Предполагается, что существует
import { PlusIcon } from './icons/PlusIcon'; // Предполагается, что существует
import { PiggyBankIcon } from './icons/PiggyBankIcon'; // Предполагается, что существует
import SavingsGoalForm from './SavingsGoalForm'; // Предполагается, что существует
import { GoalTransactionsModal } from './GoalTransactionsModal'; // Предполагается, что существует

// --- Имитация Auth Context ---
const MOCK_USER_ID = 'user-uuid-from-auth-service'; 
// --- Конец Имитации ---

type GoalFormMode = 'create' | 'edit';

/**
 * Вспомогательный компонент для отображения отдельной цели сбережений.
 */
interface GoalCardProps {
    goal: SavingsGoal;
    transactions: Transaction[];
    onEdit: (goal: SavingsGoal) => void;
    onDelete: (goalId: string) => void;
    onViewTransactions: (goal: SavingsGoal) => void;
}

const GoalCard: React.FC<GoalCardProps> = React.memo(({ goal, transactions, onEdit, onDelete, onViewTransactions }) => {
    const progress = useMemo(() => {
        return (goal.currentamount / goal.targetamount) * 100;
    }, [goal.currentamount, goal.targetamount]);
    
    const remaining = goal.targetamount - goal.currentamount;
    const progressColor = progress >= 100 ? 'bg-green-500' : 'bg-indigo-500';

    return (
        <div className="p-5 bg-white rounded-xl shadow-lg border-l-4 border-indigo-500 space-y-3">
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl">{goal.icon || '🎯'}</span>
                    <h3 className="font-bold text-xl text-gray-800">{goal.name}</h3>
                </div>
                <div className="flex space-x-2">
                    <button onClick={() => onEdit(goal)} className="text-indigo-600 hover:text-indigo-800 transition">📝</button>
                    <button onClick={() => onDelete(goal.id)} className="text-red-600 hover:text-red-800 transition">🗑️</button>
                </div>
            </div>

            <div className="text-gray-600">
                <p>Цель: <span className="font-semibold">{goal.targetamount.toFixed(2)} {goal.currency}</span></p>
                <p>Накоплено: <span className="font-semibold text-indigo-600">{goal.currentamount.toFixed(2)} {goal.currency}</span></p>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full ${progressColor} transition-all duration-500`}
                    style={{ width: `${Math.min(100, progress)}%` }}
                ></div>
            </div>

            <div className="flex justify-between text-sm text-gray-500">
                <span>{progress.toFixed(1)}% выполнено</span>
                <span className={remaining <= 0 ? 'text-green-600 font-semibold' : ''}>
                    {remaining > 0 ? `Осталось: ${remaining.toFixed(2)}` : 'Цель достигнута!'}
                </span>
            </div>
            
            <button 
                onClick={() => onViewTransactions(goal)}
                className="mt-3 w-full py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition text-sm font-medium"
            >
                Посмотреть транзакции
            </button>
        </div>
    );
});


/**
 * ЭКРАН ЦЕЛЕЙ СБЕРЕЖЕНИЙ (SavingsScreen)
 * Загружает и обновляет цели из JSONB-поля 'data' в таблице 'profiles'.
 */
const SavingsScreen: React.FC = () => {
    // Данные
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    // Транзакции нужны для показа истории по цели (goalid)
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); 
    
    // Состояние UI
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Модальные окна
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
    
    // Редактирование и просмотр
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
    const [viewingGoal, setViewingGoal] = useState<SavingsGoal | null>(null);
    const [formMode, setFormMode] = useState<GoalFormMode>('create');

    // ------------------------------------------------------------------
    // 1. ЛОГИКА ЗАГРУЗКИ (Profiles.data.savingsGoals и Transactions)
    // ------------------------------------------------------------------
    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        
        // Диапазон дат для загрузки транзакций (например, за год или все)
        // Для простоты здесь загрузим все транзакции, связанные с целями,
        // но в реальном приложении лучше загружать за разумный период.
        const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];

        try {
            // 1. Загрузка целей сбережений из JSONB (Profiles)
            const profile = await fetchUserProfile(MOCK_USER_ID); 
            if (profile) {
                setGoals(profile.data.savingsGoals);
            } else {
                setError('Не удалось загрузить цели сбережений.');
                setGoals([]);
                return;
            }

            // 2. Загрузка транзакций из реляционной таблицы 'transactions'
            const txData = await fetchTransactionsByPeriod(MOCK_USER_ID, oneYearAgo, today);
            // Фильтруем только те, которые привязаны к цели (goalid не пустой)
            setAllTransactions(txData.filter(t => t.goalid));

        } catch (err) {
            console.error('Ошибка при загрузке данных сбережений:', err);
            setError('Ошибка при загрузке данных. Пожалуйста, попробуйте позже.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ------------------------------------------------------------------
    // 2. ЛОГИКА ОБНОВЛЕНИЯ (ЗАПИСЬ В profiles.data.savingsGoals)
    // ------------------------------------------------------------------
    
    /**
     * Обновляет состояние целей локально и отправляет полный массив в Supabase.
     */
    const updateGoalsInDB = useCallback(async (updatedGoals: SavingsGoal[]) => {
        try {
            // 1. Локальное обновление
            setGoals(updatedGoals); 
            
            // 2. Обновление в БД через JSONB сервис. Передаем только часть JSONB.
            await updateUserDataJsonB(MOCK_USER_ID, { savingsGoals: updatedGoals });
            
        } catch (err) {
            console.error('Ошибка при сохранении целей:', err);
            // В случае ошибки, лучше перезагрузить данные из БД
            loadData(); 
        }
    }, [loadData]);

    // ------------------------------------------------------------------
    // 3. ОБРАБОТЧИКИ ДЕЙСТВИЙ
    // ------------------------------------------------------------------

    const handleCreateNewGoal = () => {
        setEditingGoal(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };

    const handleEditGoal = (goal: SavingsGoal) => {
        setEditingGoal(goal);
        setFormMode('edit');
        setIsFormModalOpen(true);
    };

    const handleFormSubmit = async (formData: Omit<SavingsGoal, 'id' | 'currentamount'> & { currentamount: number }) => {
        if (formMode === 'create') {
            // Создание: генерируем ID и добавляем
            const newGoal: SavingsGoal = { ...formData, id: crypto.randomUUID() };
            const newGoalsArray = [...goals, newGoal];
            await updateGoalsInDB(newGoalsArray);
            
        } else if (editingGoal) {
            // Редактирование: обновляем существующую цель
            const updatedGoal: SavingsGoal = { 
                ...formData, 
                id: editingGoal.id,
                // Сохраняем currentamount, так как он может быть изменен только транзакциями
                currentamount: editingGoal.currentamount 
            }; 
            const newGoalsArray = goals.map(g => 
                g.id === editingGoal.id ? updatedGoal : g
            );
            await updateGoalsInDB(newGoalsArray);
        }
        
        setIsFormModalOpen(false);
    };

    const handleDeleteGoal = async (goalId: string) => {
        // В реальном приложении здесь должно быть подтверждение
        const newGoalsArray = goals.filter(g => g.id !== goalId);
        await updateGoalsInDB(newGoalsArray);
        
        // После удаления цели, транзакции, связанные с ней (goalid), останутся 
        // в таблице transactions, но будут игнорироваться в этом экране.
    };

    const handleViewTransactions = (goal: SavingsGoal) => {
        setViewingGoal(goal);
        setIsTransactionsModalOpen(true);
    };
    
    // Фильтруем транзакции, относящиеся к просматриваемой цели
    const goalTransactions = useMemo(() => {
        if (!viewingGoal) return [];
        return allTransactions
            .filter(t => t.goalid === viewingGoal.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, viewingGoal]);


    // ------------------------------------------------------------------
    // 4. РЕНДЕРИНГ
    // ------------------------------------------------------------------

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <p className="text-xl text-indigo-600">Загрузка целей сбережений...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-red-700 bg-red-100 rounded-lg">
                <p className="font-bold">Ошибка:</p>
                <p>{error}</p>
                <button onClick={loadData} className="mt-2 text-indigo-600 hover:text-indigo-800">
                    Повторить попытку
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header title="Мои Копилки и Цели" />

            <main className="flex-grow p-4 space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Активные цели ({goals.length})</h2>
                    <button
                        onClick={handleCreateNewGoal}
                        className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center justify-center"
                        aria-label="Добавить новую цель"
                    >
                        <PlusIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    {goals.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-xl shadow-md">
                            <PiggyBankIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-500">У вас пока нет активных целей сбережений.</p>
                            <button onClick={handleCreateNewGoal} className="mt-4 text-indigo-600 font-medium hover:text-indigo-800">
                                Создать первую цель
                            </button>
                        </div>
                    ) : (
                        goals.map(goal => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                transactions={allTransactions}
                                onEdit={handleEditGoal}
                                onDelete={handleDeleteGoal}
                                onViewTransactions={handleViewTransactions}
                            />
                        ))
                    )}
                </div>
                
            </main>

            {/* Модальное окно для создания/редактирования цели */}
            {isFormModalOpen && (
                <SavingsGoalForm
                    isOpen={isFormModalOpen}
                    onClose={() => setIsFormModalOpen(false)}
                    onSubmit={handleFormSubmit}
                    initialData={editingGoal || { 
                        name: '', 
                        targetamount: 0, 
                        currentamount: 0, 
                        icon: '🎯', 
                        currency: 'RUB' 
                    } as SavingsGoal}
                    mode={formMode}
                />
            )}
            
            {/* Модальное окно для просмотра транзакций по цели */}
            {isTransactionsModalOpen && viewingGoal && (
                <GoalTransactionsModal
                    isOpen={isTransactionsModalOpen}
                    onClose={() => {
                        setIsTransactionsModalOpen(false);
                        setViewingGoal(null);
                    }}
                    goal={viewingGoal}
                    transactions={goalTransactions}
                />
            )}
        </div>
    );
};

export default SavingsScreen;