// supabase/functions/_shared/prompts.ts
// Здесь мы храним все наши "системные инструкции" (промпты) для Gemini.
// Этот код взят прямо из вашего VoiceFin v0.3.0/App.tsx

//
export const getSystemInstruction = (
  categories: { name: string }[],
  savingsGoals: { name: string }[],
  language: string = 'en'
): string => {
  const categoryNames = categories.map(c => `"${c.name}"`).join(', ');
  const goalNames = savingsGoals.map(g => `"${g.name}"`).join(', ');
  
  const baseInstruction = `You are a multilingual financial assistant. The user can speak/type in any language. The user interface is currently set to '${language === 'en' ? 'English' : 'Russian'}'. Your task is to extract key details from the user's description of a financial transaction and use the \`addTransaction\` function to record it. Infer the transaction type (income, expense, or transfer) from the context. If a date or time is not mentioned, use the current date and time. Always populate the function arguments in English.`;
  
  const transferInstruction = `If the user describes moving money from one account to another (e.g., "Transfer 100 from Card to Cash", "Withdraw 50 from Bank"), set the type to "TRANSFER". Identify the source account in 'fromAccountName' and the destination account in 'toAccountName'. Transfers do NOT have categories.`;

  const categoryInstruction = `For Income and Expense transactions, choose the most appropriate category from this list: [${categoryNames}]. If the user mentions "car" and a "Transport" category exists, use "Transport". If none fit, suggest a new one. Do NOT set a category for TRANSFERS.`;

  const savingsInstruction = goalNames.length > 0 
    ? `If the user is making a deposit to a savings account, you MUST use the "Savings" category (unless it is a direct Transfer between accounts). The user has the following savings goals: [${goalNames}]. If specified, match the goal name.`
    : `If the user mentions saving money, use the "Savings" category.`;

  const examples = `Examples:
  - "Coffee for 3 euros" -> type="EXPENSE", name="Coffee", amount=3, currency="EUR".
  - "Salary 1500 USD" -> type="INCOME", name="Salary", amount=1500, currency="USD".
  - "Перевел 500 рублей с Карты на Наличные" -> type="TRANSFER", name="Transfer to Cash", amount=500, currency="RUB", fromAccountName="Card", toAccountName="Cash".`;

  return `${baseInstruction}\n\n${transferInstruction}\n\n${categoryInstruction}\n\n${savingsInstruction}\n\n${examples}`;
};

//
export const getIconPrompt = (categoryName: string, iconList: string[]): string => {
  return `From the following list of icon names, pick the single best one that represents the category "${categoryName}". Return ONLY the icon name as a single string, exactly as it appears in the list. Do not add any explanation or formatting.\n\nIcon list: ${iconList.join(', ')}`;
};

//
export const getSavingsTipsPrompt = (transactions: any[]): string => {
  return `You are a friendly and encouraging financial advisor. Based on the following list of the user's transactions, provide 3-5 personalized and actionable tips on how they can save money. Format your response as markdown. Start with a brief, positive summary of their spending habits, then list the tips with clear headings and short explanations.\n\nTransactions:\n${JSON.stringify(transactions, null, 2)}`;
};