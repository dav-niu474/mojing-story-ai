// API helper functions for the frontend

const BASE = '/api';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export const api = {
  // Projects
  getProjects: () => apiFetch<any[]>('/projects'),
  getProject: (id: string) => apiFetch<any>(`/projects/${id}`),
  createProject: (data: any) => apiFetch<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: any) => apiFetch<any>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) => apiFetch(`/projects/${id}`, { method: 'DELETE' }),

  // Characters
  getCharacters: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/characters`),
  createCharacter: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/characters`, { method: 'POST', body: JSON.stringify(data) }),
  updateCharacter: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/characters`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteCharacter: (projectId: string, id: string) => apiFetch(`/projects/${projectId}/characters`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Locations
  getLocations: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/locations`),
  createLocation: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/locations`, { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/locations`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteLocation: (projectId: string, id: string) => apiFetch(`/projects/${projectId}/locations`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Lore
  getLoreItems: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/lore`),
  createLoreItem: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/lore`, { method: 'POST', body: JSON.stringify(data) }),
  updateLoreItem: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/lore`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteLoreItem: (projectId: string, id: string) => apiFetch(`/projects/${projectId}/lore`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Factions
  getFactions: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/factions`),
  createFaction: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/factions`, { method: 'POST', body: JSON.stringify(data) }),
  updateFaction: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/factions`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteFaction: (projectId: string, id: string) => apiFetch(`/projects/${projectId}/factions`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Outlines
  getOutlines: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/outlines`),
  createOutline: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/outlines`, { method: 'POST', body: JSON.stringify(data) }),
  updateOutline: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/outlines`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteOutline: (projectId: string, id: string) => apiFetch(`/projects/${projectId}/outlines`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Chapters
  getChapters: (projectId: string, outlineId?: string) => {
    const params = outlineId ? `?outlineId=${outlineId}` : '';
    return apiFetch<any[]>(`/projects/${projectId}/chapters${params}`);
  },
  createChapter: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/chapters`, { method: 'POST', body: JSON.stringify(data) }),
  updateChapter: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/chapters`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteChapter: (projectId: string, id: string) => apiFetch(`/projects/${projectId}/chapters`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Chapter Versions
  getChapterVersions: (chapterId: string) => apiFetch<any[]>(`/chapters/${chapterId}/versions`),
  createChapterVersion: (chapterId: string, data?: any) => apiFetch<any>(`/chapters/${chapterId}/versions`, { method: 'POST', body: JSON.stringify(data || {}) }),

  // Materials
  getMaterials: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/materials`),
  createMaterial: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/materials`, { method: 'POST', body: JSON.stringify(data) }),
  updateMaterial: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/materials`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
  deleteMaterial: (projectId: string, id: string) => apiFetch(`/projects/${projectId}/materials`, { method: 'DELETE', body: JSON.stringify({ id }) }),

  // Snapshots
  getSnapshots: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/snapshots`),
  createSnapshot: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/snapshots`, { method: 'POST', body: JSON.stringify(data) }),
  restoreSnapshot: (projectId: string, snapshotId: string) => apiFetch(`/projects/${projectId}/snapshots`, { method: 'POST', body: JSON.stringify({ action: 'restore', snapshotId }) }),
  deleteSnapshot: (projectId: string, snapshotId: string) => apiFetch(`/projects/${projectId}/snapshots`, { method: 'DELETE', body: JSON.stringify({ id: snapshotId }) }),

  // Change Proposals
  getChanges: (projectId: string) => apiFetch<any[]>(`/projects/${projectId}/changes`),
  createChange: (projectId: string, data: any) => apiFetch<any>(`/projects/${projectId}/changes`, { method: 'POST', body: JSON.stringify(data) }),
  updateChange: (projectId: string, id: string, data: any) => apiFetch<any>(`/projects/${projectId}/changes`, { method: 'PUT', body: JSON.stringify({ id, ...data }) }),

  // AI
  aiChat: (projectId: string, message: string, contextType: string, conversationId?: string) =>
    apiFetch<any>('/ai/chat', { method: 'POST', body: JSON.stringify({ projectId, message, contextType, conversationId }) }),
  aiGenerate: (projectId: string, type: string, params: any) =>
    apiFetch<{result: string}>('/ai/generate', { method: 'POST', body: JSON.stringify({ projectId, type, params }) }),
};
