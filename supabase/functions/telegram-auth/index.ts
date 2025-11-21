import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";

async function validateTelegramAuth(initData: string, botToken: string): Promise<{ isValid: boolean; user?: any }> {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  const user = params.get('user');
  
  if (!hash || !user) return { isValid: false };
  
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

  if (hex === hash) return { isValid: true, user: JSON.parse(user) };
  return { isValid: false };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCors();

  try {
    const { initData } = await req.json();
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const JWT_SECRET = Deno.env.get("JWT_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!BOT_TOKEN || !JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing env variables");
    }

    const { isValid, user: telegramUser } = await validateTelegramAuth(initData, BOT_TOKEN);

    if (!isValid || !telegramUser) {
      return new Response(JSON.stringify({ error: "Invalid Telegram data" }), { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const telegramUserId = telegramUser.id.toString();
    let userUuid: string;

    // 1. Ищем профиль по telegram_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('telegram_id', telegramUserId)
      .single();

    if (profile) {
      userUuid = profile.id;
    } else {
      // 2. Если нет - создаем через Auth (триггер создаст профиль)
      console.log(`Registering new user: ${telegramUserId}`);
      const dummyEmail = `${telegramUserId}@tma.user`;
      const fullName = `${telegramUser.first_name || ''} ${telegramUser.last_name || ''}`.trim();

      const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        email_confirm: true,
        user_metadata: { full_name: fullName, username: telegramUser.username }
      });

      if (createAuthError) {
          // Если юзер уже есть в auth, но нет в profiles (редкий баг рассинхрона), найдем его ID
          if (createAuthError.message.includes("duplicate")) {
               const { data: existingAuth } = await supabaseAdmin.from('auth.users').select('id').eq('email', dummyEmail).single(); // псевдокод, админ может искать иначе
               // Упростим: просто вернем ошибку, или попробуем найти пользователя по email, но для надежности лучше кинуть ошибку
               throw new Error("User sync error: Auth exists but Profile missing. Contact support.");
          }
          throw createAuthError;
      }
      userUuid = newAuthUser.user.id;

      // Обновляем профиль (вносим telegram_id)
      await supabaseAdmin.from('profiles').update({
          telegram_id: telegramUserId,
          username: telegramUser.username,
          full_name: fullName
      }).eq('id', userUuid);
    }

    // 3. Генерируем Токен
    const payload = {
      sub: userUuid,
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 дней
    };
    
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const jwt = await create({ alg: "HS256", typ: "JWT" }, payload, key);

    // 4. ВАЖНО: Возвращаем ПОЛНЫЙ ПРОФИЛЬ, чтобы клиенту не надо было его искать
    const { data: finalProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userUuid)
        .single();

    return new Response(JSON.stringify({ token: jwt, user: finalProfile }), {
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