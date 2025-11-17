// supabase/functions/process-audio-transaction/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.1.3";
import { corsHeaders } from "../_shared/cors.ts";
import { getSystemInstruction } from "../_shared/prompts.ts";

console.log("Hello from process-audio-transaction!");

serve(async (req) => {
  // 1. Обработка CORS (разрешаем запросы с фронтенда)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    // 2. Получаем данные из FormData
    // Фронтенд отправляет 'audio' (файл) и 'context' (JSON строка)
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;
    const contextStr = formData.get("context") as string;

    if (!audioFile || !contextStr) {
      throw new Error("Missing audio file or context data");
    }

    const { categories, savingsGoals, language } = JSON.parse(contextStr);

    // 3. Подготовка аудио для Gemini
    // Gemini принимает base64 для аудио
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // 4. Инициализация Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 5. Формируем промпт
    const systemInstruction = getSystemInstruction(categories, savingsGoals, language);
    
    // Определяем инструменты (Function Calling)
    // Мы описываем функцию addTransaction, которую ИИ должен "вызвать"
    const tools = {
      function_declarations: [
        {
          name: "addTransaction",
          description: "Extracts transaction details from user input to add to the finance tracker.",
          parameters: {
            type: "OBJECT",
            properties: {
              type: {
                type: "STRING",
                enum: ["INCOME", "EXPENSE", "TRANSFER"],
                description: "Type of the transaction.",
              },
              amount: {
                type: "NUMBER",
                description: "The monetary amount.",
              },
              currency: {
                type: "STRING",
                description: "Currency code (e.g., USD, RUB, EUR).",
              },
              category: {
                type: "STRING",
                description: "Category for expenses/income. Leave empty for transfers.",
              },
              name: {
                type: "STRING",
                description: "A short title for the transaction.",
              },
              fromAccountName: {
                type: "STRING",
                description: "Name of the source account (e.g., 'Card', 'Cash'). Important for Transfers.",
              },
              toAccountName: {
                type: "STRING",
                description: "Name of the destination account (e.g., 'Savings', 'Cash'). Important for Transfers.",
              },
              savingsGoalName: {
                type: "STRING",
                description: "Name of the savings goal if applicable.",
              },
              date: {
                type: "STRING",
                description: "ISO date string if mentioned, otherwise current date.",
              }
            },
            required: ["type", "amount", "currency", "name"],
          },
        },
      ],
    };

    // 6. Отправляем запрос в Gemini
    const chat = model.startChat({
      tools: [tools],
    });

    const prompt = `${systemInstruction} \n\n Audio input is attached. Extract the transaction.`;
    
    const result = await chat.sendMessage([
      prompt,
      {
        inlineData: {
          mimeType: audioFile.type || "audio/webm",
          data: base64Audio,
        },
      },
    ]);

    const response = result.response;
    const functionCalls = response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const args = call.args;
      
      console.log("Gemini extracted args:", args);

      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      // Если ИИ не вернул вызов функции, пробуем вернуть текст
      const text = response.text();
      console.warn("Gemini did not return a function call. Text:", text);
      throw new Error("Could not extract transaction details. Please try again clearly.");
    }

  } catch (error) {
    console.error("Error processing audio transaction:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});