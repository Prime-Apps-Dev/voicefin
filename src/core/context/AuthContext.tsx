import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { useLocalization } from './LocalizationContext';

// Типы данных
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isBlocked: boolean;
  blockMessage: string | null;
  isDevLoggingIn: boolean;
  isAppExpanded: boolean;
  isAppFullscreen: boolean;
  handleDevLogin: (userId: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isBlocked: false,
  blockMessage: null,
  isDevLoggingIn: false,
  isAppExpanded: false,
  isAppFullscreen: false,
  handleDevLogin: async () => {},
  setUser: () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLocalization();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAppExpanded, setIsAppExpanded] = useState(false);
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      setError(null);
      
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        setIsAppExpanded(tg.isExpanded);
        if (tg.isFullscreen) setIsAppFullscreen(true);
        
        tg.onEvent('viewportChanged', () => {
            setIsAppExpanded(tg.isExpanded);
            if(tg.isFullscreen) setIsAppFullscreen(true);
        });

        const initData = tg.initData;
        
        if (initData) {
          try {
            await _authenticateWithTelegram(initData);
          } catch (e: any) {
            console.error("Auth Error:", e);
            setError(e.message || 'Auth failed');
          } finally {
            // ВАЖНО: Всегда снимаем флаг загрузки, иначе будет вечный экран
             setIsLoading(false);
          }
        } else {
          handleDevOrError();
        }
      } else {
         handleDevOrError();
      }
    };

    const handleDevOrError = () => {
        if (import.meta.env.DEV) {
            console.log("Dev Mode detected");
            setIsDevLoggingIn(true);
            setIsLoading(false);
        } else {
            setError("Telegram API not found");
            setIsLoading(false);
        }
    };

    initAuth();
  }, []);

  const _authenticateWithTelegram = async (initData: string) => {
    console.log("Sending auth request...");
    
    // 1. Вызываем функцию. Она теперь вернет готовый профиль и токен.
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { initData },
      method: 'POST',
    });

    if (error) throw new Error(error.message || "Connection error");
    if (!data || !data.token || !data.user) throw new Error("Invalid server response");

    // 2. Устанавливаем сессию (для доступа к RLS в будущем)
    const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.token,
        refresh_token: data.token,
    });

    if (sessionError) console.warn("Session warning:", sessionError);

    // 3. Сохраняем пользователя в стейт.
    // Больше никаких запросов к БД отсюда делать НЕ НАДО.
    console.log("User authenticated:", data.user);
    setUser(data.user);
  };

  const handleDevLogin = async (userId: string) => {
    setIsLoading(true);
    try {
       // В Dev режиме запрашиваем profiles, а не users
       const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

       if (error) throw error;
       setUser(data);
       setIsDevLoggingIn(false);
    } catch (e: any) {
       setError(e.message);
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, isLoading, isBlocked: false, blockMessage: null, isDevLoggingIn, 
      isAppExpanded, isAppFullscreen, handleDevLogin, setUser, error
    }}>
      {children}
    </AuthContext.Provider>
  );
};