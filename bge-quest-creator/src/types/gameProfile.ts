export type FieldType = 'text' | 'textarea' | 'number' | 'tag_list' | 'string_list' | 'boolean' | 'select';

export interface GameCustomFieldDef {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: any;
  options?: string[];
  description?: string;
  section?: 'main' | 'setup' | 'rules' | 'sidebar';
}

export interface GameRewardResourceDef {
  key: string;
  label: string;
  type: 'number' | 'string_list';
  icon?: string;
  color?: string;
  defaultValue?: any;
}

export interface GameCategoryDef {
  id: string;
  label: string;
  color: string;
  defaultCodePrefix: string;
  badgeStyle?: string;
}

export interface GameTerminology {
  questTerm: string;
  questsTermPlural: string;
  actTerm: string;
  actsTermPlural: string;
  tierTerm: string;
  campaignTerm?: string;
}

export interface GameProfile {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  themeColor: string;
  isBuiltIn?: boolean;
  terminology: GameTerminology;
  categories: GameCategoryDef[];
  rewardResources: GameRewardResourceDef[];
  customFields?: GameCustomFieldDef[];
  defaultActCount?: number;
}
