import React, { useState, useEffect, useCallback, useMemo } from 'react';
// ИСПРАВЛЕНО: Используем только клиент Supabase, добавлено расширение
import { supabase } from './services/supabase.ts';
import { Session, User as SupabaseUser, Subscription } from '@supabase/supabase-js'; // Добавлена Subscription

// Импорт компонентов (ИСПРАВЛЕНО: Добавлены расширения .tsx)
import AccountsScreen from './components/AccountsScreen.tsx';
import CategoriesScreen from './components/CategoriesScreen.tsx';
import BudgetPlanningScreen from './components/BudgetPlanningScreen.tsx';
import SavingsScreen from './components/SavingsScreen.tsx';
import TransactionHistoryScreen from './components/TransactionHistoryScreen.tsx';
import TransactionForm from './components/TransactionForm.tsx';

// Импорт типов и сервисов (ИСПРАВЛЕНО: Добавлены расширения .ts и добавлен AccountType)
import { 
    UserProfile, 
    UserDataJsonB,
    Account, 
    Category, 
    TransactionType,
    AccountType // <-- ИСПРАВЛЕНИЕ 1: Импортируем AccountType
} from './types.ts';
import { 
    addTransaction 
} from './services/data-access.ts'; 

// --- Управление страницами ---
type Screen = 'Home' | 'History' | 'Budget' | 'Savings' | 'Settings' | 'Accounts' | 'Categories';

// Интервал обновления данных 5 минут (300 000 миллисекунд)
const POLLING_INTERVAL = 300000; 

/**
 * ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ (App)
 * Инициализирует Supabase, управляет аутентификацией и маршрутизацией.
 * Использует Polling (периодическое обновление) для синхронизации данных профиля.
 */
