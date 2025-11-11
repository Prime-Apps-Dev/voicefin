// supabase/functions/process-audio-transaction/index.ts
// ВЕРСИЯ С ИСПРАВЛЕНИЕМ: Удален ненужный Supabase клиент, который вызывал сбой.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { getSystemInstruction } from "../_shared/prompts.ts";
import { addTransactionFunctionDeclaration } from "../_shared/types.ts";
// import { createClient } from "npm:@supabase/supabase-js"; // <-- ЭТО УДАЛЕНО

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  // 1. 🚨 БЛОК КЛИЕНТА SUPABASE УДАЛЕН 🚨
  // Он не был нужен в этой функции и вызывал ошибку "Load Failed",
  // так как секрет SUPABASE_SERVICE_ROLE_KEY не был установлен.
  // const authHeader = req.headers.get('Authorization');
  // const token = authHeader?.replace('Bearer ', '');
  // const supabase = createClient(...);

  try {
    // Этот ключ по-прежнему нужен
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set in Edge Function secrets.");
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Получаем FormData (аудио + контекст)
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const contextStr = formData.get('context') as string;

    if (!audioFile || !contextStr) {
      throw new Error("Missing audio or context.");
    }

    const context = JSON.parse(contextStr);
    const { categories, savingsGoals, language } = context;

    // Конвертируем аудио в base64
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const mimeType = audioFile.type || 'audio/webm';

    // Запрос к Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Используйте актуальную модель
      systemInstruction: getSystemInstruction(categories, savingsGoals, language),
      tools: [{ functionDeclarations: [addTransactionFunctionDeclaration] }],
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
    ]);

    const functionCall = result.response.functionCalls()?.[0];
    
    if (!functionCall || functionCall.name !== 'addTransaction') {
      // Это может быть просто текстовый ответ, который нужно вернуть для Review
      return new Response(JSON.stringify({ transcription: result.text }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Возвращаем распарсенную транзакцию
    const transaction = functionCall.args;

    // Обрабатываем goalId
    if (transaction.savingsGoalName && savingsGoals) {
      const goal = savingsGoals.find(
        (g: any) => g.name.toLowerCase() === transaction.savingsGoalName.toLowerCase()
      );
      if (goal) {
        transaction.goalId = goal.id;
      }
      delete transaction.savingsGoalName;
    }
    
    // Эта функция просто возвращает JSON.
    // Клиентское приложение (React) само добавит транзакцию в БД.
    
    return new Response(JSON.stringify(transaction), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error in Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});