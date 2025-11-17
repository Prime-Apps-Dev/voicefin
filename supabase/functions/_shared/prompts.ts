// supabase/functions/_shared/prompts.ts

export const getSystemInstruction = (
  categories: { name: string }[],
  savingsGoals: { name: string }[],
  language: string = 'en'
): string => {
  const categoryNames = categories.map(c => `"${c.name}"`).join(', ');
  const goalNames = savingsGoals.map(g => `"${g.name}"`).join(', ');
  
  const isRussian = language === 'ru';

  // Базовая инструкция
  const baseInstruction = `
You are a financial AI assistant acting as a data processor. 
Your sole purpose is to extract structured transaction data from natural language input (voice transcript).
Input language: ${isRussian ? 'Russian (primarily) or English' : 'English'}.
`;

  // Логика самокоррекции и математики
  const logicInstruction = `
### CRITICAL RULES FOR PARSING:

1. **SELF-CORRECTION (Priority #1)**: 
   - Users often correct themselves. Always prefer the *last spoken* value for the same entity.
   - Input: "Bought bread for 50... no wait, 60." -> Result Amount: 60.
   - Input: "Taxi... actually it was Bus." -> Result Category: Bus.

2. **MATHEMATICAL EVALUATION**: 
   - If the user mentions an operation, calculate the final result.
   - Input: "Half of 1000 for lunch." -> Result Amount: 500.
   - Input: "Spent 100 plus 50 on taxi." -> Result Amount: 150.
   - Input: "300 each for me and my friend (2 people)." -> Result Amount: 600.
   
3. **IMPLICIT CURRENCY**:
   - If no currency is specified, assume the user's local default (e.g., KGS/Som if context implies Kyrgyzstan, or RUB/USD).
   - slang: "5k" = 5000. "5 pieces" (штук) = 5000.

4. **MULTIPLE ITEMS (Split Bill)**:
   - If input lists distinct items ("Milk 50, Bread 30"), SUM them into ONE transaction unless asked otherwise.
   - Description: "Milk, Bread". Amount: 80.
`;

  // Правила для категорий и сбережений
  const contextInstruction = `
### DATA MAPPING:

- **Categories**: Map to one of these specifically: [${categoryNames}]. If nothing fits perfectly, choose "Other" or the closest match.
- **Savings Goals**: If the user mentions putting money ASIDE or into a goal, check against: [${goalNames}].
- **Transfers**: If money moves between user's own accounts (e.g., "Cash to Card"), set type="TRANSFER".
`;

  // Примеры (Few-Shot Learning)
  const examples = `
### EXAMPLES:

User: "Купил продукты на 500... ой нет, на 450"
JSON: {"amount": 450, "category": "Groceries", "type": "EXPENSE", "name": "Продукты"}

User: "Половина от 5000 на бензин"
JSON: {"amount": 2500, "category": "Transport", "type": "EXPENSE", "name": "Бензин"}

User: "Снял 1000 сом с карты"
JSON: {"amount": 1000, "type": "TRANSFER", "from_account": "Card", "to_account": "Cash", "name": "Снятие наличных"}
`;

  return `${baseInstruction}\n${logicInstruction}\n${contextInstruction}\n${examples}`;
};