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
  handleDevLogin: (email: string, password?: string) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  error: string | null;
  logout: () => void; // Добавили функцию логаута для сброса ошибок
  refreshUserProfile: () => Promise<void>;
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
  refreshUserProfile: async () => { },
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

    // Map profile to User interface
    const profile = data.user;
    const userWithDetails: User = {
      ...profile,
      name: profile.full_name || profile.username || 'User',
      email: profile.email,
      has_completed_onboarding: profile.has_completed_onboarding ?? false // Explicit default
    };

    setUser(userWithDetails);
  };

  const handleDevLogin = async (email: string, password?: string) => {
    console.log("AuthContext: handleDevLogin started", email);
    // Log config (masked)
    const sbUrl = import.meta.env.VITE_SUPABASE_URL;
    console.log("AuthContext: Supabase URL:", sbUrl ? sbUrl.substring(0, 15) + '...' : 'MISSING');

    setIsLoading(true);
    try {
      // Timeout wrapper
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login timed out after 10s')), 10000)
      );

      const loginPromise = (async () => {
        let profileData = null;
        let emailFromAuth: string | undefined;

        // 1. Если есть пароль, пробуем реальную авторизацию (чтобы работал RLS)
        if (password) {
          console.log("AuthContext: Attempting real auth...");
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          console.log("AuthContext: Auth result:", authData, authError);

          if (!authError && authData.user) {
            emailFromAuth = authData.user.email;
            // Авторизация успешна, получаем профиль
            console.log("AuthContext: Fetching profile for", authData.user.id);
            const { data, error } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single();
            console.log("AuthContext: Profile result:", data, error);

            if (!error && data) {
              console.log("AuthContext: Profile found in DB");
              profileData = data;
            } else if (error && error.code === 'PGRST116') {
              // Profile missing, but auth success. Create mock profile to proceed.
              console.warn("AuthContext: Profile missing for authenticated user. Creating mock profile.");
              profileData = {
                id: authData.user.id,
                email: authData.user.email,
                username: email.split('@')[0],
                full_name: 'New User',
                has_completed_onboarding: false,
                default_currency: 'USD',
                avatar_url: null,
                telegram_id: null,
                updated_at: new Date().toISOString()
              };
            }
          } else {
            console.warn("Dev Login: Real auth failed, falling back to mock profile lookup.", authError);
          }
        }

        console.log("AuthContext: Password check done. profileData:", profileData);

        // 2. Если реальная авторизация не удалась или пароля нет, ищем профиль по email (Mock Mode)
        if (!profileData) {
          console.log("AuthContext: Falling back to email lookup...");
          const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
          if (data && !error) {
            profileData = data;
          } else {
            // Если по email не нашли, пробуем как ID
            const { data: dataById, error: errorById } = await supabase.from('profiles').select('*').eq('id', email).single();
            if (dataById && !errorById) {
              profileData = dataById;
            }
          }
        }

        if (!profileData) {
          console.error("AuthContext: User not found after all checks");
          throw new Error('User not found');
        }

        console.log("AuthContext: Constructing user object manually");
        const userWithDetails: User = {
          id: profileData.id,
          email: profileData.email || emailFromAuth, // Ensure email is present
          name: profileData.full_name || profileData.username || 'User',
          username: profileData.username,
          full_name: profileData.full_name,
          avatar_url: profileData.avatar_url,
          telegram_id: profileData.telegram_id ? Number(profileData.telegram_id) : null, // Ensure number
          has_completed_onboarding: profileData.has_completed_onboarding,
          default_currency: profileData.default_currency || 'USD',
          updated_at: profileData.updated_at
        };

        console.log("AuthContext: Returning user object", userWithDetails);
        return userWithDetails;
      })();

      const userWithDetails = await Promise.race([loginPromise, timeoutPromise]) as User;

      console.log("AuthContext: Setting user and closing dev login");
      setUser(userWithDetails);
      setIsDevLoggingIn(false);
    } catch (e: any) {
      console.error("AuthContext: Login error", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        const updatedUser: User = {
          ...user,
          ...data,
          name: data.full_name || data.username || 'User',
          telegram_id: data.telegram_id ? Number(data.telegram_id) : null,
          has_completed_onboarding: data.has_completed_onboarding ?? false,
          default_currency: data.default_currency || 'USD',
        };
        setUser(updatedUser);
      }
    } catch (e) {
      console.error("Failed to refresh user profile:", e);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, isLoading, isBlocked: false, blockMessage: null, isDevLoggingIn,
      isAppExpanded, isAppFullscreen, handleDevLogin, setUser, error, logout,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};