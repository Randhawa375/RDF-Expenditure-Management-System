
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export const getFinancialInsights = async (transactions: Transaction[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const summary = transactions.map(t => ({
    type: t.type,
    amount: t.amount,
    date: t.date,
    description: t.description,
    remarks: t.remarks || '',
    source: t.source || ''
  }));

  const prompt = `Analyze these financial transactions and provide professional financial advice in English (max 3 sentences) on how to optimize spending and save money for this farm. Return ONLY the text in English. Data: ${JSON.stringify(summary)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, financial insights are currently unavailable.";
  }
};