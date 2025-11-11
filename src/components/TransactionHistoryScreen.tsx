import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Transaction, 
    TransactionType, 
    Account, 
    Category, 
    SavingsGoal,
    UserProfile
} from '../types';
import { 
    fetchUserProfile, 
    fetchTransactionsByPeriod,
    addTransaction // Используется для имитации Submit из формы
} from '../services/data-access';
import { Header } from './Header'; // Предполагается, что существует
import FilterModal from './FilterModal'; // Предполагается, что существует
import TransactionForm from './TransactionForm'; // Предполагается, что существует

// --- Имитация Auth Context ---
const MOCK_USER_ID = 'user-uuid-from-auth-service'; 
// --- Конец Имитации ---

/**
 * Расширенный интерфейс для отображения транзакции с присоединенными метаданными.
 */
interface DisplayTransaction extends Transaction {
    accountName: string;
    accountColor: string;
    categoryIcon: string;
    categoryName: string;
    goalName?: string;
}

// ------------------------------------------------------------------
// Вспомогательный компонент: Отображение одной транзакции
// ------------------------------------------------------------------

interface TransactionItemProps {
    transaction: DisplayTransaction;
    onEdit: (tx: Transaction) => void;
    // onDelete: (txId: string) => void; // Можно добавить удаление
}

const TransactionItem: React.FC<TransactionItemProps> = React.memo(({ transaction, onEdit }) => {
    const isExpense = transaction.type === TransactionType.EXPENSE;
    const amountColor = isExpense ? 'text-red-600' : 'text-green-600';
    const sign = isExpense ? '-' : '+';
    
    return (
        <div 
            className="flex justify-between items-center p-4 bg-white rounded-xl shadow-sm border-l-4" 
            style={{ borderLeftColor: transaction.accountColor }}
            onClick={() => onEdit(transaction)}
        >
            <div className="flex items-center space-x-3">
                <span className="text-xl">{transaction.categoryIcon}</span>
                <div>
                    <p className="font-semibold text-gray-800">{transaction.name}</p>
                    <p className="text-sm text-gray-500">
                        {transaction.accountName} • {transaction.categoryName}
                    </p>
                </div>
            </div>
            <div className="text-right">
                <p className={`font-bold ${amountColor}`}>
                    {sign}{transaction.amount.toFixed(2)} {transaction.currency}
                </p>
                <p className="text-xs text-gray-400">{transaction.date}</p>
            </div>
        </div>
    );
});


// ------------------------------------------------------------------
// ГЛАВНЫЙ КОМПОНЕНТ: ИСТОРИЯ ТРАНЗАКЦИЙ
// ------------------------------------------------------------------

/**
 * ЭКРАН ИСТОРИИ ТРАНЗАКЦИЙ (TransactionHistoryScreen)
 * Загружает транзакции из реляционной таблицы и метаданные из JSONB.
 */
