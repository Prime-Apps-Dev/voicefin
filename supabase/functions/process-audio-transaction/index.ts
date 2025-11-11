// supabase/functions/process-audio-transaction/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { getSystemInstruction } from "../_shared/prompts.ts";
import { addTransactionFunctionDeclaration } from "../_shared/types.ts";

serve(async (req) => {
  
  console.log("EDGE FUNCTION: process-audio-transaction started."); // LOG 1: Старт функции

  if (req.method === 'OPTIONS') {
    console.log("EDGE FUNCTION: Handling OPTIONS request.");
    return handleCors();
  }
  
  // 1. 🚨 БЛОК КЛИЕНТА SUPABASE УДАЛЕН 🚨
  // ... (комментарии)

  try {
    // ------------------------------------------------
    // 1. ИНИЦИАЛИЗАЦИЯ И ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
    // ------------------------------------------------
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("EDGE FUNCTION ERROR: GEMINI_API_KEY not set.");
      throw new Error("GEMINI_API_KEY not set in Edge Function secrets.");
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // ------------------------------------------------
    // 2. ОБРАБОТКА FormData
    // ------------------------------------------------
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const contextStr = formData.get('context') as string;

    if (!audioFile || !contextStr) {
      console.error("EDGE FUNCTION: Missing audio or context."); // LOG 2: Нет данных
      throw new Error("Missing audio or context.");
    }
    
    console.log(`EDGE FUNCTION: Received audio file. Name: ${audioFile.name}, Type: ${audioFile.type}, Size: ${audioFile.size} bytes.`); // LOG 3: Детали аудио
    
    const context = JSON.parse(contextStr);
    const { categories, savingsGoals, language } = context;
    console.log("EDGE FUNCTION: Parsed context:", { language, categoriesCount: categories.length, goalsCount: savingsGoals.length }); // LOG 4: Детали контекста


    // ------------------------------------------------
    // 3. КОНВЕРТАЦИЯ АУДИО И ВЫЗОВ GEMINI
    // ------------------------------------------------
    // Конвертируем аудио в base64
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const mimeType = audioFile.type || 'audio/webm';
    console.log(`EDGE FUNCTION: Audio converted to base64. Base64 length: ${audioBase64.length}`); // LOG 5: Статус Base64

    // Запрос к Gemini
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      systemInstruction: getSystemInstruction(categories, savingsGoals, language),
      tools: [{ functionDeclarations: [addTransactionFunctionDeclaration] }],
    });

    console.log("EDGE FUNCTION: Calling Gemini model..."); // LOG 6: Запрос к Gemini

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
    ]);

    console.log("EDGE FUNCTION: Gemini response received."); // LOG 7: Ответ получен

    const functionCall = result.response.functionCalls()?.[0];
    const geminiText = result.text.trim();
    
    if (functionCall) {
        console.log("EDGE FUNCTION: Gemini returned a Function Call:", functionCall.name); // LOG 8a: Вызов функции
    } else if (geminiText) {
        console.log(`EDGE FUNCTION: Gemini returned Text Transcription: "${geminiText.substring(0, Math.min(geminiText.length, 100))}..."`); // LOG 8b: Транскрипция
    } else {
        console.log("EDGE FUNCTION: Gemini returned neither a Function Call nor Text."); // LOG 8c: Пустой ответ
    }
    
    // ------------------------------------------------
    // 4. ОБРАБОТКА ОТВЕТА
    // ------------------------------------------------
    if (!functionCall || functionCall.name !== 'addTransaction') {
      // Это может быть просто текстовый ответ, который нужно вернуть для Review
      return new Response(JSON.stringify({ transcription: result.text }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Возвращаем распарсенную транзакцию
    const transaction = functionCall.args;
    console.log("EDGE FUNCTION: Transaction args before goalId mapping:", transaction); // LOG 9: Аргументы транзакции

    // Обрабатываем goalId
    if (transaction.savingsGoalName && savingsGoals) {
      const goal = savingsGoals.find(
        (g: any) => g.name.toLowerCase() === transaction.savingsGoalName.toLowerCase()
      );
      if (goal) {
        transaction.goalId = goal.id;
        console.log(`EDGE FUNCTION: Mapped savingsGoalName "${transaction.savingsGoalName}" to goalId: ${goal.id}`); // LOG 10: Маппинг цели
      } else {
        console.log(`EDGE FUNCTION: Could not find savings goal for name: ${transaction.savingsGoalName}`);
      }
      delete transaction.savingsGoalName;
    }
    
    console.log("EDGE FUNCTION: Returning successful transaction payload:", transaction); // LOG 11: Финальный ответ
    
    return new Response(JSON.stringify(transaction), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    // ------------------------------------------------
    // 5. ЕДИНАЯ ОБРАБОТКА ОШИБОК
    // ------------------------------------------------
    console.error("EDGE FUNCTION CRITICAL ERROR:", error.message); // LOG 12: Ошибка
    // Возвращаем 500 статус, чтобы клиент мог поймать ошибку.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});