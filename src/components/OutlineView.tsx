'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { Outline, Chapter } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Trash2,
  GripVertical,
  BookOpen,
  ListTree,
  FileText,
  MoreHorizontal,
  Loader2,
  Pencil,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Beat type ────────────────────────────────────────────────────
interface Beat {
  title: string;
  description: string;
  characters: string[];
  location: string;
  mood: string;
}

// ─── Status helpers ───────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  planned: { label: '计划中', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  drafting: { label: '草稿', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  revision: { label: '修订中', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  complete: { label: '已完成', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

const OUTLINE_TYPE_MAP: Record<string, { label: string; icon: typeof ListTree }> = {
  volume: { label: '卷', icon: BookOpen },
  act: { label: '幕', icon: ListTree },
  arc: { label: '线索', icon: FileText },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.planned;
  return (
    <Badge variant="outline" className={`text-xs ${s.color}`}>
      {s.label}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────
export function OutlineView() {
  const {
    currentProject,
    outlines,
    setOutlines,
    selectedOutline,
    setSelectedOutline,
    chapters,
    setChapters,
  } = useAppStore();

  const projectId = currentProject?.id;

  // Local state
  const [expandedOutlines, setExpandedOutlines] = useState<Set<string>>(new Set());
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showNewOutlineDialog, setShowNewOutlineDialog] = useState(false);
  const [newOutlineType, setNewOutlineType] = useState<string>('act');
  const [newOutlineTitle, setNewOutlineTitle] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiBeatsGenerating, setAiBeatsGenerating] = useState(false);
  const [aiChapterGenerating, setAiChapterGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for outline editing
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editKeyEvents, setEditKeyEvents] = useState('');

  // Beats editing
  const [beats, setBeats] = useState<Beat[]>([]);
  const [showAddBeatForm, setShowAddBeatForm] = useState(false);
  const [newBeat, setNewBeat] = useState<Beat>({ title: '', description: '', characters: [], location: '', mood: '' });

  // New chapter dialog
  const [showNewChapterDialog, setShowNewChapterDialog] = useState(false);
  const [newChapterOutlineId, setNewChapterOutlineId] = useState<string>('');
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // ─── Data loading ─────────────────────────────────────────────
  const loadOutlines = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await api.getOutlines(projectId);
      setOutlines(data);
    } catch {
      toast({ title: '加载大纲失败' });
    }
  }, [projectId, setOutlines]);

  const loadChapters = useCallback(async () => {
    if (!projectId) return;
    try {
      const data = await api.getChapters(projectId);
      setChapters(data);
    } catch {
      toast({ title: '加载章节失败' });
    }
  }, [projectId, setChapters]);

  useEffect(() => {
    loadOutlines();
    loadChapters();
  }, [loadOutlines, loadChapters]);

  // Sync form state when selection changes
  useEffect(() => {
    if (selectedOutline) {
      setEditTitle(selectedOutline.title);
      setEditType(selectedOutline.type);
      setEditDescription(selectedOutline.description || '');
      setEditKeyEvents(selectedOutline.keyEvents || '');
    }
  }, [selectedOutline]);

  // Sync beats when chapter changes
  useEffect(() => {
    const chapter = chapters.find(c => c.id === selectedChapterId);
    if (chapter?.beats) {
      try {
        const parsed = JSON.parse(chapter.beats);
        setBeats(Array.isArray(parsed) ? parsed : []);
      } catch {
        setBeats([]);
      }
    } else {
      setBeats([]);
    }
  }, [selectedChapterId, chapters]);

  // ─── Outline CRUD ─────────────────────────────────────────────
  const handleCreateOutline = async () => {
    if (!projectId || !newOutlineTitle.trim()) return;
    try {
      const outline = await api.createOutline(projectId, {
        title: newOutlineTitle.trim(),
        type: newOutlineType,
      });
      setOutlines([...outlines, outline]);
      setShowNewOutlineDialog(false);
      setNewOutlineTitle('');
      toast({ title: '大纲已创建' });
    } catch {
      toast({ title: '创建失败' });
    }
  };

  const handleSaveOutline = async () => {
    if (!projectId || !selectedOutline) return;
    setSaving(true);
    try {
      const updated = await api.updateOutline(projectId, selectedOutline.id, {
        title: editTitle,
        type: editType,
        description: editDescription,
        keyEvents: editKeyEvents,
      });
      setOutlines(outlines.map(o => (o.id === updated.id ? updated : o)));
      setSelectedOutline(updated);
      toast({ title: '大纲已保存' });
    } catch {
      toast({ title: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOutline = async (outlineId: string) => {
    if (!projectId) return;
    try {
      await api.deleteOutline(projectId, outlineId);
      setOutlines(outlines.filter(o => o.id !== outlineId));
      if (selectedOutline?.id === outlineId) {
        setSelectedOutline(null);
        setSelectedChapterId(null);
      }
      loadChapters();
      toast({ title: '大纲已删除' });
    } catch {
      toast({ title: '删除失败' });
    }
  };

  // ─── AI Generate Outline ──────────────────────────────────────
  const handleAiGenerateOutline = async () => {
    if (!projectId) return;
    setAiGenerating(true);
    try {
      const result = await api.aiGenerate(projectId, 'outline', {
        instruction: `请根据项目设定生成大纲，类型：${OUTLINE_TYPE_MAP[editType]?.label || '幕'}`,
      });
      const raw = typeof result === 'string' ? result : JSON.stringify(result);
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title) setEditTitle(parsed.title);
          if (parsed.type) setEditType(parsed.type);
          if (parsed.description) setEditDescription(parsed.description);
          if (parsed.keyEvents) {
            const events = Array.isArray(parsed.keyEvents)
              ? parsed.keyEvents.join('\n')
              : parsed.keyEvents;
            setEditKeyEvents(events);
          }
        }
      } catch {
        setEditDescription(raw);
      }
      toast({ title: 'AI大纲已生成，请查看并修改' });
    } catch {
      toast({ title: 'AI生成失败' });
    } finally {
      setAiGenerating(false);
    }
  };

  // ─── Chapter CRUD ─────────────────────────────────────────────
  const handleCreateChapter = async () => {
    if (!projectId || !newChapterTitle.trim() || !newChapterOutlineId) return;
    try {
      const maxSort = chapters
        .filter(c => c.outlineId === newChapterOutlineId)
        .reduce((max, c) => Math.max(max, c.sortOrder), -1);
      const chapter = await api.createChapter(projectId, {
        title: newChapterTitle.trim(),
        outlineId: newChapterOutlineId,
        sortOrder: maxSort + 1,
        status: 'planned',
      });
      setChapters([...chapters, chapter]);
      setShowNewChapterDialog(false);
      setNewChapterTitle('');
      toast({ title: '章节已创建' });
    } catch {
      toast({ title: '创建章节失败' });
    }
  };

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    if (!projectId) return;
    const outlineChapters = chapters
      .filter(c => {
        const ch = chapters.find(x => x.id === chapterId);
        return ch && c.outlineId === ch.outlineId;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = outlineChapters.findIndex(c => c.id === chapterId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === outlineChapters.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const chapterA = outlineChapters[idx];
    const chapterB = outlineChapters[swapIdx];
    try {
      await api.updateChapter(projectId, chapterA.id, { sortOrder: chapterB.sortOrder });
      await api.updateChapter(projectId, chapterB.id, { sortOrder: chapterA.sortOrder });
      await loadChapters();
    } catch {
      toast({ title: '排序失败' });
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!projectId) return;
    try {
      await api.deleteChapter(projectId, chapterId);
      setChapters(chapters.filter(c => c.id !== chapterId));
      if (selectedChapterId === chapterId) setSelectedChapterId(null);
      toast({ title: '章节已删除' });
    } catch {
      toast({ title: '删除失败' });
    }
  };

  // ─── AI Generate Beats ────────────────────────────────────────
  const handleAiGenerateBeats = async () => {
    if (!projectId || !selectedChapterId) return;
    const chapter = chapters.find(c => c.id === selectedChapterId);
    if (!chapter) return;
    setAiBeatsGenerating(true);
    try {
      const result = await api.aiGenerate(projectId, 'beats', {
        title: chapter.title,
        summary: chapter.summary || '',
        outlineTitle: selectedOutline?.title || '',
      });
      const raw = typeof result === 'string' ? result : JSON.stringify(result);
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const newBeats: Beat[] = parsed.map((b: Record<string, unknown>) => ({
              title: String(b.title || ''),
              description: String(b.description || ''),
              characters: Array.isArray(b.characters) ? b.characters.map(String) : [],
              location: String(b.location || ''),
              mood: String(b.mood || ''),
            }));
            setBeats([...beats, ...newBeats]);
            await api.updateChapter(projectId, selectedChapterId, {
              beats: JSON.stringify([...beats, ...newBeats]),
            });
            await loadChapters();
            toast({ title: 'AI节拍已生成' });
            return;
          }
        }
      } catch {
        // fallback
      }
      toast({ title: 'AI生成节拍格式异常，请重试' });
    } catch {
      toast({ title: 'AI生成失败' });
    } finally {
      setAiBeatsGenerating(false);
    }
  };

  // ─── AI Generate Chapter Outline ──────────────────────────────
  const handleAiChapterOutline = async (chapterId: string) => {
    if (!projectId) return;
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    setAiChapterGenerating(true);
    try {
      const result = await api.aiGenerate(projectId, 'beats', {
        title: chapter.title,
        summary: chapter.summary || '',
        outlineTitle: selectedOutline?.title || '',
        instruction: '为该章节生成详细的场景节拍大纲',
      });
      const raw = typeof result === 'string' ? result : JSON.stringify(result);
      try {
        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const generatedBeats: Beat[] = parsed.map((b: Record<string, unknown>) => ({
              title: String(b.title || ''),
              description: String(b.description || ''),
              characters: Array.isArray(b.characters) ? b.characters.map(String) : [],
              location: String(b.location || ''),
              mood: String(b.mood || ''),
            }));
            await api.updateChapter(projectId, chapterId, {
              beats: JSON.stringify(generatedBeats),
            });
            await loadChapters();
            toast({ title: '章节大纲已生成' });
            return;
          }
        }
      } catch {
        // fallback
      }
      toast({ title: '生成格式异常' });
    } catch {
      toast({ title: 'AI生成失败' });
    } finally {
      setAiChapterGenerating(false);
    }
  };

  // ─── Beat operations ──────────────────────────────────────────
  const handleAddBeat = async () => {
    if (!projectId || !selectedChapterId) return;
    const newBeats = [...beats, { ...newBeat, characters: newBeat.characters.length > 0 ? newBeat.characters : [] }];
    setBeats(newBeats);
    setShowAddBeatForm(false);
    setNewBeat({ title: '', description: '', characters: [], location: '', mood: '' });
    try {
      await api.updateChapter(projectId, selectedChapterId, {
        beats: JSON.stringify(newBeats),
      });
      await loadChapters();
    } catch {
      toast({ title: '保存节拍失败' });
    }
  };

  const handleRemoveBeat = async (index: number) => {
    if (!projectId || !selectedChapterId) return;
    const newBeats = beats.filter((_, i) => i !== index);
    setBeats(newBeats);
    try {
      await api.updateChapter(projectId, selectedChapterId, {
        beats: JSON.stringify(newBeats),
      });
      await loadChapters();
    } catch {
      toast({ title: '保存失败' });
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpandedOutlines(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getOutlineChapters = (outlineId: string) =>
    chapters
      .filter(c => c.outlineId === outlineId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  // ─── Render ───────────────────────────────────────────────────
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-muted-foreground">
        请先选择或创建一个项目
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-[calc(100vh-8rem)]">
      {/* ── Left Panel: Outline Tree ── */}
      <div className="w-full lg:w-1/3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">大纲结构</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="size-4 mr-1" /> 新建大纲
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => { setNewOutlineType('volume'); setShowNewOutlineDialog(true); }}>
                <BookOpen className="size-4 mr-2" /> 卷
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewOutlineType('act'); setShowNewOutlineDialog(true); }}>
                <ListTree className="size-4 mr-2" /> 幕
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setNewOutlineType('arc'); setShowNewOutlineDialog(true); }}>
                <FileText className="size-4 mr-2" /> 线索
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <ScrollArea className="flex-1 max-h-[calc(100vh-14rem)]">
          <div className="flex flex-col gap-2 pr-2">
            {outlines.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                暂无大纲，点击上方按钮创建
              </div>
            )}
            {outlines.map(outline => {
              const isExpanded = expandedOutlines.has(outline.id);
              const isSelected = selectedOutline?.id === outline.id;
              const outlineChapters = getOutlineChapters(outline.id);
              const TypeIcon = OUTLINE_TYPE_MAP[outline.type]?.icon || ListTree;
              const typeLabel = OUTLINE_TYPE_MAP[outline.type]?.label || outline.type;

              return (
                <Collapsible
                  key={outline.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(outline.id)}
                >
                  <Card
                    className={`cursor-pointer transition-colors py-3 gap-3 ${
                      isSelected ? 'ring-2 ring-amber-300 bg-amber-50/50' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setSelectedOutline(outline);
                      setSelectedChapterId(null);
                    }}
                  >
                    <CardHeader className="p-3 pb-0">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                          <TypeIcon className="size-4 text-amber-600" />
                          <CardTitle className="text-sm font-medium flex-1">
                            {outline.title}
                          </CardTitle>
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            {typeLabel}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {outlineChapters.length} 章
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="size-6">
                                <MoreHorizontal className="size-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteOutline(outline.id);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="size-4 mr-2" /> 删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="p-3 pt-1">
                        {outline.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {outline.description}
                          </p>
                        )}
                        <div className="flex flex-col gap-1">
                          {outlineChapters.map(ch => (
                            <div
                              key={ch.id}
                              className={`flex items-center gap-2 p-2 rounded-md text-sm cursor-pointer transition-colors ${
                                selectedChapterId === ch.id
                                  ? 'bg-amber-100/80 text-amber-900'
                                  : 'hover:bg-muted/60'
                              }`}
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedChapterId(ch.id);
                              }}
                            >
                              <GripVertical className="size-3 text-muted-foreground/50" />
                              <span className="flex-1 truncate">{ch.title}</span>
                              <StatusBadge status={ch.status} />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {ch.wordCount}字
                              </span>
                              <div className="flex gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5"
                                  onClick={e => { e.stopPropagation(); handleMoveChapter(ch.id, 'up'); }}
                                  title="上移"
                                >
                                  <ChevronUp className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-5"
                                  onClick={e => { e.stopPropagation(); handleMoveChapter(ch.id, 'down'); }}
                                  title="下移"
                                >
                                  <ChevronDown className="size-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs text-muted-foreground"
                            onClick={e => {
                              e.stopPropagation();
                              setNewChapterOutlineId(outline.id);
                              setShowNewChapterDialog(true);
                            }}
                          >
                            <Plus className="size-3 mr-1" /> 添加章节
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* ── Right Panel: Detail / Beats ── */}
      <div className="w-full lg:w-2/3 flex flex-col gap-3">
        {!selectedOutline && !selectedChapterId && (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-muted-foreground gap-3">
            <ListTree className="size-12 opacity-30" />
            <p>选择左侧大纲查看详情，或选择章节查看节拍</p>
          </div>
        )}

        {/* Outline Detail */}
        {selectedOutline && !selectedChapterId && (
          <Card className="flex-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {OUTLINE_TYPE_MAP[selectedOutline.type]?.icon && (
                    <span className="text-amber-600">
                      {(() => { const I = OUTLINE_TYPE_MAP[selectedOutline.type].icon; return <I className="size-5" />; })()}
                    </span>
                  )}
                  大纲详情
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiGenerateOutline}
                    disabled={aiGenerating}
                  >
                    {aiGenerating ? (
                      <Loader2 className="size-4 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="size-4 mr-1" />
                    )}
                    AI一键生成大纲
                  </Button>
                  <Button size="sm" onClick={handleSaveOutline} disabled={saving}>
                    {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : null}
                    保存
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">标题</label>
                  <Input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="大纲标题"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">类型</label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">卷</SelectItem>
                      <SelectItem value="act">幕</SelectItem>
                      <SelectItem value="arc">线索</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">描述</label>
                <Textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="本卷/幕的概述..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">关键事件（每行一个）</label>
                <Textarea
                  value={editKeyEvents}
                  onChange={e => setEditKeyEvents(e.target.value)}
                  placeholder={"主角觉醒\n第一次战斗\n获得传承"}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chapter Beats View */}
        {selectedChapter && (
          <Card className="flex-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Pencil className="size-5 text-amber-600" />
                  {selectedChapter.title}
                  <StatusBadge status={selectedChapter.status} />
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiGenerateBeats}
                    disabled={aiBeatsGenerating}
                  >
                    {aiBeatsGenerating ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
                    AI生成节拍
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiChapterOutline(selectedChapter.id)}
                    disabled={aiChapterGenerating}
                  >
                    {aiChapterGenerating ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
                    AI生成章节大纲
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedChapterId(null)}>
                    返回大纲
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {selectedChapter.summary && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <span className="text-xs font-medium text-muted-foreground">章节概要：</span>
                  <p className="text-sm mt-1">{selectedChapter.summary}</p>
                </div>
              )}

              <Separator className="my-3" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">场景节拍</h3>
                  <Button variant="outline" size="sm" onClick={() => setShowAddBeatForm(true)}>
                    <Plus className="size-4 mr-1" /> 添加节拍
                  </Button>
                </div>

                {beats.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-6">
                    暂无节拍，点击"添加节拍"或"AI生成节拍"
                  </div>
                )}

                <ScrollArea className="max-h-[calc(100vh-28rem)]">
                  <div className="flex flex-col gap-3 pr-2">
                    {beats.map((beat, index) => (
                      <Card key={index} className="py-3 gap-2">
                        <CardHeader className="p-3 pb-0">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <span className="inline-flex items-center justify-center size-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                                {index + 1}
                              </span>
                              {beat.title || `节拍 ${index + 1}`}
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive"
                              onClick={() => handleRemoveBeat(index)}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          {beat.description && (
                            <p className="text-sm text-muted-foreground mb-2">{beat.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {beat.characters?.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                👤 {beat.characters.join('、')}
                              </Badge>
                            )}
                            {beat.location && (
                              <Badge variant="secondary" className="text-xs">
                                📍 {beat.location}
                              </Badge>
                            )}
                            {beat.mood && (
                              <Badge variant="secondary" className="text-xs">
                                🎭 {beat.mood}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── New Outline Dialog ── */}
      <Dialog open={showNewOutlineDialog} onOpenChange={setShowNewOutlineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建{OUTLINE_TYPE_MAP[newOutlineType]?.label || '大纲'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <Select value={newOutlineType} onValueChange={setNewOutlineType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">卷</SelectItem>
                  <SelectItem value="act">幕</SelectItem>
                  <SelectItem value="arc">线索</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">标题</label>
              <Input
                value={newOutlineTitle}
                onChange={e => setNewOutlineTitle(e.target.value)}
                placeholder={`输入${OUTLINE_TYPE_MAP[newOutlineType]?.label || '大纲'}标题`}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateOutline(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewOutlineDialog(false)}>取消</Button>
            <Button onClick={handleCreateOutline} disabled={!newOutlineTitle.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Chapter Dialog ── */}
      <Dialog open={showNewChapterDialog} onOpenChange={setShowNewChapterDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加章节</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">章节标题</label>
              <Input
                value={newChapterTitle}
                onChange={e => setNewChapterTitle(e.target.value)}
                placeholder="输入章节标题"
                onKeyDown={e => { if (e.key === 'Enter') handleCreateChapter(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChapterDialog(false)}>取消</Button>
            <Button onClick={handleCreateChapter} disabled={!newChapterTitle.trim()}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Beat Dialog ── */}
      <Dialog open={showAddBeatForm} onOpenChange={setShowAddBeatForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>添加场景节拍</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">节拍标题</label>
              <Input value={newBeat.title} onChange={e => setNewBeat({ ...newBeat, title: e.target.value })} placeholder="节拍标题" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea value={newBeat.description} onChange={e => setNewBeat({ ...newBeat, description: e.target.value })} placeholder="节拍描述" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">角色（逗号分隔）</label>
                <Input
                  value={newBeat.characters.join('、')}
                  onChange={e => setNewBeat({
                    ...newBeat,
                    characters: e.target.value.split(/[、,，]/).map(s => s.trim()).filter(Boolean),
                  })}
                  placeholder="角色A、角色B"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">地点</label>
                <Input value={newBeat.location} onChange={e => setNewBeat({ ...newBeat, location: e.target.value })} placeholder="场景地点" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">氛围/情绪</label>
              <Input value={newBeat.mood} onChange={e => setNewBeat({ ...newBeat, mood: e.target.value })} placeholder="紧张、温馨、悲伤..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBeatForm(false)}>取消</Button>
            <Button onClick={handleAddBeat} disabled={!newBeat.title.trim()}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
