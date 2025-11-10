/// <reference types="vite/client" />

// Эта секция говорит TypeScript, что такое "сейф" (import.meta.env)
// и какие "ячейки" (переменные) в нем можно найти.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Вы можете добавить сюда другие VITE_ переменные, если они появятся
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}