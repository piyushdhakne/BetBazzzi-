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

export async function fetchIPLNewsHeadlines(): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Search for the latest IPL match scores, player injuries, and point table shifts. Return 5-7 short, dramatic headlines (max 80 chars each) that make users want to bet. Focus on recent performance and high-stakes match turns.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim());
    }
    return getFallbackHeadlines();
  } catch (error: any) {
    // Handle quota or throttling errors gracefully
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      console.warn("Gemini Quota Exceeded. Using cached/fallback headlines.");
    } else {
      console.error("Gemini News Error:", error);
    }
    return getFallbackHeadlines();
  }
}

function getFallbackHeadlines(): string[] {
  return [
    "IPL 2024: Massive upset alert in tonight's clash!",
    "Kohli's form hits peak - big odds on RCB today.",
    "Mumbai Indians back in the hunt - watch the spread.",
    "Last ball thriller expected! Betting markets are hot.",
    "In-form bowlers making the difference this week.",
    "Live points table shifting - every run matters now!"
  ];
}
