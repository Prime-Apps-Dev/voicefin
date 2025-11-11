import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { CORS_HEADERS, handleCors } from "../_shared/cors.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCors();
  }
  
  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not set in Edge Function secrets.");
    }

    const { transactions, defaultCurrency, language } = await req.json();

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    const systemInstruction = `You are a concise and helpful personal financial analyst. Analyze the provided transaction history in the context of the user's default currency (${defaultCurrency}). 
    
    The user's language is ${language}. Respond STRICTLY in ${language}.
    
    Your goal is to provide a brief summary (under 100 words) of their spending habits, and actionable advice (1-2 clear steps). Do not use markdown titles.
    
    Output the result as a raw JSON object with two fields: 'summary' (string) and 'advice' (string).`;
    
    // Преобразуем транзакции в строку, чтобы передать их в Gemini
    const transactionSummary = JSON.stringify(transactions.slice(0, 50).map(t => ({
      name: t.name,
      amount: t.amount,
      currency: t.currency,
      type: t.type,
    })));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            "summary": { "type": "STRING", "description": "A concise summary of their spending/saving habits." },
            "advice": { "type": "STRING", "description": "1-2 actionable piece of financial advice." }
          },
          "propertyOrdering": ["summary", "advice"]
        }
      }
    });

    const prompt = `Analyze this transaction data and provide a summary and advice: ${transactionSummary}`;

    const result = await model.generateContent(prompt);
    
    // Gemini возвращает JSON в виде строки
    const jsonText = result.text.trim();
    const analysis = JSON.parse(jsonText);

    return new Response(JSON.stringify(analysis), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error generating analysis:", error);
    return new Response(JSON.stringify({ error: error.message, summary: "Ошибка анализа.", advice: "" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});