'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  Globe,
  ListTree,
  PenTool,
  Sparkles,
  Loader2,
  Check,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  CheckCircle2,
  ArrowRight,
  FileText,
  Users,
  BookOpen,
  Wand2,
  Edit3,
  Send,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { PipelineStep, PipelineStepStatus, NovelProject } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModelSelector } from '@/components/ModelSelector'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ─── Constants ──────────────────────────────────────────────────────────

const GENRES = [
  '玄幻', '都市', '仙侠', '科幻', '历史', '游戏',
  '悬疑', '言情', '军事', '体育', '灵异', '二次元', '其他',
]

const WRITING_STYLES = [
  '轻松幽默', '热血爽文', '细腻文艺', '悬疑紧张', '宏大史诗',
]

const EXAMPLE_PREMISES = [
  '一个少年意外获得逆天修仙功法，从废材逆袭成为至高强者',
  '都市白领重生回到2010年，利用前世记忆在商海纵横',
  '地球突然进入灵气复苏时代，普通大学生觉醒异能守护城市',
  '天才黑客穿越到赛博世界，用代码改写虚拟帝国命运',
  '落魄书生偶得上古仙人传承，踏上修仙求道之路',
  '游戏玩家被困在虚拟现实中，必须通关才能回到现实',
]

// ─── Pipeline Step Configuration ──────────────────────────────────────────

interface PipelineStepConfig {
  key: PipelineStep
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  statusBadge: {
    pending: string
    generating: string
    completed: string
    skipped: string
  }
}

const PIPELINE_STEPS: PipelineStepConfig[] = [
  {
    key: 'concept',
    label: '创意概念',
    description: '从故事灵感生成完整的故事概念、类型、主题和核心冲突',
    icon: Lightbulb,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
    statusBadge: {
      pending: 'bg-stone-100 text-stone-600',
      generating: 'bg-amber-100 text-amber-700 animate-pulse',
      completed: 'bg-emerald-100 text-emerald-700',
      skipped: 'bg-stone-100 text-stone-400',
    },
  },
  {
    key: 'worldbuilding',
    label: '世界观构建',
    description: '生成角色、地点、设定和势力，构建完整的世界观体系',
    icon: Globe,
    color: 'text-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800/50',
    statusBadge: {
      pending: 'bg-stone-100 text-stone-600',
      generating: 'bg-violet-100 text-violet-700 animate-pulse',
      completed: 'bg-emerald-100 text-emerald-700',
      skipped: 'bg-stone-100 text-stone-400',
    },
  },
  {
    key: 'outline',
    label: '大纲规划',
    description: '基于世界观生成多幕大纲和章节结构',
    icon: ListTree,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-200 dark:border-emerald-800/50',
    statusBadge: {
      pending: 'bg-stone-100 text-stone-600',
      generating: 'bg-emerald-100 text-emerald-700 animate-pulse',
      completed: 'bg-emerald-100 text-emerald-700',
      skipped: 'bg-stone-100 text-stone-400',
    },
  },
  {
    key: 'writing',
    label: '章节写作',
    description: 'AI根据大纲和节拍逐章生成正文内容',
    icon: PenTool,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800/50',
    statusBadge: {
      pending: 'bg-stone-100 text-stone-600',
      generating: 'bg-orange-100 text-orange-700 animate-pulse',
      completed: 'bg-emerald-100 text-emerald-700',
      skipped: 'bg-stone-100 text-stone-400',
    },
  },
]

// ─── Creative Input Section ────────────────────────────────────────────────

interface CreativeInputSectionProps {
  project: NovelProject
  premise: string
  setPremise: (v: string) => void
  genre: string
  setGenre: (v: string) => void
  style: string
  setStyle: (v: string) => void
  isGenerating: boolean
  onGenerate: () => void
  conceptCompleted: boolean
  onEditConcept: () => void
}

