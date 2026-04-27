// AI网文创作平台 - 核心类型定义

export interface NovelProject {
  id: string;
  title: string;
  description: string | null;
  genre: string | null;
  subGenre: string | null;
  coverImage: string | null;
  status: string;
  wordCount: number;
  targetWords: number | null;
  setting: string | null;
  premise: string | null;
  writingStyle: string | null;
  createdAt: string;
  updatedAt: string;
  characters?: Character[];
  locations?: Location[];
  loreItems?: LoreItem[];
  factions?: Faction[];
  outlines?: Outline[];
  chapters?: Chapter[];
  materials?: Material[];
  _count?: {
    characters: number;
    chapters: number;
    locations: number;
    loreItems: number;
    factions: number;
  };
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: string | null;
  title: string | null;
  age: string | null;
  gender: string | null;
  description: string | null;
  personality: string | null;
  background: string | null;
  abilities: string | null;
  relationships: string | null;
  motivation: string | null;
  arc: string | null;
  tags: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  projectId: string;
  name: string;
  category: string | null;
  description: string | null;
  history: string | null;
  features: string | null;
  atmosphere: string | null;
  tags: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoreItem {
  id: string;
  projectId: string;
  name: string;
  category: string | null;
  description: string | null;
  details: string | null;
  constraints: string | null;
  tags: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Faction {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  goals: string | null;
  members: string | null;
  territory: string | null;
  power: string | null;
  tags: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Outline {
  id: string;
  projectId: string;
  title: string;
  type: string;
  description: string | null;
  keyEvents: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  chapters?: Chapter[];
  _count?: { chapters: number };
}

export interface Chapter {
  id: string;
  projectId: string;
  outlineId: string | null;
  title: string;
  summary: string | null;
  beats: string | null;
  content: string | null;
  wordCount: number;
  status: string;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  outline?: Outline;
  versions?: ChapterVersion[];
}

export interface ChapterVersion {
  id: string;
  chapterId: string;
  content: string;
  wordCount: number;
  label: string | null;
  changeNote: string | null;
  source: string;
  createdAt: string;
}

export interface Material {
  id: string;
  projectId: string;
  title: string;
  category: string | null;
  content: string | null;
  source: string | null;
  tags: string | null;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VersionSnapshot {
  id: string;
  projectId: string;
  label: string;
  type: string;
  data: string;
  note: string | null;
  createdAt: string;
}

export interface ChangeProposal {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  type: string;
  targetScope: string | null;
  impact: string | null;
  plan: string | null;
  status: string;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export type ViewMode = 'projects' | 'dashboard' | 'worldbuilding' | 'outline' | 'writing' | 'materials' | 'versions' | 'ai-assistant';
export type WorldTab = 'characters' | 'locations' | 'lore' | 'factions';
