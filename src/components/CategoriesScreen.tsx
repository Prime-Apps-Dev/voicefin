import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, Category, TransactionType } from '../types';
// Импортируем НОВЫЕ сервисы для работы с JSONB данными
import { fetchUserProfile, updateUserDataJsonB } from '../services/data-access';
import { Header } from './Header'; // Предполагается, что этот компонент существует
import { PlusIcon } from './icons/PlusIcon'; // Предполагается, что этот компонент существует
import CategoryForm from './CategoryForm'; // Предполагается, что этот компонент существует

// --- Имитация Auth Context ---
const MOCK_USER_ID = 'user-uuid-from-auth-service'; 
// --- Конец Имитации ---

type CategoryFormMode = 'create' | 'edit';

/**
 * Вспомогательный компонент для отображения отдельной категории.
 * (Для упрощения, здесь будет только базовый HTML, но в реальном приложении это будет CategoryItem)
 */
interface CategoryListItemProps {
    category: Category;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string) => void;
}

const CategoryListItem: React.FC<CategoryListItemProps> = React.memo(({ category, onEdit, onDelete }) => {
    // Определяем цвет иконки и тип
    const isExpense = category.type === TransactionType.EXPENSE;
    const typeLabel = isExpense ? 'Расход' : 'Доход';
    const typeColor = isExpense ? 'text-red-500 bg-red-100' : 'text-green-500 bg-green-100';

    return (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition duration-150">
            <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${typeColor} font-mono`}>
                    {/* Здесь должна быть иконка, но используем заглушку */}
                    {category.icon || (isExpense ? '📉' : '📈')}
                </div>
                <div>
                    <p className="font-semibold text-gray-800">{category.name}</p>
                    <p className={`text-sm ${isExpense ? 'text-red-500' : 'text-green-500'}`}>{typeLabel}</p>
                </div>
            </div>
            <div className="flex space-x-2">
                <button
                    onClick={() => onEdit(category)}
                    className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg transition"
                    aria-label={`Редактировать ${category.name}`}
                >
                    📝
                </button>
                <button
                    onClick={() => onDelete(category.id)}
                    className="text-red-600 hover:text-red-800 p-2 rounded-lg transition"
                    aria-label={`Удалить ${category.name}`}
                >
                    🗑️
                </button>
            </div>
        </div>
    );
});


/**
 * ЭКРАН УПРАВЛЕНИЯ КАТЕГОРИЯМИ (CategoriesScreen)
 * Загружает и обновляет категории из JSONB-поля 'data' в таблице 'profiles'.
 */
const CategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Состояние для модального окна формы
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formMode, setFormMode] = useState<CategoryFormMode>('create');

  // ------------------------------------------------------------------
  // 1. ЛОГИКА ЗАГРУЗКИ (ИЗ profiles.data.categories)
  // ------------------------------------------------------------------
  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await fetchUserProfile(MOCK_USER_ID); // Загрузка всего профиля
      if (profile) {
        setCategories(profile.data.categories);
      } else {
        setError('Не удалось загрузить данные пользователя.');
        setCategories([]);
      }
    } catch (err) {
      console.error(err);
      setError('Ошибка при загрузке категорий. Пожалуйста, попробуйте позже.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    // Мы можем также подписаться на real-time обновления, но это более сложная тема
  }, [loadCategories]);

  // ------------------------------------------------------------------
  // 2. ЛОГИКА ОБНОВЛЕНИЯ (ЗАПИСЬ В profiles.data.categories)
  // ------------------------------------------------------------------
  
  /**
   * Обновляет состояние категорий локально и отправляет полный массив в Supabase.
   * @param updatedCategories Новый массив категорий.
   */
  const updateCategoriesInDB = useCallback(async (updatedCategories: Category[]) => {
    try {
      // 1. Локальное обновление
      setCategories(updatedCategories); 
      
      // 2. Обновление в БД через JSONB сервис. Передаем только часть JSONB.
      await updateUserDataJsonB(MOCK_USER_ID, { categories: updatedCategories });
      
    } catch (err) {
      console.error('Ошибка при сохранении категорий:', err);
      // В случае ошибки, лучше перезагрузить данные из БД
      loadCategories(); 
    }
  }, [loadCategories]);


  // ------------------------------------------------------------------
  // 3. ОБРАБОТЧИКИ ФОРМЫ И ДЕЙСТВИЙ
  // ------------------------------------------------------------------

  const handleCreateNewCategory = () => {
    setEditingCategory(null);
    setFormMode('create');
    setIsModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormMode('edit');
    setIsModalOpen(true);
  };
  
  const handleFormSubmit = async (formData: Omit<Category, 'id' | 'isfavorite' | 'isdefault'> & { isfavorite: boolean, isdefault: boolean }) => {
    if (formMode === 'create') {
      // Создание: генерируем ID и добавляем
      const newCategory: Category = { ...formData, id: crypto.randomUUID() };
      
      const newCategoriesArray = [...categories, newCategory];
      await updateCategoriesInDB(newCategoriesArray);
      
    } else if (editingCategory) {
      // Редактирование: обновляем существующую категорию
      const updatedCategory: Category = { ...formData, id: editingCategory.id };
      const newCategoriesArray = categories.map(cat => 
        cat.id === editingCategory.id ? updatedCategory : cat
      );
      await updateCategoriesInDB(newCategoriesArray);
    }
    
    setIsModalOpen(false);
  };

  const handleDelete = async (categoryId: string) => {
    // В реальном приложении здесь должна быть проверка, используются ли транзакции
    // и модальное окно подтверждения.
    const newCategoriesArray = categories.filter(cat => cat.id !== categoryId);
    await updateCategoriesInDB(newCategoriesArray);
  };

  // ------------------------------------------------------------------
  // 4. РЕНДЕРИНГ СПИСКА
  // ------------------------------------------------------------------

  const expenseCategories = useMemo(() => categories.filter(c => c.type === TransactionType.EXPENSE), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === TransactionType.INCOME), [categories]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <p className="text-xl text-indigo-600">Загрузка категорий...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-700 bg-red-100 rounded-lg">
        <p className="font-bold">Ошибка:</p>
        <p>{error}</p>
        <button onClick={loadCategories} className="mt-2 text-indigo-600 hover:text-indigo-800">
          Повторить попытку
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header title="Мои Категории" />

      <main className="flex-grow p-4 space-y-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Управление категориями</h2>
          <button
            onClick={handleCreateNewCategory}
            className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition duration-150 ease-in-out flex items-center justify-center"
            aria-label="Добавить новую категорию"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Список Категорий Расходов */}
        <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-1">Расходы ({expenseCategories.length})</h3>
            <div className="space-y-3">
                {expenseCategories.length === 0 ? (
                    <p className="text-gray-500 text-sm">Нет категорий расходов.</p>
                ) : (
                    expenseCategories.map(cat => (
                        <CategoryListItem 
                            key={cat.id} 
                            category={cat} 
                            onEdit={handleEditCategory} 
                            onDelete={handleDelete} 
                        />
                    ))
                )}
            </div>
        </section>

        {/* Список Категорий Доходов */}
        <section className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-1">Доходы ({incomeCategories.length})</h3>
            <div className="space-y-3">
                {incomeCategories.length === 0 ? (
                    <p className="text-gray-500 text-sm">Нет категорий доходов.</p>
                ) : (
                    incomeCategories.map(cat => (
                        <CategoryListItem 
                            key={cat.id} 
                            category={cat} 
                            onEdit={handleEditCategory} 
                            onDelete={handleDelete} 
                        />
                    ))
                )}
            </div>
        </section>
        
      </main>

      {/* Модальное окно для создания/редактирования категории */}
      {isModalOpen && (
        <CategoryForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleFormSubmit}
          initialData={editingCategory || { 
            name: '', 
            icon: '', 
            isfavorite: false, 
            isdefault: false,
            type: TransactionType.EXPENSE 
          }}
          mode={formMode}
        />
      )}
    </div>
  );
};

export default CategoriesScreen;