function CreativeInputSection({
  project,
  premise,
  setPremise,
  genre,
  setGenre,
  style,
  setStyle,
  isGenerating,
  onGenerate,
  conceptCompleted,
  onEditConcept,
}: CreativeInputSectionProps) {
  const [showExamples, setShowExamples] = useState(false)

  // If concept is already completed, show a compact view
  if (conceptCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="border-emerald-200 dark:border-emerald-800/50 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-900/10 dark:to-teal-900/10">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm">创意概念已生成</h3>
                  {(project.genre || genre) && (
                    <Badge variant="outline" className="text-xs">{project.genre || genre}</Badge>
                  )}
                  {(project.writingStyle || style) && (
                    <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-400">{project.writingStyle || style}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.premise || premise}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onEditConcept}
                className="flex-shrink-0"
              >
                <Edit3 className="h-3 w-3 mr-1" />
                修改创意
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Main creative input UI (when concept is pending)
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-amber-200 dark:border-amber-800/50 shadow-lg shadow-amber-500/5 overflow-hidden">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Wand2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                输入你的故事灵感
              </h3>
              <p className="text-sm text-muted-foreground">
                AI将根据你的创意，自动生成概念、世界观和大纲
              </p>
            </div>
          </div>

          {/* Premise Input */}
          <div className="mb-4">
            <Label className="text-base font-semibold mb-2 block flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              故事灵感
              <span className="text-xs text-muted-foreground font-normal">（描述你心中的故事，越具体AI生成越好）</span>
            </Label>
            <Textarea
              placeholder="例如：一个少年意外获得逆天修仙功法，从废材逆袭成为至高强者，却发现修仙界背后隐藏着一个惊天阴谋..."
              rows={4}
              value={premise}
              onChange={(e) => setPremise(e.target.value)}
              className="text-base resize-none border-amber-200 dark:border-amber-800/50 focus:border-amber-400 dark:focus:border-amber-600"
              disabled={isGenerating}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {premise.length > 0 ? `${premise.length} 字` : '还没有灵感？'}
                </span>
                {premise.length === 0 && (
                  <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                    disabled={isGenerating}
                  >
                    看看示例
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Example Premises */}
          <AnimatePresence>
            {showExamples && premise.length === 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="p-3 rounded-lg bg-amber-50/80 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                  <p className="text-xs text-muted-foreground mb-2">点击选择一个灵感：</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PREMISES.map((example, i) => (
                      <button
                        key={i}
                        onClick={() => setPremise(example)}
                        disabled={isGenerating}
                        className="px-3 py-1.5 text-xs rounded-full bg-white dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50 text-left max-w-[260px] truncate"
                      >
                        {example.slice(0, 30)}...
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Options Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">类型偏好</Label>
              <Select value={genre} onValueChange={setGenre} disabled={isGenerating}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="AI自动识别" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">文风偏好</Label>
              <Select value={style} onValueChange={setStyle} disabled={isGenerating}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="AI自动选择" />
                </SelectTrigger>
                <SelectContent>
                  {WRITING_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={onGenerate}
            disabled={!premise.trim() || isGenerating}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25 disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>AI正在生成创意概念...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span>开始AI创作</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            )}
          </Button>

          {!premise.trim() && !isGenerating && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              输入灵感后，AI将自动生成故事概念并进入创作流程
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Pipeline Step Card ───────────────────────────────────────────────────

interface StepCardProps {
  step: PipelineStepConfig
  status: PipelineStepStatus
  isLast: boolean
  generatedContent: string | null
  onGenerate: (step: PipelineStep) => void
  onRegenerate: (step: PipelineStep) => void
  onAccept: (step: PipelineStep) => void
  isGenerating: boolean
  canGenerate: boolean
  isConceptStep?: boolean
}

function StepCard({
  step,
  status,
  isLast,
  generatedContent,
  onGenerate,
  onRegenerate,
  onAccept,
  isGenerating,
  canGenerate,
  isConceptStep,
}: StepCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const Icon = step.icon

  const isActive = status === 'generating'
  const isCompleted = status === 'completed'
  const isPending = status === 'pending'

  function handleGenerate() {
    onGenerate(step.key)
  }

  function handleRegenerate() {
    onRegenerate(step.key)
  }

  function handleAccept() {
    onAccept(step.key)
  }

  function handleStartEdit() {
    setEditContent(generatedContent || '')
    setEditing(true)
  }

  function handleEditSave() {
    setEditing(false)
    onAccept(step.key)
  }

  const statusLabel: Record<PipelineStepStatus, string> = {
    pending: '待生成',
    generating: '生成中...',
    completed: '已完成',
    skipped: '已跳过',
  }

  // Don't show concept step card - it's handled by CreativeInputSection
  if (isConceptStep) return null

  return (
    <div className="relative">
      {/* Connector Line */}
      {!isLast && (
        <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-border z-0">
          <motion.div
            className="w-full bg-gradient-to-b from-amber-400 to-emerald-400"
            initial={{ height: '0%' }}
            animate={{ height: isCompleted ? '100%' : '0%' }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`relative z-10 transition-all duration-300 ${
          isActive
            ? `border-2 ${step.borderColor} shadow-lg shadow-amber-500/5`
            : isCompleted
            ? 'border-emerald-200 dark:border-emerald-800/50'
            : 'border-border/60'
        }`}>
          <CardContent className="p-5">
            {/* Step Header */}
            <div className="flex items-start gap-4">
              {/* Step Icon / Status Indicator */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : isActive
                  ? step.bgColor
                  : 'bg-muted'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                ) : isActive ? (
                  <Loader2 className={`h-6 w-6 ${step.color} animate-spin`} />
                ) : (
                  <Icon className={`h-6 w-6 ${isPending ? 'text-muted-foreground/50' : step.color}`} />
                )}
              </div>

              {/* Step Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base">{step.label}</h3>
                  <Badge variant="secondary" className={`text-[10px] px-2 py-0 ${step.statusBadge[status]}`}>
                    {statusLabel[status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {isPending && canGenerate && (
                  <Button
                    onClick={handleGenerate}
                    className={`bg-gradient-to-r ${step.color === 'text-violet-500' ? 'from-violet-500 to-purple-500' : step.color === 'text-emerald-500' ? 'from-emerald-500 to-teal-500' : 'from-orange-500 to-red-500'} text-white shadow-md`}
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    AI生成
                  </Button>
                )}
                {isCompleted && (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpanded(!expanded)}
                    >
                      {expanded ? <ChevronUp className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {expanded ? '收起' : '查看'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerate}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      重新生成
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Generating Animation */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className={`p-4 rounded-lg ${step.bgColor} border ${step.borderColor}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Loader2 className={`h-4 w-4 ${step.color} animate-spin`} />
                      <span className="text-sm font-medium">AI正在生成...</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded animate-pulse w-full" />
                      <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                      <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Generated Content Preview */}
            <AnimatePresence>
              {isCompleted && generatedContent && expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4"
                >
                  <div className={`p-4 rounded-lg ${step.bgColor} border ${step.borderColor}`}>
                    {editing ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={8}
                          className="text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                            取消
                          </Button>
                          <Button size="sm" onClick={handleEditSave} className="bg-emerald-600 text-white hover:bg-emerald-700">
                            <Check className="h-3 w-3 mr-1" />
                            保存修改
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                          {generatedContent.length > 500
                            ? generatedContent.slice(0, 500) + '...'
                            : generatedContent}
                        </div>
                        <div className="flex gap-2 justify-end mt-3">
                          <Button variant="outline" size="sm" onClick={handleStartEdit}>
                            <Pencil className="h-3 w-3 mr-1" />
                            编辑
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pending with no ability to generate */}
            {isPending && !canGenerate && (
              <div className="mt-3 text-xs text-muted-foreground">
                请先完成上一步骤
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// ─── Quick Actions Panel ──────────────────────────────────────────────────

interface QuickActionProps {
  project: NovelProject
  onNavigate: (view: string) => void
}

function QuickActionsPanel({ project, onNavigate }: QuickActionProps) {
  const [aiLoading, setAiLoading] = useState<string | null>(null)
  const { selectedModel, setSelectedModel } = useAppStore()

  async function handleAiAction(action: string) {
    if (!project) return
    setAiLoading(action)
    try {
      if (action === 'write-next') {
        const chapters = await api.getChapters(project.id)
        const nextChapter = chapters.find((ch: { status: string; content: string | null }) => ch.status === 'planned' || !ch.content)
        if (nextChapter) {
          await api.aiPipeline(project.id, 'writing', { chapterId: nextChapter.id }, selectedModel)
        }
      } else if (action === 'polish-recent') {
        const chapters = await api.getChapters(project.id)
        const recentWritten = chapters.find((ch: { status: string }) => ch.status === 'written')
        if (recentWritten) {
          await api.aiPipeline(project.id, 'polish', { chapterId: recentWritten.id }, selectedModel)
        }
      }
    } catch (err) {
      console.error('AI action failed:', err)
    } finally {
      setAiLoading(null)
    }
  }

  const actions = [
    {
      id: 'write-next',
      label: 'AI续写下一章',
      icon: PenTool,
      color: 'text-orange-500',
      hoverColor: 'hover:border-orange-300 dark:hover:border-orange-700',
    },
    {
      id: 'polish-recent',
      label: 'AI润色最近章节',
      icon: Sparkles,
      color: 'text-amber-500',
      hoverColor: 'hover:border-amber-300 dark:hover:border-amber-700',
    },
    {
      id: 'go-worldbuilding',
      label: '编辑世界观',
      icon: Globe,
      color: 'text-violet-500',
      hoverColor: 'hover:border-violet-300 dark:hover:border-violet-700',
      navigate: 'worldbuilding',
    },
    {
      id: 'go-outline',
      label: '编辑大纲',
      icon: ListTree,
      color: 'text-emerald-500',
      hoverColor: 'hover:border-emerald-300 dark:hover:border-emerald-700',
      navigate: 'outline',
    },
  ]

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            快捷操作
          </CardTitle>
          <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => {
          const Icon = action.icon
          const isLoading = aiLoading === action.id
          return (
            <Button
              key={action.id}
              variant="outline"
              className={`w-full justify-between group ${action.hoverColor}`}
              onClick={() => action.navigate ? onNavigate(action.navigate) : handleAiAction(action.id)}
              disabled={!!aiLoading}
            >
              <span className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className={`h-4 w-4 ${action.color}`} />
                )}
                <span className="text-sm">{action.label}</span>
              </span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}

// ─── Stats Panel ──────────────────────────────────────────────────────────

interface StatsPanelProps {
  project: NovelProject
  characters: number
  locations: number
  loreItems: number
  chapters: number
  outlines: number
}

function StatsPanel({ project, characters, locations, loreItems, chapters, outlines }: StatsPanelProps) {
  function formatNumber(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + '万'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
    return n.toString()
  }

  const stats = [
    { label: '总字数', value: formatNumber(project.wordCount), icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: '章节数', value: chapters.toString(), icon: BookOpen, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: '角色数', value: characters.toString(), icon: Users, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: '世界观', value: (locations + loreItems).toString(), icon: Globe, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
    { label: '大纲卷', value: outlines.toString(), icon: ListTree, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ]

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">项目数据</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`p-3 rounded-lg ${stat.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`h-3.5 w-3.5 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <span className="text-lg font-bold">{stat.value}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main CreationPipeline Component ──────────────────────────────────────

export function CreationPipeline() {
  const {
    currentProject,
    setCurrentView,
    selectedModel,
    setSelectedModel,
    pipelineStatus,
    setPipelineStatus,
  } = useAppStore()

  const [stepResults, setStepResults] = useState<Record<string, string>>({})
  const [generatingStep, setGeneratingStep] = useState<PipelineStep | null>(null)
  const [projectData, setProjectData] = useState<NovelProject | null>(null)
  const [loading, setLoading] = useState(true)

  // Creative input state
  const [premise, setPremise] = useState('')
  const [genre, setGenre] = useState('')
  const [style, setStyle] = useState('')
  const [isEditingConcept, setIsEditingConcept] = useState(false)

  // Stats
  const [stats, setStats] = useState({
    characters: 0,
    locations: 0,
    loreItems: 0,
    chapters: 0,
    outlines: 0,
    totalWords: 0,
  })

  const project = currentProject

  useEffect(() => {
    if (!project) return
    loadProjectData()
  }, [project?.id])

  async function loadProjectData() {
    if (!project) return
    setLoading(true)
    try {
      const data = await api.getProject(project.id) as NovelProject
      setProjectData(data)

      // Initialize creative input from existing project data
      if (data.premise) setPremise(data.premise)
      if (data.genre) setGenre(data.genre)
      if (data.writingStyle) setStyle(data.writingStyle)

      // Update stats
      setStats({
        characters: data.characters?.length ?? 0,
        locations: data.locations?.length ?? 0,
        loreItems: data.loreItems?.length ?? 0,
        chapters: data.chapters?.length ?? 0,
        outlines: data.outlines?.length ?? 0,
        totalWords: data.wordCount ?? 0,
      })

      // Determine pipeline status based on existing data
      const newStatus: Record<string, PipelineStepStatus> = {}

      if (data.premise || data.description) {
        newStatus['concept'] = 'completed'
        setStepResults(prev => ({
          ...prev,
          concept: data.premise || data.description || '',
        }))
      }

      if ((data.characters?.length ?? 0) > 0) {
        newStatus['worldbuilding'] = 'completed'
        setStepResults(prev => ({
          ...prev,
          worldbuilding: `已生成 ${(data.characters?.length ?? 0)} 个角色、${(data.locations?.length ?? 0)} 个地点、${(data.loreItems?.length ?? 0)} 个设定、${(data.factions?.length ?? 0)} 个势力`,
        }))
      }

      if ((data.outlines?.length ?? 0) > 0) {
        newStatus['outline'] = 'completed'
        setStepResults(prev => ({
          ...prev,
          outline: `已生成 ${(data.outlines?.length ?? 0)} 卷大纲、${(data.chapters?.length ?? 0)} 个章节`,
        }))
      }

      const writtenChapters = data.chapters?.filter(ch => ch.status === 'written' || ch.status === 'polished').length ?? 0
      if (writtenChapters > 0) {
        newStatus['writing'] = 'completed'
        setStepResults(prev => ({
          ...prev,
          writing: `已写入 ${writtenChapters} 个章节`,
        }))
      }

      // Set pending for uncompleted steps
      PIPELINE_STEPS.forEach(s => {
        if (!newStatus[s.key]) {
          newStatus[s.key] = 'pending'
        }
      })

      setPipelineStatus(newStatus)
    } catch (err) {
      console.error('Failed to load project data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Handle concept generation from creative input
  const handleConceptGenerate = useCallback(async () => {
    if (!project || !premise.trim() || generatingStep) return

    setGeneratingStep('concept')
    setPipelineStatus({
      ...pipelineStatus,
      concept: 'generating',
    })

    try {
      const input: Record<string, unknown> = {
        premise: premise.trim(),
        genre: genre || undefined,
        style: style || undefined,
      }

      const result = await api.aiPipeline(project.id, 'concept', input, selectedModel)

      // Update step result
      const generatedText = formatStepResult('concept', result)
      setStepResults(prev => ({
        ...prev,
        concept: generatedText,
      }))

      setPipelineStatus({
        ...pipelineStatus,
        concept: 'completed',
      })

      setIsEditingConcept(false)

      // Reload project data to get updated stats
      await loadProjectData()
    } catch (err) {
      console.error('Pipeline step concept failed:', err)
      setPipelineStatus({
        ...pipelineStatus,
        concept: 'pending',
      })
      alert(`生成失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setGeneratingStep(null)
    }
  }, [project, premise, genre, style, generatingStep, pipelineStatus, selectedModel])

  const handleGenerate = useCallback(async (step: PipelineStep) => {
    if (!project || generatingStep) return

    setGeneratingStep(step)
    setPipelineStatus({
      ...pipelineStatus,
      [step]: 'generating',
    })

    try {
      let input: Record<string, unknown> = {}

      switch (step) {
        case 'concept':
          input = { premise: premise || project.premise || project.description || '' }
          break
        case 'worldbuilding':
          input = { concept: project.premise || project.description || '' }
          break
        case 'outline':
          input = {}
          break
        case 'writing': {
          const chapters = await api.getChapters(project.id)
          const nextChapter = chapters.find((ch: { status: string }) => ch.status === 'planned')
          if (nextChapter) {
            input = { chapterId: nextChapter.id }
          } else {
            throw new Error('没有找到待写作的章节')
          }
          break
        }
      }

      const result = await api.aiPipeline(project.id, step, input, selectedModel)

      const generatedText = formatStepResult(step, result)
      setStepResults(prev => ({
        ...prev,
        [step]: generatedText,
      }))

      setPipelineStatus({
        ...pipelineStatus,
        [step]: 'completed',
      })

      await loadProjectData()
    } catch (err) {
      console.error(`Pipeline step ${step} failed:`, err)
      setPipelineStatus({
        ...pipelineStatus,
        [step]: 'pending',
      })
      alert(`生成失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setGeneratingStep(null)
    }
  }, [project, premise, generatingStep, pipelineStatus, selectedModel])

  const handleRegenerate = useCallback(async (step: PipelineStep) => {
    if (step === 'concept') {
      setIsEditingConcept(true)
      return
    }
    await handleGenerate(step)
  }, [handleGenerate])

  const handleAccept = useCallback((_step: PipelineStep) => {
    // Content is already auto-saved by the pipeline API
  }, [])

  function formatStepResult(step: PipelineStep, result: Record<string, unknown>): string {
    if (!result) return ''

    switch (step) {
      case 'concept': {
        const generated = result.generated as Record<string, unknown> | undefined
        if (!generated) return '概念已生成'
        const parts = []
        if (generated.concept) parts.push(generated.concept as string)
        if (generated.genre) parts.push(`类型: ${generated.genre as string}`)
        if (generated.subGenre) parts.push(`子类型: ${generated.subGenre as string}`)
        if (generated.themes) parts.push(`主题: ${(generated.themes as string[]).join(', ')}`)
        if (generated.setting) parts.push(`世界观: ${generated.setting as string}`)
        return parts.join('\n\n')
      }
      case 'worldbuilding': {
        const saved = result.saved as Record<string, unknown[]> | undefined
        if (!saved) return '世界观已生成'
        return `已生成 ${(saved.characters?.length ?? 0)} 个角色、${(saved.locations?.length ?? 0)} 个地点、${(saved.lore?.length ?? 0)} 个设定、${(saved.factions?.length ?? 0)} 个势力`
      }
      case 'outline': {
        const saved = result.saved as Record<string, unknown[]> | undefined
        if (!saved) return '大纲已生成'
        return `已生成 ${(saved.outlines?.length ?? 0)} 卷大纲、${(saved.chapters?.length ?? 0)} 个章节`
      }
      case 'writing': {
        const generated = result.generated as Record<string, unknown> | undefined
        if (!generated) return '章节已生成'
        return `已生成章节内容，${generated.wordCount ?? 0} 字`
      }
      default:
        return '已生成'
    }
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">请选择一个项目</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const conceptCompleted = pipelineStatus['concept'] === 'completed'

  // Determine which step is the next available one
  const getNextAvailableStep = (): PipelineStep | null => {
    for (const step of PIPELINE_STEPS) {
      const status = pipelineStatus[step.key]
      if (status === 'pending' || !status) {
        const prevIndex = PIPELINE_STEPS.findIndex(s => s.key === step.key) - 1
        if (prevIndex < 0 || pipelineStatus[PIPELINE_STEPS[prevIndex].key] === 'completed') {
          return step.key
        }
      }
    }
    return null
  }

  const nextStep = getNextAvailableStep()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Project Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{project.title}</h2>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
            </div>
          </div>
        </motion.div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Steps - Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Step 0: Creative Input (always at top) */}
            <CreativeInputSection
              project={project}
              premise={premise}
              setPremise={setPremise}
              genre={genre}
              setGenre={setGenre}
              style={style}
              setStyle={setStyle}
              isGenerating={generatingStep === 'concept'}
              onGenerate={handleConceptGenerate}
              conceptCompleted={conceptCompleted && !isEditingConcept}
              onEditConcept={() => setIsEditingConcept(true)}
            />

            {/* Pipeline Steps Header */}
            <div className="flex items-center gap-2 pt-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-semibold">创作流程</h3>
              {nextStep && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  下一步: {PIPELINE_STEPS.find(s => s.key === nextStep)?.label}
                </Badge>
              )}
            </div>

            {/* Concept mini-indicator (when completed, show a compact line) */}
            {conceptCompleted && !isEditingConcept && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">创意概念</span>
                  {' — 已完成'}
                  {project.genre && ` · ${project.genre}`}
                  {project.writingStyle && ` · ${project.writingStyle}`}
                </span>
                <button
                  onClick={() => setIsEditingConcept(true)}
                  className="ml-auto text-xs text-amber-600 dark:text-amber-400 hover:underline flex-shrink-0"
                >
                  修改
                </button>
              </motion.div>
            )}

            {/* Pipeline Steps (skip concept since it's handled above) */}
            {PIPELINE_STEPS.filter(s => s.key !== 'concept').map((step, index) => (
              <StepCard
                key={step.key}
                step={step}
                status={pipelineStatus[step.key] || 'pending'}
                isLast={index === PIPELINE_STEPS.length - 2} // -2 because we filtered out 'concept'
                generatedContent={stepResults[step.key] || null}
                onGenerate={handleGenerate}
                onRegenerate={handleRegenerate}
                onAccept={handleAccept}
                isGenerating={generatingStep === step.key}
                canGenerate={
                  // For worldbuilding, concept must be completed
                  step.key === 'worldbuilding'
                    ? conceptCompleted
                    : // For outline, worldbuilding must be completed
                      step.key === 'outline'
                        ? pipelineStatus['worldbuilding'] === 'completed'
                        : // For writing, outline must be completed
                          step.key === 'writing'
                            ? pipelineStatus['outline'] === 'completed'
                            : true
                }
              />
            ))}

            {/* All completed notice */}
            {PIPELINE_STEPS.every(s => pipelineStatus[s.key] === 'completed') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50 text-center"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                  创作流程已完成！
                </h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
                  你的小说已具备完整的世界观、大纲和正文。现在可以继续写作或润色。
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => setCurrentView('writing')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    继续写作
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentView('outline')}
                  >
                    <ListTree className="h-4 w-4 mr-2" />
                    查看大纲
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar - Stats & Quick Actions */}
          <div className="space-y-6">
            <StatsPanel
              project={project}
              characters={stats.characters}
              locations={stats.locations}
              loreItems={stats.loreItems}
              chapters={stats.chapters}
              outlines={stats.outlines}
            />
            <QuickActionsPanel
              project={project}
              onNavigate={(view) => setCurrentView(view as 'worldbuilding' | 'outline' | 'writing')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