const App: React.FC = () => {
    // ------------------------------------------------------------------
    // 1. СОСТОЯНИЕ И КОНФИГУРАЦИЯ
    // ------------------------------------------------------------------

    const [currentScreen, setCurrentScreen] = useState<Screen>('Home');
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [appError, setAppError] = useState<string | null>(null);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

    // Локальное состояние данных профиля (profiles, включая JSONB 'data')
    const [profile, setProfile] = useState<UserProfile | null>(null);
    
    // ------------------------------------------------------------------
    // 2. ФУНКЦИЯ ЗАГРУЗКИ ПРОФИЛЯ (Polling/Ручное обновление)
    // ------------------------------------------------------------------

    const loadProfile = useCallback(async (currentUserId: string, currentUser: SupabaseUser | null) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentUserId)
                .single();

            if (error && error.code === 'PGRST116') { // Нет строки
                 // Если профиля нет, создаем его
                console.log("Профиль не найден, создаем новый.");
                const defaultProfileData: UserDataJsonB = {
                    // ИСПРАВЛЕНИЕ 1: Использование AccountType.CASH вместо TransactionType.EXPENSE
                    accounts: [{ id: 'def-acc-1', name: 'Наличные', currency: 'RUB', gradient: '#10b981', type: AccountType.CASH } as Account],
                    categories: [
                        { id: 'def-exp', name: 'Прочее', icon: '❓', type: TransactionType.EXPENSE, isfavorite: true, isdefault: true } as Category,
                        { id: 'def-inc', name: 'Прочее', icon: '📈', type: TransactionType.INCOME, isfavorite: true, isdefault: true } as Category,
                    ],
                    savingsGoals: [],
                };
                
                const defaultProfile: Omit<UserProfile, 'data'> & { data: any } = {
                    id: currentUserId,
                    name: currentUser?.user_metadata.name || "Новый Пользователь",
                    email: currentUser?.email || "",
                    telegram_id: undefined,
                    data: defaultProfileData
                };

                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert(defaultProfile);
                
                if (insertError) {
                    throw insertError;
                }
                
                // После успешной вставки, запускаем повторную загрузку, чтобы получить созданный профиль
                loadProfile(currentUserId, currentUser);

            } else if (error) {
                throw error;
            } else if (data) {
                // Устанавливаем данные, если они были получены
                 const loadedProfile: UserProfile = {
                    id: data.id,
                    name: data.name || currentUser?.user_metadata.name || "Пользователь",
                    email: data.email || currentUser?.email || "",
                    telegram_id: data.telegram_id,
                    data: data.data as UserDataJsonB 
                };
                setProfile(loadedProfile);
            }
        } catch (e) {
            console.error("Ошибка загрузки/создания профиля:", e);
            setAppError(`Ошибка загрузки/создания профиля: ${(e as Error).message}`);
        }
    }, [setProfile, setAppError]);


    // ------------------------------------------------------------------
    // 3. ИНИЦИАЛИЗАЦИЯ SUPABASE И АУТЕНТИФИКАЦИЯ
    // ------------------------------------------------------------------

    // Начальная загрузка сессии и подписка на изменения Auth
    useEffect(() => {
        let isMounted = true;
        const initializeSupabaseAuth = async () => {
            try {
                // Получаем текущую сессию
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (!isMounted) return;
                if (sessionError) throw sessionError;

                let user: SupabaseUser | null = session?.user ?? null;
                
                if (!user) {
                    // Если нет сессии, пытаемся войти анонимно
                    const { data: { user: anonUser }, error: signInError } = await supabase.auth.signInAnonymously();
                    
                    if (!isMounted) return;
                    if (signInError) throw signInError;
                    
                    user = anonUser;
                }
                
                if (user) {
                    setSupabaseUser(user);
                    setUserId(user.id);
                }
                
                setIsAuthReady(true);
            } catch (err) {
                console.error("Supabase Auth Error:", err);
                setAppError(`Ошибка аутентификации Supabase: ${(err as Error).message}`);
                setIsAuthReady(true);
            }
        };

        // Подписка на изменения Auth (ИСПРАВЛЕНИЕ 2: Корректное получение subscription объекта)
        const { data } = supabase.auth.onAuthStateChange(
            (event, session) => {
                const user = session?.user ?? null;
                setSupabaseUser(user);
                setUserId(user?.id ?? null);
            }
        );
        const authSubscription = data.subscription; // Извлекаем фактический объект подписки

        initializeSupabaseAuth();
        
        return () => {
            isMounted = false;
            if (authSubscription) {
                authSubscription.unsubscribe(); // ИСПРАВЛЕНИЕ 2: Корректная отписка
            }
        };
    }, []);
    
    // ------------------------------------------------------------------
    // 4. ЗАПУСК ЗАГРУЗКИ ПРОФИЛЯ И ПОЛЛИНГ
    // ------------------------------------------------------------------

    // 4.1. Запускаем loadProfile, как только userId становится доступным
    useEffect(() => {
        if (isAuthReady && userId && supabaseUser) {
            loadProfile(userId, supabaseUser);
        }
    }, [isAuthReady, userId, supabaseUser, loadProfile]);

    // 4.2. Настраиваем периодическое обновление (Polling)
    useEffect(() => {
        if (!userId || !supabaseUser) return;

        console.log(`Начало периодического обновления профиля каждые ${POLLING_INTERVAL / 1000} секунд.`);

        const intervalId = setInterval(() => {
            loadProfile(userId, supabaseUser);
        }, POLLING_INTERVAL);

        return () => {
            console.log("Остановка периодического обновления.");
            clearInterval(intervalId);
        };
    }, [userId, supabaseUser, loadProfile]);
    
    // ------------------------------------------------------------------
    // 5. РЕНДЕРИНГ ОСНОВНОГО UI
    // ------------------------------------------------------------------
    
    const renderScreen = () => {
        // ... (логика переключения экранов)
        switch (currentScreen) {
            case 'Home':
                return <FinancialOverview profile={profile} />; 
            case 'History':
                return <TransactionHistoryScreen />;
            case 'Budget':
                return <BudgetPlanningScreen />;
            case 'Savings':
                return <SavingsScreen />;
            case 'Accounts':
                return <AccountsScreen />;
            case 'Categories':
                return <CategoriesScreen />;
            case 'Settings':
                return <ProfileScreen userId={userId} />;
            default:
                return <FinancialOverview profile={profile} />;
        }
    };

    if (appError) {
        return (
            <div className="flex justify-center items-center h-screen bg-red-100 text-red-800 p-8">
                <p className="font-bold">Критическая ошибка:</p>
                <p>{appError}</p>
            </div>
        );
    }

    if (!isAuthReady || !profile) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <p className="text-xl text-indigo-600 animate-pulse">Загрузка приложения и данных пользователя (Supabase)...</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-gray-50 font-inter">
            {/* Основное содержимое экрана */}
            <div className="pb-20"> {/* Добавляем отступ для навигационной панели */}
                {renderScreen()}
            </div>
            
            {/* Навигационная панель */}
            <BottomNavBar 
                currentScreen={currentScreen} 
                onScreenChange={setCurrentScreen} 
            />
            
            {/* Кнопка добавления транзакции (всегда поверх) */}
            <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 z-40">
                <RecordButton onClick={() => setIsTransactionModalOpen(true)} />
            </div>

            {/* Модальное окно транзакции (для создания) */}
            {isTransactionModalOpen && (
                <TransactionForm
                    isOpen={isTransactionModalOpen}
                    onClose={() => setIsTransactionModalOpen(false)}
                    onSubmit={async (data) => {
                        const result = await addTransaction(userId || '', data); 
                        if(result) {
                            console.log("Транзакция успешно добавлена:", result);
                            // ИСПРАВЛЕНО: После добавления транзакции принудительно перезагружаем профиль, 
                            // чтобы обновить баланс счета (который находится в профиле)
                            await loadProfile(userId || '', supabaseUser); 
                        }
                    }}
                    initialData={{ type: TransactionType.EXPENSE }}
                    mode="create"
                />
            )}
        </div>
    );
};

