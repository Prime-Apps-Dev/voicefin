// supabase/functions/_shared/cors.ts
// Этот файл помогает нам отправлять правильные заголовки,
// чтобы браузер мог вызывать наши функции.

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*', // В продакшене замените '*' на URL вашего приложения
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handleCors = () => {
  return new Response(null, {
    status: 204, // No Content
    headers: CORS_HEADERS,
  });
};