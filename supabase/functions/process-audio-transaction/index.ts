// supabase/functions/process-audio-transaction/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { getSystemInstruction } from "../_shared/prompts.ts";
import { addTransactionFunctionDeclaration } from "../_shared/types.ts";

console.log("process-audio-transaction function started");

serve(async (req) => {
  // 1. CORS
  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set in Edge Function secrets.");
    }

    // 2. Получаем данные из FormData
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const contextStr = formData.get("context") as string;

    if (!audioFile || !contextStr) {
      throw new Error("Missing audio file or context data");
    }

    const context = JSON.parse(contextStr);
    const { categories, savingsGoals, accounts, language, defaultCurrency } = context;

    console.log("Context received:", { 
      categoriesCount: categories?.length || 0, 
      goalsCount: savingsGoals?.length || 0,
      accountsCount: accounts?.length || 0,
      language, 
      defaultCurrency 
    });

    // 3. Подготовка аудио
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // 4. Инициализация Gemini с ОБНОВЛЁННЫМ промптом
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    const systemInstruction = getSystemInstruction(
      categories || [], 
      savingsGoals || [], 
      accounts || [], // НОВОЕ: передаём счета
      language || 'en',
      defaultCurrency || 'USD'
    );

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Используем быструю модель для аудио
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: [addTransactionFunctionDeclaration] }],
    });

    // 5. Отправка запроса
    console.log("Sending audio to Gemini...");
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: audioFile.type || "audio/webm",
          data: base64Audio,
        },
      },
    ]);

    const response = result.response;
    const functionCalls = response.functionCalls();

    if (!functionCalls || functionCalls.length === 0) {
      // Если AI не вернул function call, пытаемся получить текст
      const text = response.text();
      console.warn("No function call returned. AI text response:", text);
      
      // Возвращаем пустую транзакцию с amount = 0
      return new Response(JSON.stringify({
        name: "Транзакция",
        amount: 0,
        currency: defaultCurrency || "USD",
        category: "",
        date: new Date().toISOString(),
        type: "EXPENSE",
        description: text || "",
        fromAccountName: "",
        toAccountName: ""
      }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const functionCall = functionCalls[0];
    const args = functionCall.args;

    console.log("AI extracted args:", JSON.stringify(args, null, 2));

    // 6. Валидация и очистка
    const cleanedArgs = {
      name: args.name || "Транзакция",
      amount: typeof args.amount === 'number' ? args.amount : 0,
      currency: args.currency || defaultCurrency || "USD",
      category: args.category || "",
      date: args.date || new Date().toISOString(),
      type: args.type || "EXPENSE",
      description: args.description || "",
      fromAccountName: args.fromAccountName || "",
      toAccountName: args.toAccountName || "",
      savingsGoalName: args.savingsGoalName || "",
    };

    // 7. Дополнительная логика на случай ошибок AI
    
    // Если это TRANSFER, но нет fromAccount/toAccount — попытка исправить
    if (cleanedArgs.type === "TRANSFER") {
      // category всегда пусто для переводов
      cleanedArgs.category = "";
      
      // Если fromAccount не указан, попробуем найти CARD
      if (!cleanedArgs.fromAccountName && accounts && accounts.length > 0) {
        const cardAccount = accounts.find((a: any) => a.type === 'CARD');
        cleanedArgs.fromAccountName = cardAccount ? cardAccount.name : accounts[0].name;
      }
      
      // Если toAccount не указан, попробуем найти CASH
      if (!cleanedArgs.toAccountName && accounts && accounts.length > 0) {
        const cashAccount = accounts.find((a: any) => a.type === 'CASH');
        cleanedArgs.toAccountName = cashAccount ? cashAccount.name : accounts[1]?.name || "";
      }
    }
    
    // Если это EXPENSE с toAccountName — это ошибка, убираем
    if (cleanedArgs.type === "EXPENSE" && cleanedArgs.toAccountName) {
      cleanedArgs.toAccountName = "";
    }
    
    // Если это INCOME с fromAccountName — ошибка, убираем
    if (cleanedArgs.type === "INCOME" && cleanedArgs.fromAccountName) {
      cleanedArgs.fromAccountName = "";
    }

    console.log("Cleaned and validated args:", JSON.stringify(cleanedArgs, null, 2));

    return new Response(JSON.stringify(cleanedArgs), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error processing audio transaction:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      // Fallback транзакция
      name: "Ошибка обработки",
      amount: 0,
      currency: "USD",
      category: "",
      date: new Date().toISOString(),
      type: "EXPENSE",
      description: error.message,
      fromAccountName: "",
      toAccountName: ""
    }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});