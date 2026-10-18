import { GameProfile } from '../types/gameProfile';

export const CORE_GENERAL_GAME: GameProfile = {
  id: 'core-general',
  name: 'Core General Campaign',
  description: 'The standard universal tabletop campaign model with storyline branches, acts, and scenario rewards.',
  version: '1.0.0',
  icon: '📜',
  themeColor: '#6366f1', // Indigo
  isBuiltIn: true,
  terminology: {
    questTerm: 'Quest',
    questsTermPlural: 'Quests',
    actTerm: 'Act',
    actsTermPlural: 'Acts',
    tierTerm: 'Tier'
  },
  categories: [
    { id: 'MAIN', label: 'Main Quest', color: 'blue', defaultCodePrefix: 'M', badgeStyle: 'border-blue-500/60 bg-blue-950/40 text-blue-300' },
    { id: 'MAIN_BRANCH', label: 'Main Branch', color: 'cyan', defaultCodePrefix: 'MB', badgeStyle: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300' },
    { id: 'SIDE', label: 'Side Quest', color: 'emerald', defaultCodePrefix: 'S', badgeStyle: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300' },
    { id: 'FACTION', label: 'Faction Quest', color: 'purple', defaultCodePrefix: 'F', badgeStyle: 'border-purple-500/60 bg-purple-950/40 text-purple-300' },
    { id: 'BOSS', label: 'Act Boss', color: 'rose', defaultCodePrefix: 'B', badgeStyle: 'border-rose-500/70 bg-rose-950/40 text-rose-300' },
    { id: 'ACT_TRANSITION', label: 'Act Transition', color: 'amber', defaultCodePrefix: 'ACT_TRANS', badgeStyle: 'border-amber-400/80 bg-amber-950/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]' }
  ],
  rewardResources: [
    { key: 'gold', label: 'Gold', type: 'number', icon: 'Coins', color: 'amber', defaultValue: 0 },
    { key: 'items', label: 'Items', type: 'string_list', icon: 'Package', color: 'blue', defaultValue: [] }
  ],
  customFields: [
    { key: 'flavorText', label: 'Flavor Story Text', type: 'textarea', placeholder: 'Atmospheric narrative scene setting...', section: 'main' },
    { key: 'objectives', label: 'Objectives', type: 'textarea', placeholder: 'Victory and defeat conditions...', section: 'main' },
    { key: 'setupInstructions', label: 'Setup Instructions', type: 'textarea', placeholder: 'Tiles, standees, and initial markers...', section: 'setup' }
  ],
  defaultActCount: 2
};

export const DRAGON_ECLIPSE_GAME: GameProfile = {
  id: 'dragon-eclipse',
  name: 'Dragon Eclipse',
  description: 'Specialized profile for Dragon Eclipse campaign adventures, Mystling bonding, and elemental state mechanics.',
  version: '1.0.0',
  icon: '🐉',
  themeColor: '#10b981', // Emerald
  isBuiltIn: true,
  terminology: {
    questTerm: 'Scenario',
    questsTermPlural: 'Scenarios',
    actTerm: 'Chapter',
    actsTermPlural: 'Chapters',
    tierTerm: 'Tier'
  },
  categories: [
    { id: 'MAIN', label: 'Main Story', color: 'blue', defaultCodePrefix: 'M', badgeStyle: 'border-blue-500/60 bg-blue-950/40 text-blue-300' },
    { id: 'MAIN_BRANCH', label: 'Narrative Branch', color: 'cyan', defaultCodePrefix: 'MB', badgeStyle: 'border-cyan-500/60 bg-cyan-950/40 text-cyan-300' },
    { id: 'SIDE', label: 'Side Exploration', color: 'emerald', defaultCodePrefix: 'S', badgeStyle: 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300' },
    { id: 'FACTION', label: 'Faction Encounter', color: 'purple', defaultCodePrefix: 'F', badgeStyle: 'border-purple-500/60 bg-purple-950/40 text-purple-300' },
    { id: 'BOSS', label: 'Apex Encounter (Boss)', color: 'rose', defaultCodePrefix: 'B', badgeStyle: 'border-rose-500/70 bg-rose-950/40 text-rose-300' },
    { id: 'ACT_TRANSITION', label: 'Chapter Transition', color: 'amber', defaultCodePrefix: 'CH_TRANS', badgeStyle: 'border-amber-400/80 bg-amber-950/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]' }
  ],
  rewardResources: [
    { key: 'gold', label: 'Gold', type: 'number', icon: 'Coins', color: 'amber', defaultValue: 0 },
    { key: 'items', label: 'Cards & Items', type: 'string_list', icon: 'Package', color: 'blue', defaultValue: [] }
  ],
  customFields: [
    { key: 'flavorText', label: 'Story Narrative', type: 'textarea', placeholder: 'Atmospheric narrative scene setting...', section: 'main' },
    { key: 'objectives', label: 'Primary Objectives', type: 'textarea', placeholder: 'Victory conditions and milestones...', section: 'main' },
    { key: 'setupInstructions', label: 'Board & Token Setup', type: 'textarea', placeholder: 'Map tiles, enemy spawns, standees...', section: 'setup' }
  ],
  defaultActCount: 3
};

export const BUILT_IN_GAMES: GameProfile[] = [
  CORE_GENERAL_GAME,
  DRAGON_ECLIPSE_GAME
];

export const DEFAULT_GAME_PROFILE: GameProfile = CORE_GENERAL_GAME;

export function getGameProfileById(id: string, customGames: GameProfile[] = []): GameProfile {
  const found = [...BUILT_IN_GAMES, ...customGames].find((g) => g.id === id);
  return found || DEFAULT_GAME_PROFILE;
}
