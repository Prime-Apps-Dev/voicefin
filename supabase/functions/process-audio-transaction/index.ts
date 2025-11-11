// supabase/functions/process-audio-transaction/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
// ✅ ИСПОЛЬЗУЕМ: Импорт всего модуля (* as GenAIModule)
import * as GenAIModule from "https://esm.sh/@google/genai@1.28.0"; 
import { getSystemInstruction } from "../_shared/prompts.ts";
import { addTransactionFunctionDeclaration } from "../_shared/types.ts";

serve(async (req) => {
  
  console.log("EDGE FUNCTION: process-audio-transaction started."); 

  if (req.method === 'OPTIONS') {
    console.log("EDGE FUNCTION: Handling OPTIONS request.");
    return handleCors();
  }

  try {
    // ------------------------------------------------
    // 1. ИНИЦИАЛИЗАЦИЯ И ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ
    // ------------------------------------------------
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("EDGE FUNCTION ERROR: GEMINI_API_KEY not set.");
      throw new Error("GEMINI_API_KEY not set in Edge Function secrets.");
    }
    
    // ✅ ИСПРАВЛЕНИЕ: Универсальное получение конструктора.
    // Deno/ESM часто экспортируют главный класс как 'default' или 'GoogleGenerativeAI'.
    // Мы пробуем оба варианта.
    const GoogleGenerativeAIConstructor = 
      (GenAIModule as any).GoogleGenerativeAI || (GenAIModule as any).default;
      
    if (typeof GoogleGenerativeAIConstructor !== 'function') {
        throw new Error("GenAIModule is loaded but the GoogleGenerativeAI constructor is missing or not a function.");
    }
    
    const genAI = new GoogleGenerativeAIConstructor(GEMINI_API_KEY);

    // ------------------------------------------------
    // 2. ОБРАБОТКА FormData (только для POST)
    // ------------------------------------------------
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const contextStr = formData.get('context') as string;

    if (!audioFile || !contextStr) {
      console.error("EDGE FUNCTION: Missing audio or context."); 
      throw new Error("Missing audio or context.");
    }
    
    console.log(`EDGE FUNCTION: Received audio file. Name: ${audioFile.name}, Type: ${audioFile.type}, Size: ${audioFile.size} bytes.`); 
    
    const context = JSON.parse(contextStr);
    const { categories, savingsGoals, language } = context;
    console.log("EDGE FUNCTION: Parsed context:", { language, categoriesCount: categories.length, goalsCount: savingsGoals.length }); 


    // ------------------------------------------------
    // 3. КОНВЕРТАЦИЯ АУДИО И ВЫЗОВ GEMINI
    // ------------------------------------------------
    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const mimeType = audioFile.type || 'audio/webm';
    console.log(`EDGE FUNCTION: Audio converted to base64. Base64 length: ${audioBase64.length}`); 

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", 
      systemInstruction: getSystemInstruction(categories, savingsGoals, language),
      tools: [{ functionDeclarations: [addTransactionFunctionDeclaration] }],
    });

    console.log("EDGE FUNCTION: Calling Gemini model..."); 

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
    ]);

    console.log("EDGE FUNCTION: Gemini response received."); 

    const functionCall = result.response.functionCalls()?.[0];
    const geminiText = result.text.trim();
    
    if (functionCall) {
        console.log("EDGE FUNCTION: Gemini returned a Function Call:", functionCall.name); 
    } else if (geminiText) {
        console.log(`EDGE FUNCTION: Gemini returned Text Transcription: "${geminiText.substring(0, Math.min(geminiText.length, 100))}..."`); 
    } else {
        console.log("EDGE FUNCTION: Gemini returned neither a Function Call nor Text."); 
    }
    
    // ------------------------------------------------
    // 4. ОБРАБОТКА ОТВЕТА
    // ------------------------------------------------
    if (!functionCall || functionCall.name !== 'addTransaction') {
      return new Response(JSON.stringify({ transcription: result.text }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const transaction = functionCall.args;
    console.log("EDGE FUNCTION: Transaction args before goalId mapping:", transaction); 

    if (transaction.savingsGoalName && savingsGoals) {
      const goal = savingsGoals.find(
        (g: any) => g.name.toLowerCase() === transaction.savingsGoalName.toLowerCase()
      );
      if (goal) {
        transaction.goalId = goal.id;
        console.log(`EDGE FUNCTION: Mapped savingsGoalName "${transaction.savingsGoalName}" to goalId: ${goal.id}`); 
      } else {
        console.log(`EDGE FUNCTION: Could not find savings goal for name: ${transaction.savingsGoalName}`);
      }
      delete transaction.savingsGoalName;
    }
    
    console.log("EDGE FUNCTION: Returning successful transaction payload:", transaction); 
    
    return new Response(JSON.stringify(transaction), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    // ------------------------------------------------
    // 5. ЕДИНАЯ ОБРАБОТКА ОШИБОК
    // ------------------------------------------------
    console.error("EDGE FUNCTION CRITICAL ERROR:", error.message); 
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});