import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { useLocalization } from './LocalizationContext';

// Типы данных
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isBlocked: boolean; // Заблокирован ли пользователь (например, бан)
  blockMessage: string | null;
  isDevLoggingIn: boolean; // Состояние процесса Dev-логина
  isAppExpanded: boolean;
  isAppFullscreen: boolean;
  handleDevLogin: (userId: string) => Promise<void>; // Функция для ручного логина в dev-режиме
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
  
  // Состояния UI Telegram
  const [isAppExpanded, setIsAppExpanded] = useState(false);
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      setError(null);
      
      // 1. Инициализация Telegram WebApp
      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand(); // Разворачиваем на весь экран
        
        // Устанавливаем состояния UI
        setIsAppExpanded(tg.isExpanded);
        // Проверка на полноэкранный режим (если поддерживается API)
        if (tg.isFullscreen) { 
            setIsAppFullscreen(true);
        } else {
            // Пробуем запросить фулскрин
            try { tg.requestFullscreen?.(); } catch(e) {}
        }

        // Слушаем изменения состояния
        tg.onEvent('viewportChanged', () => {
            setIsAppExpanded(tg.isExpanded);
            if(tg.isFullscreen) setIsAppFullscreen(true);
        });

        const initData = tg.initData;
        const initDataUnsafe = tg.initDataUnsafe;

        // 2. Попытка аутентификации через Telegram
        if (initData && initDataUnsafe?.user) {
          try {
            await _authenticateWithTelegram(initData);
          } catch (e: any) {
            console.error("Auth Error:", e);
            setError(`Auth Error: ${e.message || 'Unknown error'}`);
            // Если ошибка сети или сервера, мы не можем продолжить, 
            // но не сбрасываем loading, чтобы пользователь видел ошибку.
          } finally {
             setIsLoading(false);
          }
        } else {
          // Если открыто не в Telegram (или нет initData)
          if (import.meta.env.DEV) {
            console.log("Dev mode: waiting for manual login");
            setIsDevLoggingIn(true); // Показываем форму логина для разработчика
            setIsLoading(false);
          } else {
            setError(t('authError') || "Please open this app in Telegram.");
            setIsLoading(false);
          }
        }
      } else {
         // Fallback для браузера без Telegram объекта
         if (import.meta.env.DEV) {
            setIsDevLoggingIn(true);
            setIsLoading(false);
         } else {
             setError("Telegram WebApp API not found.");
             setIsLoading(false);
         }
      }
    };

    initAuth();
  }, [t]);

  // Функция вызова Edge Function для аутентификации
  const _authenticateWithTelegram = async (initData: string) => {
    try {
      console.log("Sending request to telegram-auth...");
      
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { initData },
        method: 'POST',
      });

      if (error) {
        // Это ошибка именно вызова функции (например, 500 или CORS)
        console.error("Edge Function invocation error:", error);
        throw new Error(error.message || "Failed to send a request to the Edge Function");
      }

      if (!data || !data.user) {
        throw new Error("Invalid response from auth server");
      }

      console.log("Auth successful:", data.user);
      
      // Получаем полные данные пользователя из нашей таблицы users
      // Edge function уже должна была создать пользователя, если его нет
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', data.user.id)
        .single();

      if (userError || !userData) {
          // Если вдруг не нашлось (редкий кейс, гонка)
          console.error("User not found after auth:", userError);
          throw new Error("User data synchronization failed");
      }

      setUser(userData);

    } catch (err: any) {
       // Пробрасываем ошибку выше
       throw err;
    }
  };

  // Ручной логин для разработки (Dev Mode)
  const handleDevLogin = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
       // В Dev режиме мы просто подтягиваем пользователя по ID
       const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

       if (error) throw error;
       setUser(data);
       setIsDevLoggingIn(false);
    } catch (e: any) {
       setError(e.message || "Dev login failed");
    } finally {
       setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isBlocked: false, // Заглушка
      blockMessage: null, 
      isDevLoggingIn, 
      isAppExpanded,
      isAppFullscreen,
      handleDevLogin, 
      setUser,
      error
    }}>
      {children}
    </AuthContext.Provider>
  );
};