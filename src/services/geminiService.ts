/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export interface SuggestedQuestion {
  question: string;
  options: string[];
  multiplier: number;
}

export async function suggestIPLQuestion(): Promise<SuggestedQuestion | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Search for the latest live IPL match status. Suggest ONE live betting prediction question that looks very 'easy' or 'attractive' to a casual user, but is statistically unlikely to occur given the current match momentum (favoring the admin/bookmaker). The question should entice users to bet heavily on a specific outcome, thinking it is a 'sure win', while the actual hidden probability is low (High Risk, Low probability). If no live match is found, suggest a general but tricky pre-match style question like 'Total ducks in the match' or 'Will there be a Super Over?'. Return exactly ONE question with 2-4 options and a multiplier between 2.0 and 12.0.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            multiplier: { type: Type.NUMBER }
          },
          required: ["question", "options", "multiplier"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as SuggestedQuestion;
    }
    return null;
  } catch (error) {
    console.error("AI Suggested Question Error:", error);
    return null;
  }
}

export async function getLiveIPLUpdate(): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Check current IPL scores. Give a very brief (max 15 words) high-energy update. Highlight extreme possibilities or dramatic match turns that create big betting opportunities. Make it sound urgent and exciting for a gambling app.",
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text?.trim() || "Live IPL action heats up! Big winnings ahead.";
  } catch {
    return "Massive multipliers live now! Check predictions.";
  }
}
