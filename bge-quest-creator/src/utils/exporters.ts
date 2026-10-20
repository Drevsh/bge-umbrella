import Papa from 'papaparse';
import { toPng, toSvg } from 'html-to-image';
import {
  CampaignProjectFile,
  CampaignProjectFileSchema,
  QuestModel,
  CampaignEdge,
  CampaignProjectMetadata,
  CampaignAct
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
  edges: CampaignEdge[],
  acts?: CampaignAct[],
  gameId?: string
): CampaignProjectFile {
  return {
    metadata: {
      ...metadata,
      gameId: gameId || metadata.gameId
    },
    version: '1.0',
    exportedAt: new Date().toISOString(),
    gameId: gameId || metadata.gameId,
    acts,
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
      .map((r) => {
        const effects: string[] = [];
        if (r.gold) effects.push(`${r.gold}g`);
        if (r.damage) effects.push(r.damage > 0 ? `+${r.damage} Dmg` : `${r.damage} Dmg`);
        if (r.fatigue) effects.push(r.fatigue > 0 ? `+${r.fatigue} Fatigue` : `${r.fatigue} Fatigue`);
        if (r.energy) effects.push(r.energy > 0 ? `+${r.energy} Energy` : `${r.energy} Energy`);
        if (r.essence) effects.push(r.essence > 0 ? `+${r.essence} Essence` : `${r.essence} Essence`);
        if (r.timeAdvance) effects.push(`+${r.timeAdvance} Time`);
        if (r.items && r.items.length > 0) effects.push(`items: ${r.items.join(';')}`);
        if (r.grantsStateTags && r.grantsStateTags.length > 0) effects.push(`tags: ${r.grantsStateTags.join(';')}`);
        return `${r.label} [${effects.join(', ')}]`;
      })
      .join(' | ');

    const variantsStr = q.variants
      .map((v) => `[IF ${v.requiredStateTag}]: ${v.overrideTitle ? v.overrideTitle + ' - ' : ''}${v.setupModifications}${v.rewardModifications ? ' | Rewards: ' + v.rewardModifications : ''}`)
      .join(' | ');

    const allGrantedTags = q.rewardOutcomes.flatMap((r) => r.grantsStateTags).join('; ');

    // Dragon Eclipse Skill Test format (Rulebook p. 11)
    let skillTestStr = '';
    if (q.testConfig) {
      const outcomesStr = q.testConfig.outcomes
        .map((o) => `[${o.rangeLabel}] ${o.title} (${o.type})${o.narrative ? ': ' + o.narrative : ''}`)
        .join(' | ');
      skillTestStr = `${q.testConfig.testName}${q.testConfig.modifiersPrompt ? ' (Mod: ' + q.testConfig.modifiersPrompt + ')' : ''} => ${outcomesStr}`;
    }

    // World Exploration Stage format
    let explorationStr = '';
    if (q.explorationConfig) {
      const slotsStr = (q.explorationConfig.eventSlots || [])
        .map((s) => `≤${s.triggerAtRemaining} Time: ${s.title}${s.grantsStateTag ? ' [' + s.grantsStateTag + ']' : ''}`)
        .join('; ');
      explorationStr = `Track: ${q.explorationConfig.trackLength} units | Milestones: ${slotsStr}${q.explorationConfig.scenarioEndQuestId ? ' | End: ' + q.explorationConfig.scenarioEndQuestId : ''}`;
    }

    return {
      Card_ID: q.code,
      Title: q.title,
      Act: `Act ${q.act || 1}`,
      Tier: `Tier ${q.tier}`,
      Category: q.category,
      Prereq_Logic: q.prereqLogic,
      Required_Tag: q.requiredTag || '',
      Flavor_Text: q.flavorText,
      Setup_Instructions: q.setupInstructions,
      Objectives: q.objectives,
      Time_Cost: q.timeAdvance || 0,
      Skill_Test: skillTestStr,
      Exploration_Details: explorationStr,
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
