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
  description: `
Extracts transaction details from user's voice input to add to their personal finance tracker.
This function intelligently parses natural language and determines the transaction type:
- INCOME: Money coming INTO the user's wallet (salary, gifts, freelance)
- EXPENSE: Money going OUT of the user's wallet (purchases, bills, services)
- TRANSFER: Money moving BETWEEN user's own accounts (Card → Cash, Cash → Savings, etc.)

CRITICAL: Always infer missing data intelligently. Never return errors for incomplete input.
`.trim(),
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { 
        type: SchemaType.STRING, 
        description: `
A brief, clear name for the transaction. Examples:
- "Groceries at Walmart"
- "Monthly Salary"
- "Cash withdrawal"
- "Transfer to Savings"

If user doesn't specify a name, infer from context:
- "Spent 500" → "Expense 500"
- "1000" → "Transaction 1000"
- Empty input → "Transaction"
`.trim()
      },
      amount: { 
        type: SchemaType.NUMBER, 
        description: `
The numerical value of the transaction.

IMPORTANT RULES:
1. Evaluate mathematical expressions: "half of 1000" = 500, "100 plus 50" = 150
2. Slang conversions (Russian context):
   - "штука" / "кусок" / "тыща" = 1000
   - "пятихатка" = 500
   - "сотка" = 100
3. If amount is missing or unclear, set to 0 (user will input manually)
4. Always use numeric value only (no currency symbols)

Examples:
- "50" → 50
- "half of 10k" → 5000
- "штука баксов" → 1000
- "bought bread" → 0 (amount missing)
`.trim()
      },
      currency: { 
        type: SchemaType.STRING, 
        description: `
The 3-letter ISO 4217 currency code (e.g., "USD", "EUR", "RUB", "KGS").

RULES:
1. If user mentions currency explicitly, use it: "100 dollars" → "USD", "500 рублей" → "RUB"
2. If not mentioned, use the user's default currency (provided in context)
3. Common slang:
   - "баксов" / "долларов" / "bucks" → USD
   - "рублей" / "руб" / "рэ" → RUB
   - "сом" / "сомов" → KGS
   - "евро" → EUR

Default to user's default currency if unclear.
`.trim()
      },
      category: { 
        type: SchemaType.STRING, 
        description: `
The category of the transaction (ONLY for Income/Expense transactions).

RULES:
1. For TRANSFER: Leave EMPTY (transfers don't have categories)
2. For INCOME/EXPENSE: Match to available categories (provided in context)
3. Use fuzzy matching: "groceries" → "Food & Drink", "taxi" → "Transport"
4. If no match found, leave EMPTY (user will select from dropdown)
5. NEVER invent categories not in the provided list

Examples:
- "bought bread" → "Food & Drink"
- "paid for Uber" → "Transport"
- "withdrew cash" → "" (transfer, no category)
- "spent 500" → "" (unclear category)
`.trim()
      },
      date: { 
        type: SchemaType.STRING, 
        description: `
The date and time of the transaction in ISO 8601 format (YYYY-MM-DDTHH:MM:SS).

RULES:
1. If user specifies date AND time → use both
2. If user specifies ONLY date → use that date with current time
3. If user specifies ONLY time → use current date with that time
4. If nothing specified → use current date and time
5. Handle relative dates: "yesterday", "last Monday", "two days ago"

Examples:
- "bought bread yesterday at 3pm" → "2025-01-17T15:00:00"
- "spent 500 today" → "2025-01-18T14:30:00" (current time)
- "paid at 8am" → "2025-01-18T08:00:00" (current date)
- "bought milk" → "2025-01-18T14:30:00" (current datetime)
`.trim()
      },
      type: { 
        type: SchemaType.STRING, 
        enum: [TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER], 
        description: `
The type of transaction. THIS IS THE MOST CRITICAL FIELD TO GET RIGHT.

=== INCOME ===
Money coming INTO the user's wallet from external sources:
- Salary, wages, bonus
- Gifts received
- Freelance payment
- Investment returns
- Any money FROM outside

Keywords: "получил", "зарплата", "подарок", "заработал", "received", "salary", "got paid"

=== EXPENSE ===
Money going OUT of the user's wallet to external parties:
- Purchases (food, clothes, etc.)
- Bills (utilities, rent, subscriptions)
- Services (taxi, haircut, etc.)
- Money given to others (NOT to own accounts)

Keywords: "купил", "потратил", "оплатил", "заплатил", "spent", "bought", "paid"

=== TRANSFER ===
Money moving BETWEEN user's own accounts (internal movement):
- Card → Cash (ATM withdrawal)
- Cash → Card (deposit)
- Card → Savings
- Any account → Any account

CRITICAL KEYWORDS:
- "снял" / "withdrew" → Card to Cash
- "перевёл на свой" / "transferred to my" → Transfer
- "положил на карту" / "deposited" → Cash to Card
- "обналичил" / "cashed out" → Card to Cash
- "с карты на карту" → Card to Card
- "пополнил счёт" → Transfer

IMPORTANT DISTINCTIONS:
❌ "перевёл другу 500" → EXPENSE (money left your wallet)
✅ "перевёл на наличку 500" → TRANSFER (money stayed in your wallet)

❌ "снял деньги" → if no "from X to Y" mentioned, assume TRANSFER (Card → Cash)
✅ "снял 1000 с карты" → TRANSFER

Default to EXPENSE if unsure between EXPENSE and TRANSFER.
`.trim()
      },
      description: { 
        type: SchemaType.STRING, 
        description: `
Any additional details or context about the transaction.

Examples:
- "Weekly shopping at Kroger"
- "Birthday gift from parents"
- "Quarterly bonus payout"

Leave empty if no additional context provided.
`.trim()
      },
      savingsGoalName: { 
        type: SchemaType.STRING, 
        description: `
If the user mentions putting money ASIDE into a specific savings goal, specify the goal name here.

This is ONLY used when:
1. Category is "Savings"
2. User mentions a specific goal from the available list (provided in context)

Examples:
- "put 1000 into vacation fund" → "Vacation"
- "saved 500 for car" → "Car"
- "withdrew from emergency fund" → "Emergency Fund"

Leave empty if not a savings transaction or no specific goal mentioned.
`.trim()
      },
      fromAccountName: {
        type: SchemaType.STRING,
        description: `
The name of the SOURCE account (where money is coming FROM).

USAGE:
1. For TRANSFER: REQUIRED - the account losing money
2. For EXPENSE: OPTIONAL - the account being used for payment
3. For INCOME: Leave EMPTY (money comes from external source)

RULES:
1. Try to match user's words to available account names (provided in context)
2. Use fuzzy matching: "сберовская" → "Моя карта Сбер", "card" → first CARD account
3. If user says "с карты" but doesn't specify which → use first CARD account
4. If user says "из наличных" → use first CASH account
5. If completely unclear → leave EMPTY (will default to first account)

Examples:
- "снял 1000 с карты" → "Моя карта Сбер" (or first card)
- "перевёл со сберовской" → "Моя карта Сбер"
- "bought bread with card" → "Моя карта Сбер"
- "spent 500" → "" (unclear which account)
`.trim()
      },
      toAccountName: {
        type: SchemaType.STRING,
        description: `
The name of the DESTINATION account (where money is going TO).

USAGE:
1. For TRANSFER: REQUIRED - the account receiving money
2. For INCOME: Leave EMPTY (money goes to default account)
3. For EXPENSE: Leave EMPTY (money leaves the wallet)

RULES:
1. Same fuzzy matching as fromAccountName
2. Common patterns:
   - "на наличку" / "in cash" → first CASH account
   - "на карту" / "to card" → first CARD account
   - "в накопления" / "to savings" → first SAVINGS account

Examples:
- "снял 1000 на наличку" → "Наличные"
- "перевёл на сберовскую" → "Моя карта Сбер"
- "deposited to savings" → "Savings Account"
`.trim()
      }
    },
    required: ['name', 'amount', 'currency', 'date', 'type'],
  },
};