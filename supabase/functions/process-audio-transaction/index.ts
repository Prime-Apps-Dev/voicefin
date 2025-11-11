// supabase/functions/process-audio-realtime/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";
import { getSystemInstruction } from "../_shared/prompts.ts";
import { addTransactionFunctionDeclaration } from "../_shared/types.ts";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}

serve(async (req) => {
  console.log("EDGE FUNCTION: process-audio-realtime started."); 

  if (req.method === 'OPTIONS') {
    return handleCors();
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set in Edge Function secrets.");
    }
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const contextStr = formData.get('context') as string;
    const streamMode = formData.get('stream') === 'true'; // Новый параметр

    if (!audioFile || !contextStr) {
      throw new Error("Missing audio or context.");
    }
    
    console.log(`EDGE FUNCTION: Received audio. Size: ${audioFile.size} bytes. Stream mode: ${streamMode}`); 
    
    const context = JSON.parse(contextStr);
    const { categories, savingsGoals, language } = context;

    const audioBuffer = await audioFile.arrayBuffer();
    const audioBase64 = arrayBufferToBase64(audioBuffer);
    const mimeType = audioFile.type || 'audio/webm';

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp",
      systemInstruction: getSystemInstruction(categories, savingsGoals, language),
      tools: [{ functionDeclarations: [addTransactionFunctionDeclaration] }],
    });

    // ✅ STREAMING MODE: Отправляем данные по мере их поступления
    if (streamMode) {
      console.log("EDGE FUNCTION: Starting streaming response...");
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const result = await model.generateContentStream([
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
            ]);

            // Отправляем промежуточные результаты
            for await (const chunk of result.stream) {
              const text = chunk.text();
              if (text) {
                const data = JSON.stringify({ 
                  type: 'transcription',
                  text: text,
                  isPartial: true 
                });
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
                console.log(`EDGE FUNCTION: Streamed chunk: "${text.substring(0, 50)}..."`);
              }
            }

            // Финальный результат с function call
            const finalResult = await result.response;
            const functionCall = finalResult.functionCalls()?.[0];
            
            if (functionCall && functionCall.name === 'addTransaction') {
              const transaction = functionCall.args;
              
              // Маппинг savings goal
              if (transaction.savingsGoalName && savingsGoals) {
                const goal = savingsGoals.find(
                  (g: any) => g.name.toLowerCase() === transaction.savingsGoalName.toLowerCase()
                );
                if (goal) {
                  transaction.goalId = goal.id;
                }
                delete transaction.savingsGoalName;
              }
              
              const data = JSON.stringify({
                type: 'transaction',
                transaction: transaction,
                isPartial: false
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
              console.log("EDGE FUNCTION: Streamed final transaction");
            } else {
              const data = JSON.stringify({
                type: 'transcription',
                text: finalResult.text(),
                isPartial: false
              });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }

            controller.close();
          } catch (error: any) {
            console.error("EDGE FUNCTION STREAM ERROR:", error.message);
            const errorData = JSON.stringify({ type: 'error', error: error.message });
            controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ✅ REGULAR MODE: Обычный ответ (как раньше)
    console.log("EDGE FUNCTION: Regular mode - waiting for complete response...");
    
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
    ]);

    const functionCall = result.response.functionCalls()?.[0];
    const geminiText = result.response.text();
    
    if (!functionCall || functionCall.name !== 'addTransaction') {
      return new Response(JSON.stringify({ transcription: geminiText }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const transaction = functionCall.args;
    
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
    console.error("EDGE FUNCTION CRITICAL ERROR:", error.message);
    console.error("EDGE FUNCTION ERROR STACK:", error.stack); 
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});