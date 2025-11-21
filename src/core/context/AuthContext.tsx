import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';
import { useLocalization } from './LocalizationContext';

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
        else { try { tg.requestFullscreen?.(); } catch(e) {} }

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
            // Показываем ошибку, но не вечную загрузку
            setError(e.message || 'Authentication failed'); 
          } finally {
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
    // 1. Вызываем Edge Function
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { initData },
      method: 'POST',
    });

    if (error) throw new Error(error.message || "Server connection failed");
    if (!data || !data.token || !data.user) throw new Error("Invalid server response");

    // 2. Устанавливаем сессию Supabase (критично для RLS!)
    const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.token,
        refresh_token: data.token, // В нашем случае используем тот же токен
    });

    if (sessionError) {
        console.warn("Session warning:", sessionError);
        // Не блокируем, так как кастомный токен может вызвать warning, но работать
    }

    // 3. Сразу устанавливаем пользователя (он пришел с сервера!)
    // Нам не нужно делать еще один SELECT и получать ошибку синхронизации.
    console.log("Auth success. User:", data.user);
    setUser(data.user);
  };

  const handleDevLogin = async (userId: string) => {
    setIsLoading(true);
    try {
       const { data, error } = await supabase
        .from('profiles') // Исправлено на profiles
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