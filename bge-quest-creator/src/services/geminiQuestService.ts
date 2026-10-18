import { GoogleGenAI } from '@google/genai';
import { QuestCategory, PrereqLogic, RewardOutcome, QuestVariantOverride } from '../types/campaign';

export interface QuestDraftPromptOptions {
  apiKey: string;
  category: string;
  tier: number;
  act?: number;
  userPrompt?: string;
  parentQuestContext?: {
    code: string;
    title: string;
    flavorText?: string;
    objectives?: string;
    rewardLabel?: string;
  };
  availableTags?: string[];
}

export interface GeneratedQuestDraft {
  title: string;
  codeSuggestion?: string;
  flavorText: string;
  objectives: string;
  setupInstructions: string;
  rewards: Array<{
    label: string;
    isExclusiveChoice: boolean;
    gold: number;
    items: string[];
    grantsStateTags: string[];
  }>;
  variants?: Array<{
    requiredStateTag: string;
    overrideTitle?: string;
    additionalFlavorText: string;
    setupModifications: string;
    rewardModifications?: string;
  }>;
}

export async function generateQuestDraftWithGemini(
  options: QuestDraftPromptOptions
): Promise<GeneratedQuestDraft> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set your API key in Settings.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstructions = `You are a world-class board game narrative and scenario designer for an epic dark-fantasy/high-adventure campaign board game (similar to Gloomhaven, Dragon Eclipse, Sleeping Gods).
Generate a rich, cohesive, and compelling quest scenario.
Respond STRICTLY with valid JSON (no markdown formatting, no code fences, only raw JSON) adhering to this schema:
{
  "title": "string (immersive scenario title)",
  "flavorText": "string (2-4 atmospheric sentences setting the dramatic scene)",
  "objectives": "string (clear victory and defeat conditions)",
  "setupInstructions": "string (board tile layout, enemy spawns, token placement)",
  "rewards": [
    {
      "label": "string (e.g. 'Scenario Victory' or '[Choice A] Burn the Nest')",
      "isExclusiveChoice": false,
      "gold": 25,
      "items": ["Item Name"],
      "grantsStateTags": ["+Tag_Name"]
    }
  ],
  "variants": [
    {
      "requiredStateTag": "+Tag_Name",
      "overrideTitle": "Optional variant title",
      "additionalFlavorText": "Extra narrative injected when this tag is active",
      "setupModifications": "Rules or enemy HP/stat changes when active",
      "rewardModifications": "Bonus loot or consequences"
    }
  ]
}

Important Rules:
- If state tags are created or used, prefix Act-local tags with '+' (e.g. '+Idol_Kept') or campaign-global tags with '++' (e.g. '++Arnak_Saved').
- All tag names must use underscores for spaces (e.g. '+Beast_Tamed').
- Ensure reward choices are meaningful and setup rules are concrete.`;

  let prompt = `Create a new quest scenario.
Category: ${options.category}
Progression Tier: ${options.tier}
Campaign Act: ${options.act || 1}
`;

  if (options.userPrompt?.trim()) {
    prompt += `Designer Prompt/Theme: "${options.userPrompt.trim()}"\n`;
  }

  if (options.parentQuestContext) {
    prompt += `Preceding/Parent Quest:
- Code: ${options.parentQuestContext.code}
- Title: ${options.parentQuestContext.title}
${options.parentQuestContext.rewardLabel ? `- Unlocked via: ${options.parentQuestContext.rewardLabel}\n` : ''}
${options.parentQuestContext.flavorText ? `- Previous Story: "${options.parentQuestContext.flavorText}"\n` : ''}
`;
  }

  if (options.availableTags && options.availableTags.length > 0) {
    prompt += `Existing State Tags available in campaign to weave in or branch from: ${options.availableTags.join(', ')}\n`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${systemInstructions}\n\nTask:\n${prompt}` }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json'
    }
  });

  const responseText = response.text?.trim() || '';
  if (!responseText) {
    throw new Error('Gemini returned an empty response.');
  }

  try {
    // Strip possible markdown code fences if model enclosed them
    const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(cleanJson) as GeneratedQuestDraft;
    return parsed;
  } catch (err: any) {
    console.error('Failed to parse Gemini quest draft JSON:', responseText);
    throw new Error(`Failed to parse AI response as JSON: ${err?.message || err}`);
  }
}
