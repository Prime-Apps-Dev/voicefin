// supabase/functions/telegram-auth/index.ts
// Эта функция ПРОВЕРЯЕТ данные, НАХОДИТ пользователя,
// или РЕГИСТРИРУЕТ нового, если он не найден,
// и ВЫДАЕТ JWT-токен.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";

// Вспомогательная функция валидации (без изменений)
async function validateTelegramAuth(initData: string, botToken: string): Promise<{ isValid: boolean; user?: any }> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const user = params.get('user');
  
  if (!hash || !user) {
    return { isValid: false };
  }
  params.delete('hash');
  const keys: string[] = [];
  params.forEach((_value, key) => keys.push(key));
  keys.sort();
  const dataCheckString = keys.map(key => `${key}=${params.get(key)}`).join('\n');

  const secretKey = await crypto.subtle.importKey('raw', new TextEncoder().encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', secretKey, new TextEncoder().encode(botToken));
  const signatureKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', signatureKey, new TextEncoder().encode(dataCheckString));
  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  if (hex === hash) {
    return { isValid: true, user: JSON.parse(user) };
  }
  return { isValid: false };
}

// Главный обработчик
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    const { initData } = await req.json();
    
    // 1. Получаем все переменные окружения
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const JWT_SECRET = Deno.env.get("JWT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!BOT_TOKEN || !JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing one or more required environment variables");
    }

    // 2. Валидация данных Telegram
    const { isValid, user: telegramUser } = await validateTelegramAuth(initData, BOT_TOKEN);

    if (!isValid || !telegramUser) {
      return new Response(JSON.stringify({ error: "Invalid Telegram data" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 3. Инициализация Admin-клиента Supabase
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const telegramUserId = telegramUser.id.toString();
    
    let userUuid: string;

    // 4. Поиск пользователя в `profiles`
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_id', telegramUserId)
      .single();

    if (profile) {
      // --- СЦЕНАРИЙ 1: ПОЛЬЗОВАТЕЛЬ НАЙДЕН ---
      userUuid = profile.id;
      
    } else if (profileError && profileError.code === 'PGRST116') {
      // --- СЦЕНАРИЙ 2: ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН (PGRST116 = "Not found") ---
      // Это НОВЫЙ ПОЛЬЗОВАТЕЛЬ. Регистрируем его.
      
      console.log(`New user: ${telegramUserId}. Creating account...`);

      const dummyEmail = `${telegramUserId}@telegram.user`;
      const fullName = `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim();

      // 4a. Создаем пользователя в `auth.users`
      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        email_confirm: true, // Сразу помечаем email как "подтвержденный"
        user_metadata: {
          full_name: fullName,
          username: telegramUser.username,
        }
      });

      if (createAuthError) {
        // (Обработка случая, если "dummy email" уже существует - маловероятно, но возможно)
        if (createAuthError.message.includes('duplicate key')) {
          return new Response(JSON.stringify({ error: "User already exists but linkage failed. Please contact support." }), { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" }});
        }
        throw new Error(`Failed to create auth user: ${createAuthError.message}`);
      }

      userUuid = newAuthUser.user.id;
      
      // 4b. Обновляем его `profiles`
      // Триггер `handle_new_user` уже создал строку в `profiles` с `id`.
      // Нам нужно добавить в эту строку `telegram_id` и другие данные.
      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          telegram_id: telegramUserId,
          full_name: fullName,
          username: telegramUser.username,
        })
        .eq('id', userUuid);
      
      if (updateProfileError) {
        throw new Error(`Failed to update profile for new user: ${updateProfileError.message}`);
      }
      
    } else if (profileError) {
      // --- СЦЕНАРИЙ 3: ДРУГАЯ ОШИБКА БАЗЫ ДАННЫХ ---
      throw new Error(`Database error: ${profileError.message}`);
    }

    // 5. Создание кастомного JWT (теперь `userUuid` есть в любом случае)
    const payload = {
      sub: userUuid,
      aud: 'authenticated', // ✅ Исправление из прошлого шага
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 1 день
    };

    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const jwt = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    // 6. Возвращаем JWT клиенту
    return new Response(JSON.stringify({ token: jwt, user: telegramUser }), {
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