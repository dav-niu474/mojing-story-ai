'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { api } from '@/lib/api';
import type { Chapter, ChapterVersion } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  PenLine,
  Sparkles,
  Save,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Plus,
  Loader2,
  MessageSquare,
  Swords,
  Eye,
  ShieldCheck,
  FileText,
  History,
  Send,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ModelSelector } from '@/components/ModelSelector';
import { getModelById } from '@/lib/models';

// ─── Status helpers ───────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string; dotColor: string }> = {
  planned: { label: '计划中', color: 'bg-gray-100 text-gray-700 border-gray-200', dotColor: 'bg-gray-400' },
  drafting: { label: '草稿', color: 'bg-amber-50 text-amber-700 border-amber-200', dotColor: 'bg-amber-400' },
  revision: { label: '修订中', color: 'bg-sky-50 text-sky-700 border-sky-200', dotColor: 'bg-sky-400' },
  complete: { label: '已完成', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dotColor: 'bg-emerald-400' },
};

const STATUS_FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'planned', label: '计划中' },
  { value: 'drafting', label: '草稿' },
  { value: 'revision', label: '修订中' },
  { value: 'complete', label: '已完成' },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] || STATUS_MAP.planned;
  return (
    <Badge variant="outline" className={`text-xs ${s.color}`}>
      {s.label}
    </Badge>
  );
}

// ─── Beat type ────────────────────────────────────────────────────
interface Beat {
  title: string;
  description: string;
  characters: string[];
  location: string;
  mood: string;
}

