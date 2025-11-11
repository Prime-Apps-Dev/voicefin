// supabase/functions/process-audio-transaction/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { getSystemInstruction } from "../_shared/prompts.ts";
import { addTransactionFunctionDeclaration } from "../_shared/types.ts";
import { createClient } from "npm:@supabase/supabase-js";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
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
    
    // 🚨 ВАЖНО: Добавляем `telegram_user_id` из JWT.
    // Если мы используем RLS, то можем просто вызывать Supabase API
    // Для этого нам нужен токен пользователя, который мы получили выше!
    
    // В этом Edge Function мы не будем добавлять транзакцию в БД,
    // а просто вернем распарсенный объект, чтобы клиентское приложение 
    // его подтвердило (TransactionForm) и затем добавило.
    
    // Если бы мы добавляли в БД прямо здесь:
    // const { data: transactionData, error: dbError } = await supabase
    //  .from('transactions')
    //  .insert([transaction])
    //  .select()
    //  .single();
    
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