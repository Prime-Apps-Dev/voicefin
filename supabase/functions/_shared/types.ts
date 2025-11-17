// supabase/functions/_shared/types.ts

// ✅ ИСПРАВЛЕНО: Используем официальный пакет Google
import { FunctionDeclaration, SchemaType } from "https://esm.sh/@google/generative-ai@0.21.0";

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

// Используем правильные типы из официального пакета
export const addTransactionFunctionDeclaration: FunctionDeclaration = {
  name: 'addTransaction',
  description: 'Adds a new income, expense, or transfer transaction to the user\'s financial records. Infer the type from the context.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { 
        type: SchemaType.STRING, 
        description: 'A brief, clear name for the transaction, e.g., "Groceries", "Monthly Salary", or "Transfer to Savings".' 
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
        description: 'The category of the transaction (ONLY for Income/Expense). E.g., "Food", "Transport". Leave empty for Transfers.' 
      },
      date: { 
        type: SchemaType.STRING, 
        description: 'The date and time of the transaction in ISO 8601 format (YYYY-MM-DDTHH:MM:SS). Use the current date and time if not specified.' 
      },
      type: { 
        type: SchemaType.STRING, 
        enum: [TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER], 
        description: 'The type of transaction. Use TRANSFER if the user moves money between their own accounts.' 
      },
      description: { 
        type: SchemaType.STRING, 
        description: 'Any additional details or context about the transaction.' 
      },
      savingsGoalName: { 
        type: SchemaType.STRING, 
        description: 'If the category is "Savings", specify the name of the savings goal this transaction is for.' 
      },
      fromAccountName: {
        type: SchemaType.STRING,
        description: 'For TRANSFER: The name of the source account (e.g., "Card", "Cash"). For EXPENSE: The account used to pay.'
      },
      toAccountName: {
        type: SchemaType.STRING,
        description: 'For TRANSFER: The name of the destination account (e.g., "Cash", "Savings").'
      }
    },
    required: ['name', 'amount', 'currency', 'date', 'type'],
  },
};