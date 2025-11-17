// src/context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import * as api from '../services/api';
import { User } from '../types';
import { useLocalization } from './LocalizationContext';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isBlocked: boolean;
  blockMessage: string;
  isDevLoggingIn: boolean;
  isAppExpanded: boolean;
  isAppFullscreen: boolean;
  handleDevLogin: (email: string, pass: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useLocalization();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Telegram specific states
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const [isAppExpanded, setIsAppExpanded] = useState(false);
  const [isAppFullscreen, setIsAppFullscreen] = useState(false);
  
  // Dev mode specific
  const [isDevLoggingIn, setIsDevLoggingIn] = useState(false);

  const loadUserProfile = async (authUserId: string, teleUser?: { first_name?: string }) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (profileError) {
        throw new Error(`Не удалось загрузить профиль пользователя: ${profileError.message}`);
      }

      const appUser: User = {
          id: authUserId,
          email: profileData.email,
          name: profileData.full_name || teleUser?.first_name || profileData.username || 'User',
          updated_at: profileData.updated_at,
          username: profileData.username,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          telegram_id: profileData.telegram_id,
          has_completed_onboarding: profileData.has_completed_onboarding,
          default_currency: profileData.default_currency || 'USD'
      };
      
      setUser(appUser);
      
      // Важно: Здесь мы не загружаем транзакции, это задача DataContext.
      // Мы только готовим юзера.
      
    } catch (err: any) {
      console.error("Auth: Profile loading failed:", err);
      setError(`Failed to load profile: ${err.message}`);
    }
  };

  // Функция для обновления данных юзера (например, после смены валюты)
  const refreshUserProfile = async () => {
    if (!user) return;
    await loadUserProfile(user.id);
  };

  const handleDevLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login successful but no user data returned.");
      
      await loadUserProfile(data.user.id, { first_name: 'Dev' });
      setIsDevLoggingIn(false);
    } catch (err: any) {
      console.error("Dev login failed:", err);
      setError(err.message || t('loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    // @ts-ignore
    const tg = window.Telegram.WebApp;

    const handleViewportChange = () => {
      if (tg) {
        setIsAppExpanded(tg.isExpanded);
        setIsAppFullscreen(tg.isFullscreen || false); 
      }
    };

    const initAuth = async () => {
      try {
        if (isDev) {
          console.log('DEV MODE: Checking Supabase session...');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            await loadUserProfile(session.user.id, { first_name: 'Dev' });
          } else {
            setIsDevLoggingIn(true);
          }
          setIsLoading(false); // Loading Auth is done (either logged in or showing form)

        } else {
          // PROD MODE (Telegram)
          if (!tg) throw new Error(t('telegramErrorNotTelegram'));
          if (!tg.initData) throw new Error(t('telegramErrorNoData'));
          
          tg.ready();
          tg.expand();
          if (tg.requestFullscreen) tg.requestFullscreen();

          tg.onEvent('viewportChanged', handleViewportChange);
          handleViewportChange();

          const authResponse = await api.authenticateWithTelegram(tg.initData);
          if (!authResponse || !authResponse.token || !authResponse.user) {
              throw new Error("Invalid auth response from server");
          }

          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: authResponse.token,
            refresh_token: authResponse.token,
          });

          if (sessionError) throw new Error(`Failed to set session: ${sessionError.message}`);
          
          await loadUserProfile(sessionData.user!.id, authResponse.user);
          setIsLoading(false);
        }

      } catch (err: any) {
        console.error("Initialization failed:", err);
        const errorMsg = (err instanceof Error) ? err.message : String(err);
        
        if (errorMsg === t('telegramErrorNotTelegram') || errorMsg === t('telegramErrorNoData')) {
            setBlockMessage(errorMsg);
            setIsBlocked(true);
        } else {
            setError(`Auth Error: ${errorMsg}`);
        }
        setIsLoading(false);
      }
    };

    initAuth();

    return () => {
      if (tg) tg.offEvent('viewportChanged', handleViewportChange);
    };
  }, [t]);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      error,
      isBlocked,
      blockMessage,
      isDevLoggingIn,
      isAppExpanded,
      isAppFullscreen,
      handleDevLogin,
      refreshUserProfile,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};