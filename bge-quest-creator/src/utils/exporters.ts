import Papa from 'papaparse';
import { toPng, toSvg } from 'html-to-image';
import {
  CampaignProjectFile,
  CampaignProjectFileSchema,
  QuestModel,
  CampaignEdge,
  CampaignProjectMetadata
} from '../types/campaign';

export function downloadJsonFile(filename: string, data: object) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCampaignProject(
  metadata: CampaignProjectMetadata,
  quests: Record<string, QuestModel>,
  edges: CampaignEdge[]
): CampaignProjectFile {
  return {
    metadata,
    version: '1.0',
    exportedAt: new Date().toISOString(),
    quests,
    edges
  };
}

export async function parseAndValidateCampaignJson(file: File): Promise<CampaignProjectFile> {
  const text = await file.text();
  const rawJson = JSON.parse(text);
  const validated = CampaignProjectFileSchema.parse(rawJson);
  return validated;
}

export function exportNanDeckCsv(quests: Record<string, QuestModel>): string {
  const rows = Object.values(quests).map((q) => {
    const rewardsStr = q.rewardOutcomes
      .map((r) => `${r.label} [${r.gold}g, items: ${r.items.join(';') || 'none'}, tags: ${r.grantsStateTags.join(';') || 'none'}]`)
      .join(' | ');

    const variantsStr = q.variants
      .map((v) => `[IF ${v.requiredStateTag}]: ${v.overrideTitle ? v.overrideTitle + ' - ' : ''}${v.setupModifications}`)
      .join(' | ');

    const allGrantedTags = q.rewardOutcomes.flatMap((r) => r.grantsStateTags).join('; ');

    return {
      Card_ID: q.code,
      Title: q.title,
      Tier: `Tier ${q.tier}`,
      Category: q.category,
      Prereq_Logic: q.prereqLogic,
      Required_Tag: q.requiredTag || '',
      Flavor_Text: q.flavorText,
      Setup_Instructions: q.setupInstructions,
      Objectives: q.objectives,
      Rewards: rewardsStr,
      Variants: variantsStr,
      Granted_Tags: allGrantedTags,
      Dev_Status: q.devStatus
    };
  });

  return Papa.unparse(rows, { quotes: true });
}

export function downloadCsvFile(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportGraphImage(
  element: HTMLElement,
  filename: string,
  format: 'png' | 'svg' = 'png'
) {
  try {
    const filter = (node: HTMLElement) => {
      // Exclude minimap or controls if desired, or keep all
      return !node.classList?.contains('react-flow__panel');
    };

    if (format === 'svg') {
      const dataUrl = await toSvg(element, { filter, backgroundColor: '#020617' });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filename}.svg`;
      a.click();
    } else {
      const dataUrl = await toPng(element, {
        filter,
        backgroundColor: '#020617',
        pixelRatio: 2 // High resolution Retina quality
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${filename}.png`;
      a.click();
    }
  } catch (err) {
    console.error('Failed to export graph image:', err);
    throw err;
  }
}
