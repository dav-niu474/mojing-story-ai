import { create } from 'zustand';
import type { NovelProject, ViewMode, WorldTab, Character, Location, LoreItem, Faction, Outline, Chapter, Material, VersionSnapshot, ChangeProposal, AiMessage, PipelineStep, PipelineStepStatus } from '@/lib/types';

interface AppState {
  // Navigation
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  
  // Project
  currentProject: NovelProject | null;
  setCurrentProject: (project: NovelProject | null) => void;
  projects: NovelProject[];
  setProjects: (projects: NovelProject[]) => void;
  
  // World Building
  worldTab: WorldTab;
  setWorldTab: (tab: WorldTab) => void;
  characters: Character[];
  setCharacters: (chars: Character[]) => void;
  locations: Location[];
  setLocations: (locs: Location[]) => void;
  loreItems: LoreItem[];
  setLoreItems: (items: LoreItem[]) => void;
  factions: Faction[];
  setFactions: (factions: Faction[]) => void;
  
  // Selected items for editing
  selectedCharacter: Character | null;
  setSelectedCharacter: (char: Character | null) => void;
  selectedLocation: Location | null;
  setSelectedLocation: (loc: Location | null) => void;
  selectedLoreItem: LoreItem | null;
  setSelectedLoreItem: (item: LoreItem | null) => void;
  selectedFaction: Faction | null;
  setSelectedFaction: (faction: Faction | null) => void;
  
  // Outline
  outlines: Outline[];
  setOutlines: (outlines: Outline[]) => void;
  selectedOutline: Outline | null;
  setSelectedOutline: (outline: Outline | null) => void;
  
  // Chapters
  chapters: Chapter[];
  setChapters: (chapters: Chapter[]) => void;
  selectedChapter: Chapter | null;
  setSelectedChapter: (chapter: Chapter | null) => void;
  
  // Materials
  materials: Material[];
  setMaterials: (materials: Material[]) => void;
  
  // Versions
  snapshots: VersionSnapshot[];
  setSnapshots: (snapshots: VersionSnapshot[]) => void;
  changes: ChangeProposal[];
  setChanges: (changes: ChangeProposal[]) => void;
  versionTab: 'snapshots' | 'changes';
  setVersionTab: (tab: 'snapshots' | 'changes') => void;
  
  // AI Chat
  aiMessages: AiMessage[];
  addAiMessage: (msg: AiMessage) => void;
  clearAiMessages: () => void;
  aiLoading: boolean;
  setAiLoading: (loading: boolean) => void;
  
  // AI Model
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  
  // UI State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;

  // Pipeline
  pipelineStep: PipelineStep | null;
  setPipelineStep: (step: PipelineStep | null) => void;
  pipelineStatus: Record<string, PipelineStepStatus>;
  setPipelineStatus: (status: Record<string, PipelineStepStatus>) => void;
  oneClickCreating: boolean;
  setOneClickCreating: (creating: boolean) => void;
  oneClickProgress: string;
  setOneClickProgress: (progress: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'projects',
  setCurrentView: (view) => set({ currentView: view }),
  
  // Project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),
  projects: [],
  setProjects: (projects) => set({ projects }),
  
  // World Building
  worldTab: 'characters',
  setWorldTab: (tab) => set({ worldTab: tab }),
  characters: [],
  setCharacters: (chars) => set({ characters: chars }),
  locations: [],
  setLocations: (locs) => set({ locations: locs }),
  loreItems: [],
  setLoreItems: (items) => set({ loreItems: items }),
  factions: [],
  setFactions: (factions) => set({ factions }),
  
  // Selected items
  selectedCharacter: null,
  setSelectedCharacter: (char) => set({ selectedCharacter: char }),
  selectedLocation: null,
  setSelectedLocation: (loc) => set({ selectedLocation: loc }),
  selectedLoreItem: null,
  setSelectedLoreItem: (item) => set({ selectedLoreItem: item }),
  selectedFaction: null,
  setSelectedFaction: (faction) => set({ selectedFaction: faction }),
  
  // Outline
  outlines: [],
  setOutlines: (outlines) => set({ outlines }),
  selectedOutline: null,
  setSelectedOutline: (outline) => set({ selectedOutline: outline }),
  
  // Chapters
  chapters: [],
  setChapters: (chapters) => set({ chapters }),
  selectedChapter: null,
  setSelectedChapter: (chapter) => set({ selectedChapter: chapter }),
  
  // Materials
  materials: [],
  setMaterials: (materials) => set({ materials }),
  
  // Versions
  snapshots: [],
  setSnapshots: (snapshots) => set({ snapshots }),
  changes: [],
  setChanges: (changes) => set({ changes }),
  versionTab: 'snapshots',
  setVersionTab: (tab) => set({ versionTab: tab }),
  
  // AI Chat
  aiMessages: [],
  addAiMessage: (msg) => set((state) => ({ aiMessages: [...state.aiMessages, msg] })),
  clearAiMessages: () => set({ aiMessages: [] }),
  aiLoading: false,
  setAiLoading: (loading) => set({ aiLoading: loading }),
  
  // AI Model - default changed to qwen3.5-122b (deepseek-v4-pro & glm-5.1 currently down)
  selectedModel: 'kimi-k2',
  setSelectedModel: (model) => set({ selectedModel: model }),
  
  // UI State
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Pipeline
  pipelineStep: null,
  setPipelineStep: (step) => set({ pipelineStep: step }),
  pipelineStatus: {},
  setPipelineStatus: (status) => set({ pipelineStatus: status }),
  oneClickCreating: false,
  setOneClickCreating: (creating) => set({ oneClickCreating: creating }),
  oneClickProgress: '',
  setOneClickProgress: (progress) => set({ oneClickProgress: progress }),
}));
