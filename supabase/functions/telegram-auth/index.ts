// supabase/functions/telegram-auth/index.ts
// Эта функция ПРОВЕРЯЕТ данные от Telegram и ВЫДАЕТ JWT-токен.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";

// Вспомогательная функция для валидации
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
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const JWT_SECRET = Deno.env.get("JWT_SECRET");

    if (!BOT_TOKEN || !JWT_SECRET) {
      throw new Error("Missing environment variables");
    }

    // 1. Валидация
    const { isValid, user } = await validateTelegramAuth(initData, BOT_TOKEN);

    if (!isValid || !user) {
      return new Response(JSON.stringify({ error: "Invalid Telegram data" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. Создание кастомного JWT
    // Мы НЕ создаем пользователя в auth.users. Мы создаем JWT,
    // который RLS-политики (в SQL) смогут проверить.
    const telegramUserId = user.id.toString();
    
    // https://supabase.com/docs/guides/auth/auth-helpers/custom-server-side-rendering#custom-jwt
    const payload = {
      sub: telegramUserId, // 'sub' (subject) - это ID пользователя, который RLS будет проверять
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 1 day
    };

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const jwt = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    // 3. Возвращаем JWT клиенту
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