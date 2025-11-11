// supabase/functions/_shared/types.ts

// ✅ ИСПРАВЛЕНО: Используем официальный пакет Google
import { FunctionDeclaration, SchemaType } from "https://esm.sh/@google/generative-ai@0.21.0";

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

// Используем правильные типы из официального пакета
export const addTransactionFunctionDeclaration: FunctionDeclaration = {
  name: 'addTransaction',
  description: 'Adds a new income or expense transaction to the user\'s financial records. Infer the type (income/expense) from the context.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { 
        type: SchemaType.STRING, 
        description: 'A brief, clear name for the transaction, e.g., "Groceries" or "Monthly Salary".' 
      },
      amount: { 
        type: SchemaType.NUMBER, 
        description: 'The numerical value of the transaction.' 
      },
      currency: { 
        type: SchemaType.STRING, 
        description: 'The 3-letter ISO 4217 currency code, e.g., "USD", "EUR". Default to USD if not specified.' 
      },
      category: { 
        type: SchemaType.STRING, 
        description: 'The category of the transaction. Use one of the existing categories if possible, or create a sensible new one. E.g., "Food", "Transport", "Salary", "Utilities". Use the "Savings" category for deposits to savings goals.' 
      },
      date: { 
        type: SchemaType.STRING, 
        description: 'The date and time of the transaction in ISO 8601 format (YYYY-MM-DDTHH:MM:SS). Use the current date and time if not specified.' 
      },
      type: { 
        type: SchemaType.STRING, 
        enum: [TransactionType.INCOME, TransactionType.EXPENSE], 
        description: 'The type of transaction.' 
      },
      description: { 
        type: SchemaType.STRING, 
        description: 'Any additional details or context about the transaction, such as location or specific items. For example, from "I bought peaches for 200 som on the corner of my house", this field should be "on the corner of my house".' 
      },
      savingsGoalName: { 
        type: SchemaType.STRING, 
        description: 'If the category is "Savings", specify the name of the savings goal this transaction is for.' 
      },
    },
    required: ['name', 'amount', 'currency', 'category', 'date', 'type'],
  },
};