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
  logout: () => void; // Добавили функцию логаута для сброса ошибок
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isBlocked: false,
  blockMessage: null,
  isDevLoggingIn: false,
  isAppExpanded: false,
  isAppFullscreen: false,
  handleDevLogin: async () => { },
  setUser: () => { },
  error: null,
  logout: () => { },
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

  // Функция сброса
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.clear(); // Очистка кэша
    window.location.reload();
  };

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      setError(null);

      const tg = (window as any).Telegram?.WebApp;
      if (tg) {
        tg.ready();
        tg.expand();
        // @ts-ignore
        if (tg.requestFullscreen) tg.requestFullscreen();
        setIsAppExpanded(tg.isExpanded);
        if (tg.isFullscreen) setIsAppFullscreen(true);

        tg.onEvent('viewportChanged', () => {
          setIsAppExpanded(tg.isExpanded);
          if (tg.isFullscreen) setIsAppFullscreen(true);
        });

        const initData = tg.initData;
        if (initData) {
          try {
            await _authenticateWithTelegram(initData);
          } catch (e: any) {
            console.error("Auth Error:", e);
            setError(e.message || 'Auth failed');
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
        setError("Please open in Telegram");
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const _authenticateWithTelegram = async (initData: string) => {
    // Вызываем функцию. Она теперь вернет готовый профиль.
    const { data, error } = await supabase.functions.invoke('telegram-auth', {
      body: { initData },
      method: 'POST',
    });

    if (error) throw new Error(error.message || "Connection error");
    if (!data || !data.token || !data.user) throw new Error("Invalid server response");

    // Устанавливаем сессию
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.token,
      refresh_token: data.token,
    });

    if (sessionError) console.warn("Session warning:", sessionError);

    setUser(data.user);
  };

  const handleDevLogin = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
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
      isAppExpanded, isAppFullscreen, handleDevLogin, setUser, error, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};