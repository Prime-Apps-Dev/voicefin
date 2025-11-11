import React, { useState, useEffect, useCallback } from 'react';
import { Account, AccountType, UserProfile } from '../types';
// Импортируем НОВЫЙ сервис для работы с JSONB данными
import { fetchUserProfile, addAccount, deleteAccount, updateAccounts } from '../services/data-access';
import { AccountList } from './AccountList'; // Предполагается, что этот компонент существует
import AccountForm from './AccountForm'; // Предполагается, что этот компонент существует
import { Header } from './Header'; // Предполагается, что этот компонент существует
import { PlusIcon } from './icons/PlusIcon'; // Предполагается, что этот компонент существует

// --- Имитация Auth Context ---
// В реальном приложении: const { user } = useAuth();
const MOCK_USER_ID = 'user-uuid-from-auth-service'; 
// --- Конец Имитации ---

// Используем заглушку для AccountFormMode, пока не обновим сам AccountForm
type AccountFormMode = 'create' | 'edit';

/**
 * ЭКРАН УПРАВЛЕНИЯ СЧЕТАМИ (AccountsScreen)
 * Загружает и обновляет счета из JSONB-поля 'data' в таблице 'profiles'.
 */
const AccountsScreen: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для модального окна формы
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [formMode, setFormMode] = useState<AccountFormMode>('create');

  // ------------------------------------------------------------------
  // 1. ЛОГИКА ЗАГРУЗКИ (ИЗ profiles.data.accounts)
  // ------------------------------------------------------------------
  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await fetchUserProfile(MOCK_USER_ID); // Загрузка из JSONB
      if (profile) {
        setUserProfile(profile);
        setAccounts(profile.data.accounts);
      } else {
        setError('Не удалось загрузить данные пользователя.');
        setAccounts([]);
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка при загрузке счетов. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // ------------------------------------------------------------------
  // 2. ЛОГИКА ОБНОВЛЕНИЯ (ЗАПИСЬ В profiles.data.accounts)
  // ------------------------------------------------------------------
  
  /**
   * Обновляет состояние счетов локально и отправляет полный массив в Supabase.
   * @param updatedAccounts Новый массив счетов.
   */
  const updateAccountsInDB = useCallback(async (updatedAccounts: Account[]) => {
    try {
      // 1. Локальное обновление
      setAccounts(updatedAccounts); 
      
      // 2. Обновление в БД через JSONB сервис
      await updateAccounts(MOCK_USER_ID, updatedAccounts);
      
    } catch (err) {
      console.error('Ошибка при сохранении счетов:', err);
      // В случае ошибки, лучше перезагрузить данные из БД, чтобы избежать расхождения
      loadAccounts(); 
    }
  }, [loadAccounts]);


  // ------------------------------------------------------------------
  // 3. ОБРАБОТЧИКИ ФОРМЫ И ДЕЙСТВИЙ
  // ------------------------------------------------------------------

  const handleCreateNewAccount = () => {
    setEditingAccount(null);
    setFormMode('create');
    setIsModalOpen(true);
  };

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account);
    setFormMode('edit');
    setIsModalOpen(true);
  };
  
  const handleFormSubmit = async (formData: Omit<Account, 'id'>) => {
    if (formMode === 'create') {
      // Создание: используем функцию addAccount, которая сама генерирует ID
      const newAccount: Account = { ...formData, id: crypto.randomUUID() };
      
      const newAccountsArray = [...accounts, newAccount];
      await updateAccountsInDB(newAccountsArray);
      
    } else if (editingAccount) {
      // Редактирование: обновляем существующий счет
      const updatedAccount: Account = { ...formData, id: editingAccount.id };
      const newAccountsArray = accounts.map(acc => 
        acc.id === editingAccount.id ? updatedAccount : acc
      );
      await updateAccountsInDB(newAccountsArray);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = async (accountId: string) => {
    // Здесь нужна ConfirmationModal, но для простоты опустим ее вызов
    const newAccountsArray = accounts.filter(acc => acc.id !== accountId);
    await updateAccountsInDB(newAccountsArray);
  };

  // ------------------------------------------------------------------
  // 4. РЕНДЕРИНГ
  // ------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-xl text-indigo-600">Загрузка счетов...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-700 bg-red-100 rounded-lg">
        <p className="font-bold">Ошибка:</p>
        <p>{error}</p>
        <button onClick={loadAccounts} className="mt-2 text-indigo-600 hover:text-indigo-800">
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Мои Счета" />

      <main className="flex-grow p-4 space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Список счетов</h2>
          <button
            onClick={handleCreateNewAccount}
            className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center justify-center"
            aria-label="Добавить новый счет"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* AccountList должен принимать полный список счетов и обработчики действий */}
        <AccountList
          accounts={accounts}
          onEdit={handleEditAccount}
          onDelete={handleDelete}
        />
        
      </main>

      {/* Модальное окно для создания/редактирования счета */}
      {isModalOpen && (
        <AccountForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingAccount || { name: '', currency: 'RUB', gradient: '#6366f1', type: AccountType.CARD }}
          mode={formMode}
        />
      )}
    </div>
  );
};

export default AccountsScreen;