// services/supabase.ts
// Это главный "кабель", который соединяет ваше приложение с Supabase.
import { createClient } from '@supabase/supabase-js';

// Эти переменные вы должны будете создать сами в файле .env.local
// Я объясню, как это сделать, в чек-листе ниже.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are not set in .env.local");
}

// Создаем "клиент" — это наш основной инструмент для общения с базой
export const supabase = createClient(supabaseUrl, supabaseAnonKey);