// --- Заглушки, используемые в App.tsx ---

interface ProfileScreenProps { userId: string | null; }
const ProfileScreen: React.FC<ProfileScreenProps> = ({ userId }) => (
    <div className="p-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-6">Профиль пользователя</h1>
        <p className="text-sm text-gray-600">ID Пользователя: {userId || 'Недоступен'}</p>
        <p className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg text-sm">
            Этот экран требует доработки, но используется для проверки маршрутизации.
        </p>
    </div>
);

interface HeaderProps { title: string; }
export const Header: React.FC<HeaderProps> = ({ title }) => (
    <header className="sticky top-0 bg-white shadow-md z-10 p-4 border-b">
        <h1 className="text-2xl font-bold text-gray-800 text-center">{title}</h1>
    </header>
);

interface FinancialOverviewProps { profile: UserProfile | null; }
export const FinancialOverview: React.FC<FinancialOverviewProps> = ({ profile }) => (
    <div className="p-4">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-6">Главный экран</h1>
        <div className="p-5 bg-white rounded-xl shadow-lg border-l-4 border-indigo-500">
            <p className="text-lg font-semibold mb-2">Добро пожаловать, {profile?.name || 'Гость'}!</p>
            <p className="text-sm text-gray-600">
                Счета в JSONB: {profile?.data.accounts.length || 0} шт. <br/>
                Категорий в JSONB: {profile?.data.categories.length || 0} шт.
            </p>
            <p className="mt-4 text-green-600 font-bold">Система готова к работе с Supabase!</p>
        </div>
    </div>
);

interface RecordButtonProps { onClick: () => void; }
export const RecordButton: React.FC<RecordButtonProps> = ({ onClick }) => (
    <button 
        onClick={onClick}
        className="w-16 h-16 bg-pink-500 rounded-full shadow-2xl text-white flex items-center justify-center text-4xl transform hover:scale-105 transition duration-200 border-4 border-white"
        aria-label="Добавить новую транзакцию"
    >
        +
    </button>
);

interface BottomNavBarProps { currentScreen: Screen; onScreenChange: (screen: Screen) => void; }
export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentScreen, onScreenChange }) => {
    const navItems: { screen: Screen, label: string, icon: string }[] = [
        { screen: 'Home', label: 'Обзор', icon: '🏠' },
        { screen: 'History', label: 'История', icon: '🗓️' },
        { screen: 'Budget', label: 'Бюджет', icon: '📊' },
        { screen: 'Savings', label: 'Копилки', icon: '🐷' },
        { screen: 'Settings', label: 'Профиль', icon: '👤' }, // Изменено на 'Профиль' для Settings
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-30 flex justify-around p-2">
            {navItems.map(item => (
                <button
                    key={item.screen}
                    onClick={() => onScreenChange(item.screen)}
                    className={`flex flex-col items-center p-2 text-xs font-medium transition-colors ${
                        currentScreen === item.screen ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-400'
                    }`}
                >
                    <span className="text-xl mb-1">{item.icon}</span>
                    {item.label}
                </button>
            ))}
        </nav>
    );
};

export default App;