const TransactionHistoryScreen: React.FC = () => {
    // Данные
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    
    // Состояние UI
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);

    // Фильтры (упрощенный пример - за последние 30 дней)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Редактирование
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // ------------------------------------------------------------------
    // 1. ЛОГИКА ЗАГРУЗКИ (МЕТАДАННЫЕ + ТРАНЗАКЦИИ)
    // ------------------------------------------------------------------

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // 1. Загрузка метаданных (JSONB)
            const profile = await fetchUserProfile(MOCK_USER_ID);
            if (!profile) {
                setError('Не удалось загрузить профиль пользователя.');
                return;
            }
            setUserProfile(profile);

            // 2. Загрузка транзакций (Реляционная таблица)
            const txData = await fetchTransactionsByPeriod(MOCK_USER_ID, startDate, endDate);
            setTransactions(txData);

        } catch (err) {
            console.error('Ошибка при загрузке данных:', err);
            setError('Ошибка при загрузке истории транзакций. Пожалуйста, попробуйте позже.');
        } finally {
            setIsLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    // ------------------------------------------------------------------
    // 2. ОБЪЕДИНЕНИЕ ДАННЫХ (Map)
    // ------------------------------------------------------------------
    
    const displayTransactions = useMemo((): DisplayTransaction[] => {
        if (!userProfile || transactions.length === 0) return [];
        
        const accountsMap = new Map<string, Account>();
        userProfile.data.accounts.forEach(acc => accountsMap.set(acc.id, acc));

        const categoriesMap = new Map<string, Category>();
        userProfile.data.categories.forEach(cat => categoriesMap.set(cat.id, cat));
        
        const goalsMap = new Map<string, SavingsGoal>();
        userProfile.data.savingsGoals.forEach(goal => goalsMap.set(goal.id, goal));

        return transactions.map(tx => {
            const account = accountsMap.get(tx.accountid);
            const category = categoriesMap.get(tx.category);
            const goal = tx.goalid ? goalsMap.get(tx.goalid) : undefined;
            
            // Если метаданные не найдены, используем заглушки
            return {
                ...tx,
                accountName: account?.name || 'Неизвестный счет',
                accountColor: account?.gradient || '#e5e7eb', // Серый по умолчанию
                categoryIcon: category?.icon || '❓',
                categoryName: category?.name || 'Неизвестная категория',
                goalName: goal?.name,
            } as DisplayTransaction;
        });

    }, [transactions, userProfile]);

    // ------------------------------------------------------------------
    // 3. ОБРАБОТЧИКИ ДЕЙСТВИЙ И ФИЛЬТРОВ
    // ------------------------------------------------------------------

    const handleEditTransaction = (tx: Transaction) => {
        setEditingTransaction(tx);
        setIsFormModalOpen(true);
    };

    const handleTransactionFormSubmit = async (transactionData: Omit<Transaction, 'id'>) => {
        // Здесь должна быть логика updateTransaction, но для создания используем addTransaction
        if (editingTransaction) {
            console.warn("Update logic for transaction is not yet implemented in data-access.ts");
            // Временно: используем update, который должен быть реализован в data-access.ts
            // await updateTransaction(MOCK_USER_ID, { ...transactionData, id: editingTransaction.id });
        } else {
            await addTransaction(MOCK_USER_ID, transactionData);
        }
        
        setIsFormModalOpen(false);
        setEditingTransaction(null);
        loadData(); // Перезагружаем данные после изменения/добавления
    };

    const handleApplyFilters = (newFilters: { startDate: string, endDate: string }) => {
        setStartDate(newFilters.startDate);
        setEndDate(newFilters.endDate);
        setIsFilterModalOpen(false);
        // loadData будет вызван через useEffect, когда изменятся startDate/endDate
    };


    // ------------------------------------------------------------------
    // 4. РЕНДЕРИНГ
    // ------------------------------------------------------------------

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <p className="text-xl text-indigo-600">Загрузка истории транзакций...</p>
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
            <Header title="История Транзакций" />

            <main className="flex-grow p-4 space-y-6">
                
                {/* Панель фильтров */}
                <div className="flex justify-between items-center p-3 bg-white rounded-xl shadow-md">
                    <p className="text-sm text-gray-600">
                        Период: с {startDate} по {endDate}
                    </p>
                    <button 
                        onClick={() => setIsFilterModalOpen(true)}
                        className="py-1 px-3 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 transition"
                    >
                        Фильтр
                    </button>
                </div>

                {/* Список транзакций */}
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">
                    Транзакции ({displayTransactions.length})
                </h2>

                <div className="space-y-3">
                    {displayTransactions.length === 0 ? (
                        <div className="text-center p-8 bg-white rounded-xl shadow-md text-gray-500">
                            <p>Транзакций за выбранный период не найдено.</p>
                        </div>
                    ) : (
                        displayTransactions.map(tx => (
                            <TransactionItem 
                                key={tx.id} 
                                transaction={tx}
                                onEdit={handleEditTransaction}
                            />
                        ))
                    )}
                </div>
                
            </main>

            {/* Модальное окно фильтров */}
            {isFilterModalOpen && (
                <FilterModal
                    isOpen={isFilterModalOpen}
                    onClose={() => setIsFilterModalOpen(false)}
                    onApply={handleApplyFilters}
                    initialStartDate={startDate}
                    initialEndDate={endDate}
                />
            )}
            
            {/* Модальное окно формы транзакции (для редактирования) */}
            {isFormModalOpen && (
                <TransactionForm
                    isOpen={isFormModalOpen}
                    onClose={() => {
                        setIsFormModalOpen(false);
                        setEditingTransaction(null);
                    }}
                    onSubmit={handleTransactionFormSubmit}
                    initialData={editingTransaction || { type: TransactionType.EXPENSE }}
                    mode={editingTransaction ? 'edit' : 'create'}
                />
            )}
        </div>
    );
};

export default TransactionHistoryScreen;