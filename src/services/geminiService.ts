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
  const prompt = "Recommend ONE live IPL betting prediction question that looks very 'easy' or 'attractive' to a casual user, but is statistically unlikely to occur given typical match scenarios. The question should entice users to bet heavily on a specific outcome, thinking it is a 'sure win', while the actual hidden probability is low (High Risk, Low probability). Suggest a tricky pre-match style question like 'Total ducks in the match' or 'Will there be a Super Over?'. Return exactly ONE question with 2-4 options and a multiplier between 2.0 and 12.0.";
  
  const callGemini = async (useTools: boolean) => {
    return await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: useTools ? `Search for the latest live IPL match status and ${prompt}` : prompt,
      config: {
        tools: useTools ? [{ googleSearch: {} }] : undefined,
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
  };

  try {
    let response;
    try {
      response = await callGemini(true);
    } catch (err: any) {
      if (err?.message?.includes('403') || err?.status === 403) {
        console.warn("Gemini Search tool permission denied, retrying without tools...");
        response = await callGemini(false);
      } else if (err?.message?.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
        console.warn("Gemini Quota Exceeded. Using fallback question.");
        return getFallbackQuestion();
      } else {
        throw err;
      }
    }

    const text = response.text;
    if (text) {
      return JSON.parse(text) as SuggestedQuestion;
    }
    return getFallbackQuestion();
  } catch (error: any) {
    if (error?.message?.includes('RESOURCE_EXHAUSTED') || error?.status === 429) {
      return getFallbackQuestion();
    }
    console.error("AI Suggested Question Error:", error);
    return getFallbackQuestion();
  }
}

function getFallbackQuestion(): SuggestedQuestion {
  const fallbacks: SuggestedQuestion[] = [
    {
      question: "Will there be more than 1.5 ducks in the match?",
      options: ["Yes", "No"],
      multiplier: 3.5
    },
    {
      question: "Will any player score a century today?",
      options: ["Yes", "No"],
      multiplier: 4.2
    },
    {
      question: "Will the match result be decided in a Super Over?",
      options: ["Yes", "No"],
      multiplier: 12.0
    },
    {
      question: "Total sixes in the first 6 overs to be over 3.5?",
      options: ["Over", "Under"],
      multiplier: 2.1
    }
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export async function fetchIPLNewsHeadlines(): Promise<string[]> {
  const prompt = "Provide 5-7 short, dramatic IPL headlines (max 80 chars each) that make users want to bet. Focus on recent performance and high-stakes match turns.";
  
  const callGemini = async (useTools: boolean) => {
    return await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: useTools ? `Search for the latest IPL match scores, player injuries, and point table shifts. Then ${prompt}` : prompt,
      config: {
        tools: useTools ? [{ googleSearch: {} }] : undefined,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
  };

  try {
    let response;
    try {
      response = await callGemini(true);
    } catch (err: any) {
      if (err?.message?.includes('403') || err?.status === 403) {
        console.warn("Gemini Search tool permission denied (News), retrying without tools...");
        response = await callGemini(false);
      } else {
        throw err;
      }
    }

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