// ─── Main Component ───────────────────────────────────────────────
export function WritingView() {
  const {
    currentProject,
    chapters,
    setChapters,
    selectedChapter,
    setSelectedChapter,
    selectedModel,
    setSelectedModel,
  } = useAppStore();

  const projectId = currentProject?.id;

  // Local state
  const [statusFilter, setStatusFilter] = useState('all');
  const [content, setContent] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterStatus, setChapterStatus] = useState('planned');
  const [saving, setSaving] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showBeatsRef, setShowBeatsRef] = useState(true);

  // AI generation
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiPreviewType, setAiPreviewType] = useState<string>('');

  // AI Assistant chat
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Chapter versions
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionContent, setVersionContent] = useState('');

  // New chapter dialog
  const [showNewChapterDialog, setShowNewChapterDialog] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Data Loading ──────────────────────────────────────────────
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
    loadChapters();
  }, [loadChapters]);

  // Sync content when selected chapter changes
  useEffect(() => {
    if (selectedChapter) {
      setContent(selectedChapter.content || '');
      setChapterTitle(selectedChapter.title);
      setChapterStatus(selectedChapter.status);
    } else {
      setContent('');
      setChapterTitle('');
      setChapterStatus('planned');
    }
    setAiPreview(null);
    setLastSaved(null);
  }, [selectedChapter?.id]);

  // Load versions when chapter changes
  useEffect(() => {
    if (selectedChapter) {
      loadVersions(selectedChapter.id);
    } else {
      setVersions([]);
    }
  }, [selectedChapter?.id]);

  const loadVersions = async (chapterId: string) => {
    setLoadingVersions(true);
    try {
      const data = await api.getChapterVersions(chapterId);
      setVersions(data);
    } catch {
      // versions may not exist yet
    } finally {
      setLoadingVersions(false);
    }
  };

  // ─── Filtering ─────────────────────────────────────────────────
  const filteredChapters = chapters
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // ─── Auto-save ─────────────────────────────────────────────────
  const triggerAutoSave = useCallback(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      handleSave(true);
    }, 3000);
    setAutoSaveTimer(timer);
  }, [autoSaveTimer, selectedChapter, content, chapterTitle, chapterStatus, projectId]);

  const handleContentChange = (value: string) => {
    setContent(value);
    triggerAutoSave();
  };

  // ─── Save ──────────────────────────────────────────────────────
  const handleSave = async (isAutoSave = false) => {
    if (!projectId || !selectedChapter) return;
    setSaving(true);
    try {
      const updated = await api.updateChapter(projectId, selectedChapter.id, {
        content,
        title: chapterTitle,
        status: chapterStatus,
      });
      setChapters(chapters.map(c => (c.id === updated.id ? updated : c)));
      setSelectedChapter(updated);
      setLastSaved(new Date());
      if (!isAutoSave) toast({ title: '已保存' });
    } catch {
      if (!isAutoSave) toast({ title: '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  // ─── Save Version ──────────────────────────────────────────────
  const handleSaveVersion = async () => {
    if (!selectedChapter) return;
    try {
      await api.createChapterVersion(selectedChapter.id, {
        label: chapterStatus === 'drafting' ? '草稿快照' : '手动快照',
        source: 'manual',
      });
      await loadVersions(selectedChapter.id);
      toast({ title: '版本已保存' });
    } catch {
      toast({ title: '保存版本失败' });
    }
  };

  // ─── AI Continuation / Expand / Polish ─────────────────────────
  const handleAiGenerate = async (type: 'continuation' | 'polish') => {
    if (!projectId || !selectedChapter) return;
    setAiGenerating(true);
    setAiPreview(null);
    try {
      const lastContent = content.slice(-2000);
      let params: Record<string, unknown> = {};

      if (type === 'continuation') {
        params = { existingContent: lastContent, instruction: '自然续写，保持文风一致' };
      } else if (type === 'polish') {
        const selectedText = textareaRef.current && textareaRef.current.selectionStart !== textareaRef.current.selectionEnd
          ? content.substring(textareaRef.current.selectionStart, textareaRef.current.selectionEnd)
          : lastContent;
        params = { content: selectedText, instruction: '润色文字，提升文笔质量，增强画面感' };
      }

      const result = await api.aiGenerate(projectId, type, params, selectedModel);
      const text = typeof result === 'string' ? result : String(result);
      setAiPreview(text);
      setAiPreviewType(type);
    } catch {
      toast({ title: 'AI生成失败' });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAiExpand = async () => {
    if (!projectId || !selectedChapter) return;
    setAiGenerating(true);
    setAiPreview(null);
    try {
      const lastContent = content.slice(-2000);
      const result = await api.aiGenerate(projectId, 'continuation', {
        existingContent: lastContent,
        instruction: '扩写当前内容，增加细节描写、心理活动和环境刻画，保持原有文风',
      }, selectedModel);
      const text = typeof result === 'string' ? result : String(result);
      setAiPreview(text);
      setAiPreviewType('expand');
    } catch {
      toast({ title: 'AI扩写失败' });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleAcceptAi = () => {
    if (!aiPreview) return;
    setContent(content + '\n' + aiPreview);
    setAiPreview(null);
    triggerAutoSave();
  };

  const handleRejectAi = () => {
    setAiPreview(null);
  };

  // ─── AI Assistant Actions ──────────────────────────────────────
  const handleQuickAiAction = async (action: string) => {
    if (!projectId || !selectedChapter) return;
    setAiGenerating(true);
    try {
      let type = 'continuation';
      let params: Record<string, unknown> = { existingContent: content.slice(-1000) };

      switch (action) {
        case 'dialogue':
          params.instruction = '生成一段对话，要求角色语言有特色，推动剧情发展';
          break;
        case 'description':
          params.instruction = '生成一段环境或场景描写，要求有画面感和氛围感';
          break;
        case 'action':
          params.instruction = '生成一段打斗/动作场景，要求节奏紧凑、画面感强';
          break;
        case 'consistency':
          type = 'consistency-check';
          params = { scope: '当前章节' };
          break;
      }

      const result = await api.aiGenerate(projectId, type, params, selectedModel);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      setAiPreview(text);
      setAiPreviewType(action);
    } catch {
      toast({ title: 'AI操作失败' });
    } finally {
      setAiGenerating(false);
    }
  };

  // ─── AI Chat ───────────────────────────────────────────────────
  const handleSendChat = async () => {
    if (!projectId || !chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const result = await api.aiChat(projectId, userMsg, 'writing', undefined, selectedModel);
      setChatMessages(prev => [...prev, { role: 'assistant', content: result.response || result.message }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '抱歉，AI回复失败，请重试。' }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ─── Chapter Selection ─────────────────────────────────────────
  const handleSelectChapter = (chapter: Chapter) => {
    if (selectedChapter && content !== (selectedChapter.content || '')) {
      handleSave(true);
    }
    setSelectedChapter(chapter);
  };

  // ─── Create Chapter ────────────────────────────────────────────
  const handleCreateChapter = async () => {
    if (!projectId || !newChapterTitle.trim()) return;
    try {
      const maxSort = chapters.reduce((max, c) => Math.max(max, c.sortOrder), -1);
      const chapter = await api.createChapter(projectId, {
        title: newChapterTitle.trim(),
        sortOrder: maxSort + 1,
        status: 'planned',
      });
      setChapters([...chapters, chapter]);
      setShowNewChapterDialog(false);
      setNewChapterTitle('');
      setSelectedChapter(chapter);
      toast({ title: '章节已创建' });
    } catch {
      toast({ title: '创建失败' });
    }
  };

  // ─── Version restore ──────────────────────────────────────────
  const handleViewVersion = (version: ChapterVersion) => {
    setVersionContent(version.content);
    setShowVersionDialog(true);
  };

  const handleRestoreVersion = async (version: ChapterVersion) => {
    if (!projectId || !selectedChapter) return;
    try {
      await api.createChapterVersion(selectedChapter.id, {
        label: '恢复前快照',
        source: 'manual',
      });
      const updated = await api.updateChapter(projectId, selectedChapter.id, {
        content: version.content,
      });
      setContent(version.content);
      setChapters(chapters.map(c => (c.id === updated.id ? updated : c)));
      setSelectedChapter(updated);
      await loadVersions(selectedChapter.id);
      toast({ title: '版本已恢复' });
    } catch {
      toast({ title: '恢复失败' });
    }
  };

  // ─── Beat helpers ──────────────────────────────────────────────
  const getBeats = (): Beat[] => {
    if (!selectedChapter?.beats) return [];
    try {
      const parsed = JSON.parse(selectedChapter.beats);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const chapterBeats = getBeats();

  // ─── Word count ────────────────────────────────────────────────
  const countWords = (text: string): number => {
    const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
    const english = text.match(/[a-zA-Z]+/g)?.length || 0;
    return chinese + english;
  };

  const wordCount = countWords(content);

  // ─── Render ────────────────────────────────────────────────────
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-muted-foreground">
        请先选择或创建一个项目
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 h-full min-h-[calc(100vh-8rem)]">
      {/* ── Left Panel: Chapter List ── */}
      <div className="w-full lg:w-1/4 border-r flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">章节列表</h2>
          <Button size="sm" variant="outline" onClick={() => setShowNewChapterDialog(true)}>
            <Plus className="size-4 mr-1" /> 新建
          </Button>
        </div>

        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'ghost'}
              size="sm"
              className="text-xs h-7"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 max-h-[calc(100vh-16rem)]">
          <div className="flex flex-col gap-2 pr-1">
            {filteredChapters.length === 0 && (
              <div className="text-sm text-muted-foreground py-8 text-center">暂无章节</div>
            )}
            {filteredChapters.map(ch => (
              <Card
                key={ch.id}
                className={`cursor-pointer transition-colors py-3 gap-2 ${
                  selectedChapter?.id === ch.id
                    ? 'ring-2 ring-amber-300 bg-amber-50/50'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleSelectChapter(ch)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ch.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={ch.status} />
                        <span className="text-xs text-muted-foreground">{ch.wordCount}字</span>
                      </div>
                    </div>
                    {ch.outline && (
                      <Badge variant="outline" className="text-xs shrink-0">{ch.outline.title}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* ── Center Panel: Writing Area ── */}
      <div className="w-full lg:w-1/2 flex flex-col border-r">
        {!selectedChapter ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-muted-foreground gap-3">
            <PenLine className="size-12 opacity-30" />
            <p>选择一个章节开始写作</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b bg-muted/30 flex-wrap">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                compact
              />
              <Button variant="outline" size="sm" onClick={() => handleAiGenerate('continuation')} disabled={aiGenerating} title="AI续写">
                {aiGenerating ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Sparkles className="size-4 mr-1" />}
                AI续写
              </Button>
              <Button variant="outline" size="sm" onClick={handleAiExpand} disabled={aiGenerating} title="AI扩写">
                <BookOpen className="size-4 mr-1" /> AI扩写
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAiGenerate('polish')} disabled={aiGenerating} title="AI润色">
                <Eye className="size-4 mr-1" /> AI润色
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Button variant="outline" size="sm" onClick={handleSaveVersion} title="保存版本">
                <History className="size-4 mr-1" /> 保存版本
              </Button>
              <Button size="sm" onClick={() => handleSave(false)} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Save className="size-4 mr-1" />}
                保存
              </Button>
              <div className="flex-1" />
              {lastSaved && (
                <span className="text-xs text-muted-foreground">已自动保存 {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>

            {/* Beats reference (collapsible) */}
            {chapterBeats.length > 0 && (
              <Collapsible open={showBeatsRef} onOpenChange={setShowBeatsRef}>
                <CollapsibleTrigger className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground w-full border-b">
                  {showBeatsRef ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  <span className="font-medium">章节节拍参考</span>
                  <Badge variant="secondary" className="text-xs">{chapterBeats.length} 个节拍</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-2 border-b bg-amber-50/30">
                    <div className="flex flex-wrap gap-2">
                      {chapterBeats.map((beat, i) => (
                        <div key={i} className="inline-flex items-center gap-1.5 text-xs bg-white border rounded-md px-2 py-1">
                          <span className="font-bold text-amber-600">{i + 1}.</span>
                          <span>{beat.title}</span>
                          {beat.mood && <span className="text-muted-foreground">({beat.mood})</span>}
                        </div>
                      ))}
                    </div>
                    {selectedChapter.summary && (
                      <p className="text-xs text-muted-foreground mt-2">概要：{selectedChapter.summary}</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Chapter title */}
            <div className="px-4 pt-4">
              <Input
                value={chapterTitle}
                onChange={e => setChapterTitle(e.target.value)}
                className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 px-0 h-auto"
                placeholder="章节标题"
              />
            </div>

            {/* Writing area */}
            <div className="flex-1 px-4 py-2">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                className="min-h-[300px] h-full resize-none border-0 shadow-none focus-visible:ring-0 text-base leading-relaxed px-0"
                placeholder="开始写作..."
                style={{ minHeight: '40vh' }}
              />
            </div>

            {/* AI Preview */}
            {aiPreview && (
              <div className="border-t bg-amber-50/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-700">
                    AI生成内容（{aiPreviewType === 'continuation' ? '续写' : aiPreviewType === 'expand' ? '扩写' : aiPreviewType === 'polish' ? '润色' : '生成'}）
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRejectAi}>
                      <X className="size-4 mr-1" /> 放弃
                    </Button>
                    <Button size="sm" onClick={handleAcceptAi}>
                      <Check className="size-4 mr-1" /> 采用
                    </Button>
                  </div>
                </div>
                <ScrollArea className="max-h-48">
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">{aiPreview}</div>
                </ScrollArea>
              </div>
            )}

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{wordCount} 字</span>
                <Select value={chapterStatus} onValueChange={v => { setChapterStatus(v); triggerAutoSave(); }}>
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">计划中</SelectItem>
                    <SelectItem value="drafting">草稿</SelectItem>
                    <SelectItem value="revision">修订中</SelectItem>
                    <SelectItem value="complete">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                {saving && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" /> 保存中...
                  </span>
                )}
                {lastSaved && !saving && (
                  <span className="text-xs text-emerald-600">✓ 已保存</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Right Panel: AI Assistant ── */}
      <div className="w-full lg:w-1/4 flex flex-col p-4 gap-3">
        {!selectedChapter ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[30vh] text-muted-foreground">
            <Sparkles className="size-8 opacity-30 mb-2" />
            <p className="text-sm">选择章节后查看AI助手</p>
          </div>
        ) : (
          <>
            {/* Chapter Context */}
            <Card className="py-3 gap-2">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="size-4 text-amber-600" /> 章节上下文
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                {selectedChapter.summary && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">概要</span>
                    <p className="text-xs mt-0.5">{selectedChapter.summary}</p>
                  </div>
                )}
                {chapterBeats.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">节拍</span>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {chapterBeats.map((b, i) => (
                        <span key={i} className="text-xs">{i + 1}. {b.title}</span>
                      ))}
                    </div>
                  </div>
                )}
                {chapterBeats.some(b => b.characters?.length > 0) && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">相关角色</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {[...new Set(chapterBeats.flatMap(b => b.characters))].map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {chapterBeats.some(b => b.location) && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">地点</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {[...new Set(chapterBeats.map(b => b.location).filter(Boolean))].map((l, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{l}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick AI Actions */}
            <Card className="py-3 gap-2">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="size-4 text-amber-600" /> 快速AI操作
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="text-xs justify-start" onClick={() => handleQuickAiAction('dialogue')} disabled={aiGenerating}>
                    <MessageSquare className="size-3 mr-1" /> 生成对话
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs justify-start" onClick={() => handleQuickAiAction('description')} disabled={aiGenerating}>
                    <Eye className="size-3 mr-1" /> 生成描写
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs justify-start" onClick={() => handleQuickAiAction('action')} disabled={aiGenerating}>
                    <Swords className="size-3 mr-1" /> 生成打斗
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs justify-start" onClick={() => handleQuickAiAction('consistency')} disabled={aiGenerating}>
                    <ShieldCheck className="size-3 mr-1" /> 一致性检查
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mini Chat */}
            <Card className="flex-1 flex flex-col py-3 gap-2 min-h-0">
              <CardHeader className="p-3 pb-0 shrink-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="size-4 text-amber-600" /> AI写作助手
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 max-h-48 mb-2">
                  <div className="flex flex-col gap-2 pr-1">
                    {chatMessages.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">向AI助手提问写作相关问题</p>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`text-xs p-2 rounded-lg ${
                          msg.role === 'user' ? 'bg-amber-100/60 ml-4' : 'bg-muted mr-4'
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Loader2 className="size-3 animate-spin" /> AI思考中...
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <div className="flex gap-2 shrink-0">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    placeholder="问AI..."
                    className="text-xs h-8"
                    onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                  />
                  <Button size="icon" className="size-8 shrink-0" onClick={handleSendChat} disabled={chatLoading}>
                    <Send className="size-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Versions */}
            <Card className="py-3 gap-2">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="size-4 text-amber-600" /> 版本历史
                  {loadingVersions && <Loader2 className="size-3 animate-spin" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <ScrollArea className="max-h-32">
                  <div className="flex flex-col gap-1.5 pr-1">
                    {versions.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">暂无版本记录</p>
                    )}
                    {versions.map(v => (
                      <div key={v.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 cursor-pointer group">
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{v.label || '版本'}</span>
                          <span className="text-muted-foreground ml-1">{v.wordCount}字</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="size-5" onClick={() => handleViewVersion(v)} title="查看">
                            <Eye className="size-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-5 text-amber-600" onClick={() => handleRestoreVersion(v)} title="恢复此版本">
                            <RotateCcw className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── New Chapter Dialog ── */}
      <Dialog open={showNewChapterDialog} onOpenChange={setShowNewChapterDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>新建章节</DialogTitle></DialogHeader>
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

      {/* ── Version Preview Dialog ── */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader><DialogTitle>版本内容预览</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="text-sm leading-relaxed whitespace-pre-wrap p-2">
              {versionContent || '（空内容）'}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
