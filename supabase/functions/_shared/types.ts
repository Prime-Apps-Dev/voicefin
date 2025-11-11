// supabase/functions/_shared/types.ts
// Мы храним здесь типы данных и "инструменты" (tools) для Gemini.

// ❌ БЫЛО: import { FunctionDeclaration, Type } from "npm:@google/generative-ai";
// ✅ СТАЛО: Используем стабильный URL esm.sh и импортируем как пространство имен
import * as GoogleGenerativeAI from "https://esm.sh/@google/genai@1.28.0";
import { GoogleGenerativeAI } from "https://esm.sh/@google/genai@1.28.0";

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

// Декларация функции, которую Gemini будет вызывать
export const addTransactionFunctionDeclaration: GoogleGenerativeAI.FunctionDeclaration = {
  name: 'addTransaction',
  description: 'Adds a new income or expense transaction to the user\'s financial records. Infer the type (income/expense) from the context.',
  parameters: {
    // ✅ ИСПРАВЛЕНИЕ: Используем GoogleGenerativeAI.Type
    type: GoogleGenerativeAI.Type.OBJECT,
    properties: {
      name: { type: GoogleGenerativeAI.Type.STRING, description: 'A brief, clear name for the transaction, e.g., "Groceries" or "Monthly Salary".' },
      amount: { type: GoogleGenerativeAI.Type.NUMBER, description: 'The numerical value of the transaction.' },
      currency: { type: GoogleGenerativeAI.Type.STRING, description: 'The 3-letter ISO 4217 currency code, e.g., "USD", "EUR". Default to USD if not specified.' },
      category: { type: GoogleGenerativeAI.Type.STRING, description: 'The category of the transaction. Use one of the existing categories if possible, or create a sensible new one. E.g., "Food", "Transport", "Salary", "Utilities". Use the "Savings" category for deposits to savings goals.' },
      date: { type: GoogleGenerativeAI.Type.STRING, description: 'The date and time of the transaction in ISO 8601 format (YYYY-MM-DDTHH:MM:SS). Use the current date and time if not specified.' },
      type: { type: GoogleGenerativeAI.Type.STRING, enum: [TransactionType.INCOME, TransactionType.EXPENSE], description: 'The type of transaction.' },
      description: { type: GoogleGenerativeAI.Type.STRING, description: 'Any additional details or context about the transaction, such as location or specific items. For example, from "I bought peaches for 200 som on the corner of my house", this field should be "on the corner of my house".' },
      savingsGoalName: { type: GoogleGenerativeAI.Type.STRING, description: 'If the category is "Savings", specify the name of the savings goal this transaction is for.' },
    },
    required: ['name', 'amount', 'currency', 'category', 'date', 'type'],
  },
};