// supabase/functions/parse-text-transaction/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { getSystemInstruction } from "../_shared/prompts.ts";
import { addTransactionFunctionDeclaration } from "../_shared/types.ts";

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

    // Получаем тело запроса
    const { 
      text, 
      categories, 
      savingsGoals, 
      language 
    } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "Missing text input" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 400,
      });
    }
    
    // Создаём модель с инструкцией и функцией
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Оптимальная модель для парсинга текста
      systemInstruction: getSystemInstruction(categories, savingsGoals, language),
      tools: [{ functionDeclarations: [addTransactionFunctionDeclaration] }],
    });

    // Запрос к Gemini
    const result = await model.generateContent([text]);

    const response = result.response;
    const functionCall = response.functionCalls()?.[0];

    if (!functionCall || functionCall.name !== 'addTransaction') {
      throw new Error(`Could not parse transaction from text: ${result.text || "No structured output."}`);
    }

    // Возвращаем распарсенную транзакцию
    const transaction = functionCall.args;

    // Обрабатываем goalId (если goalName был распознан)
    if (transaction.savingsGoalName && savingsGoals) {
      const goal = savingsGoals.find(
        (g: any) => g.name.toLowerCase() === transaction.savingsGoalName.toLowerCase()
      );
      if (goal) {
        transaction.goalId = goal.id;
      }
      delete transaction.savingsGoalName;
    }

    return new Response(JSON.stringify(transaction), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in parse-text-transaction:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});