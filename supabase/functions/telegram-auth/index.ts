// supabase/functions/telegram-auth/index.ts
// Эта функция ПРОВЕРЯЕТ данные от Telegram, НАХОДИТ пользователя в БД
// и ВЫДАЕТ JWT-токен, используя его СУЩЕСТВУЮЩИЙ UUID.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";

// Вспомогательная функция для валидации (остается без изменений)
async function validateTelegramAuth(initData: string, botToken: string): Promise<{ isValid: boolean; user?: any }> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const user = params.get('user');
  
  if (!hash || !user) {
    return { isValid: false };
  }

  // 1. Удаляем hash из параметров
  params.delete('hash');

  // 2. Сортируем оставшиеся ключи
  const keys: string[] = [];
  params.forEach((_value, key) => keys.push(key));
  keys.sort();

  // 3. Создаем строку data-check-string
  const dataCheckString = keys.map(key => `${key}=${params.get(key)}`).join('\n');

  // 4. Генерируем секретный ключ
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const secret = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));

  // 5. Генерируем хэш
  const signatureKey = await crypto.subtle.importKey(
    'raw',
    secret,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', signatureKey, new TextEncoder().encode(dataCheckString));

  // 6. Конвертируем хэш в hex-строку
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 7. Сравниваем!
  if (hex === hash) {
    return { isValid: true, user: JSON.parse(user) };
  }

  return { isValid: false };
}

// Главный обработчик
serve(async (req) => {
  // Обработка CORS pre-flight запроса
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    const { initData } = await req.json();
    
    // Получаем переменные окружения
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const JWT_SECRET = Deno.env.get("JWT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!BOT_TOKEN || !JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing one or more required environment variables");
    }

    // 1. Валидация данных Telegram
    const { isValid, user } = await validateTelegramAuth(initData, BOT_TOKEN);

    if (!isValid || !user) {
      return new Response(JSON.stringify({ error: "Invalid Telegram data" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. Инициализация Admin-клиента Supabase
    // (Используем SERVICE_ROLE_KEY, так как RLS может блокировать чтение profiles)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const telegramUserId = user.id.toString();

    // 3. Поиск пользователя в БД
    // Ищем в таблице `profiles` запись с matching `telegram_id`.
    // Мы предполагаем, что колонка `id` в `profiles` - это UUID пользователя из `auth.users`.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles') // ⚠️ Убедитесь, что ваша таблица называется 'profiles'
      .select('id')     // ⚠️ Убедитесь, что колонка с UUID пользователя называется 'id'
      .eq('telegram_id', telegramUserId) // ⚠️ Убедитесь, что колонка для TG ID называется 'telegram_id'
      .single();

    if (profileError || !profile) {
      console.error('Profile not found:', profileError?.message);
      return new Response(JSON.stringify({ error: "User profile not found or not linked to this Telegram account" }), {
        status: 404, // Not Found
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
    
    const userUuid = profile.id; // ✅ Это СУЩЕСТВУЮЩИЙ UUID пользователя

    // 4. Создание кастомного JWT
    const payload = {
      sub: userUuid, // ✅ Используем настоящий UUID пользователя
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 1 день
    };

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const jwt = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    // 5. Возвращаем JWT клиенту
    return new Response(JSON.stringify({ token: jwt, user }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});