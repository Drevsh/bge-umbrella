import { GoogleGenAI } from '@google/genai';

export const GEMINI_TTS_VOICES = [
  { id: 'Algenib', label: 'Algenib — Gravelly, Gritty & Low (Male)' },
  { id: 'Charon', label: 'Charon — Deep, Measured & Solemn (Male)' },
  { id: 'Gacrux', label: 'Gacrux — Mature, Elder & Resonant (Male)' },
  { id: 'Fenrir', label: 'Fenrir — Excitable, Intense & Dramatic (Male)' },
  { id: 'Puck', label: 'Puck — Upbeat, Sprightly & Youthful (Male)' },
  { id: 'Enceladus', label: 'Enceladus — Breathy, Eerie & Whispered' },
  { id: 'Kore', label: 'Kore — Regal, Firm & Commanding (Female)' },
  { id: 'Aoede', label: 'Aoede — Ethereal, Melodic & Mystical (Female)' },
  { id: 'Sulafat', label: 'Sulafat — Warm, Gentle & Storyteller' }
] as const;

export const NARRATOR_STYLES = [
  {
    id: 'dark_fantasy',
    label: 'Dark Fantasy (Solemn & Grave)',
    prompt: 'solemn, grave, dark and weighty delivery, speaking slowly with measured pauses'
  },
  {
    id: 'epic_chronicle',
    label: 'Epic Chronicle (Heroic & Booming)',
    prompt: 'heroic, booming, resonant and triumphant delivery, bold and elevated inflection'
  },
  {
    id: 'hushed_mystery',
    label: 'Hushed Mystery (Whispered & Ominous)',
    prompt: 'whispered, hushed, ominous and suspenseful tone, quiet and cautious delivery with long pauses'
  },
  {
    id: 'urgent_danger',
    label: 'Urgent Danger (Fast & Breathless)',
    prompt: 'urgent, rapid, high-tension and breathless pacing, conveying immediate peril'
  },
  {
    id: 'calm_storyteller',
    label: 'Classic Storyteller (Warm & Articulate)',
    prompt: 'warm, calm, steady and articulate cadence, clear tabletop narration'
  }
] as const;

export interface GenerateTtsOptions {
  apiKey: string;
  text: string;
  voice?: string;
  stylePrompt?: string;
}

/**
 * Calls Gemini 3.8 Flash TTS via @google/genai SDK to generate a studio-grade .wav audio file.
 */
export async function generateQuestAudioWithGemini(
  options: GenerateTtsOptions
): Promise<{ blob: Blob; mimeType: string }> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) {
    throw new Error('Gemini API key is required. Please set your API key in Settings.');
  }

  const textToSynthesize = options.text?.trim();
  if (!textToSynthesize) {
    throw new Error('Quest narration text is empty.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const interaction = await ai.interactions.create({
    model: 'gemini-3.8-flash-tts',
    input: [
      {
        type: 'user_input',
        content: [
          {
            type: 'text',
            text: textToSynthesize,
            annotations: options.stylePrompt
              ? [
                  {
                    type: 'speech_metadata',
                    style: options.stylePrompt
                  }
                ]
              : undefined
          }
        ]
      }
    ],
    response_format: {
      type: 'audio',
      mime_type: 'audio/wav',
      sample_rate: 24000
    },
    generation_config: {
      speech_config: [
        {
          voice: options.voice || 'Fenrir'
        }
      ]
    }
  });

  const base64Audio = interaction.output_audio?.data;
  if (!base64Audio) {
    throw new Error('Gemini TTS did not return audio data in response.');
  }

  // Convert base64 into binary Blob (audio/wav with standard RIFF header)
  const byteChars = atob(base64Audio);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteArray[i] = byteChars.charCodeAt(i);
  }

  const blob = new Blob([byteArray], { type: 'audio/wav' });
  return { blob, mimeType: 'audio/wav' };
}
