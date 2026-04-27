'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Users,
  Globe,
  BookOpen,
  Sparkles,
  PenTool,
  Plus,
  ArrowRight,
  Target,
  ListTree,
  Lightbulb,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import { getModelById } from '@/lib/models'
import { ModelSelector } from '@/components/ModelSelector'
import type { NovelProject, Chapter, PipelineStepStatus } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-stone-200 text-stone-700' },
  outlining: { label: '大纲中', color: 'bg-amber-100 text-amber-800' },
  writing: { label: '写作中', color: 'bg-emerald-100 text-emerald-800' },
  revision: { label: '修订中', color: 'bg-orange-100 text-orange-800' },
  complete: { label: '已完成', color: 'bg-sky-100 text-sky-800' },
}

const CHAPTER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  planned: { label: '规划中', color: 'bg-stone-100 text-stone-600' },
  drafting: { label: '草稿中', color: 'bg-amber-100 text-amber-700' },
  revision: { label: '修订中', color: 'bg-orange-100 text-orange-700' },
  complete: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
  written: { label: '已完成', color: 'bg-emerald-100 text-emerald-700' },
  polished: { label: '已润色', color: 'bg-sky-100 text-sky-700' },
}

const PIPELINE_OVERVIEW = [
  { key: 'concept', label: '创意概念', icon: Lightbulb, color: 'text-amber-500' },
  { key: 'worldbuilding', label: '世界观', icon: Globe, color: 'text-violet-500' },
  { key: 'outline', label: '大纲', icon: ListTree, color: 'text-emerald-500' },
  { key: 'writing', label: '写作', icon: PenTool, color: 'text-orange-500' },
]

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

export function Dashboard() {
  const {
    currentProject,
    setCurrentView,
    setChapters,
    setCharacters,
    setLocations,
    setLoreItems,
    setFactions,
    setOutlines,
    setMaterials,
    chapters,
    characters,
    locations,
    loreItems,
    selectedModel,
    setSelectedModel,
  } = useAppStore()

  const [recentChapters, setRecentChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [pipelineStatus, setPipelineStatus] = useState<Record<string, PipelineStepStatus>>({})

  const project = currentProject

  useEffect(() => {
    if (!project) return
    loadProjectData()
  }, [project?.id])

  async function loadProjectData() {
    if (!project) return
    setLoading(true)
    try {
      const [projectData, chaptersData] = await Promise.all([
        api.getProject(project.id),
        api.getChapters(project.id),
      ])
      const fullProject = projectData as NovelProject
      setChapters(fullProject.chapters || (chaptersData as Chapter[]))
      setCharacters(fullProject.characters || [])
      setLocations(fullProject.locations || [])
      setLoreItems(fullProject.loreItems || [])
      setFactions(fullProject.factions || [])
      setOutlines(fullProject.outlines || [])
      setMaterials(fullProject.materials || [])

      // Sort chapters by updatedAt for recent display
      const sorted = [...(fullProject.chapters || (chaptersData as Chapter[]))].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      setRecentChapters(sorted.slice(0, 5))

      // Determine pipeline status
      const status: Record<string, PipelineStepStatus> = {}
      if (fullProject.premise || fullProject.description) status['concept'] = 'completed'
      if ((fullProject.characters?.length ?? 0) > 0) status['worldbuilding'] = 'completed'
      if ((fullProject.outlines?.length ?? 0) > 0) status['outline'] = 'completed'
      const writtenChapters = fullProject.chapters?.filter(ch => ch.status === 'written' || ch.status === 'polished').length ?? 0
      if (writtenChapters > 0) status['writing'] = 'completed'
      setPipelineStatus(status)
    } catch (err) {
      console.error('Failed to load project data:', err)
    } finally {
      setLoading(false)
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

  const status = STATUS_MAP[project.status] || STATUS_MAP.draft
  const totalWords = (project as Record<string, unknown>).totalWordCount as number ?? project.wordCount ?? 0
  const chapterCount = chapters.length
  const characterCount = characters.length
  const worldEntryCount = locations.length + loreItems.length
  const progress = project.targetWords
    ? Math.min(100, Math.round((totalWords / project.targetWords) * 100))
    : null

  // Calculate pipeline completion
  const completedSteps = Object.keys(pipelineStatus).filter(k => pipelineStatus[k] === 'completed').length
  const pipelineProgress = Math.round((completedSteps / PIPELINE_OVERVIEW.length) * 100)

  const statCards = [
    {
      label: '总字数',
      value: formatNumber(totalWords),
      icon: FileText,
      bgLight: 'bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: '章节数',
      value: chapterCount.toString(),
      icon: BookOpen,
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      label: '角色数',
      value: characterCount.toString(),
      icon: Users,
      bgLight: 'bg-violet-50 dark:bg-violet-900/20',
    },
    {
      label: '世界观条目',
      value: worldEntryCount.toString(),
      icon: Globe,
      bgLight: 'bg-sky-50 dark:bg-sky-900/20',
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  }

  return (
    <div className="h-full overflow-y-auto">
      <motion.div
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Project Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-foreground">{project.title}</h2>
                <Badge className={status.color}>{status.label}</Badge>
                {project.genre && (
                  <Badge variant="outline">{project.genre}</Badge>
                )}
              </div>
              {project.description && (
                <p className="text-muted-foreground max-w-2xl">{project.description}</p>
              )}
              {project.premise && (
                <div className="mt-3 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">核心设定：</span>
                    {project.premise}
                  </p>
                </div>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="flex flex-col items-end gap-1">
                <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
                <span className="text-[10px] text-muted-foreground">
                  {getModelById(selectedModel)?.description?.slice(0, 30)}...
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="overflow-hidden border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${stat.bgLight} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>

        {/* Creation Pipeline Progress */}
        <motion.div variants={itemVariants} className="mb-8">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  创作流程
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                  onClick={() => setCurrentView('pipeline')}
                >
                  进入创作流程
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Pipeline Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>整体进度</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{pipelineProgress}%</span>
                </div>
                <Progress value={pipelineProgress} className="h-2" />
              </div>

              {/* Pipeline Steps */}
              <div className="flex items-center justify-between">
                {PIPELINE_OVERVIEW.map((step, index) => {
                  const Icon = step.icon
                  const isCompleted = pipelineStatus[step.key] === 'completed'
                  const isLast = index === PIPELINE_OVERVIEW.length - 1

                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-muted'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Icon className={`h-5 w-5 ${isCompleted ? step.color : 'text-muted-foreground/50'}`} />
                          )}
                        </div>
                        <span className={`text-[10px] mt-1 ${isCompleted ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                      </div>
                      {!isLast && (
                        <div className="flex-1 h-0.5 mx-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-emerald-400 to-amber-400"
                            initial={{ width: '0%' }}
                            animate={{ width: isCompleted ? '100%' : '0%' }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Writing Progress */}
        {progress !== null && (
          <motion.div variants={itemVariants} className="mb-8">
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">写作进度</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatNumber(totalWords)} / {formatNumber(project.targetWords!)}字</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{progress}%</span>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions & Recent Chapters */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <Card className="border-border/60 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  快捷操作
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-between group hover:border-amber-300 dark:hover:border-amber-700"
                  onClick={() => setCurrentView('pipeline')}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    进入AI创作流程
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between group hover:border-amber-300 dark:hover:border-amber-700"
                  onClick={() => setCurrentView('outline')}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    AI生成大纲
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between group hover:border-amber-300 dark:hover:border-amber-700"
                  onClick={() => setCurrentView('worldbuilding')}
                >
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-violet-500" />
                    创建角色
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full justify-between group hover:border-amber-300 dark:hover:border-amber-700"
                  onClick={() => setCurrentView('writing')}
                >
                  <span className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-orange-500" />
                    开始写作
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-between group hover:border-amber-300 dark:hover:border-amber-700"
                  onClick={() => setCurrentView('ai-assistant')}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-500" />
                    AI创作助手
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Chapters */}
          <motion.div variants={itemVariants}>
            <Card className="border-border/60 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-500" />
                    最近章节
                  </CardTitle>
                  {chapters.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => setCurrentView('writing')}
                    >
                      查看全部
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {recentChapters.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">还没有章节</p>
                    <Button
                      variant="link"
                      className="text-amber-600 dark:text-amber-400 mt-1"
                      onClick={() => setCurrentView('pipeline')}
                    >
                      AI一键生成
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentChapters.map((chapter) => {
                      const chStatus = CHAPTER_STATUS_MAP[chapter.status] || CHAPTER_STATUS_MAP.planned
                      return (
                        <div
                          key={chapter.id}
                          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            useAppStore.getState().setSelectedChapter(chapter)
                            setCurrentView('writing')
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-muted-foreground w-8 flex-shrink-0">
                              {chapter.sortOrder + 1}.
                            </span>
                            <span className="text-sm font-medium truncate">
                              {chapter.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatNumber(chapter.wordCount)}字
                            </span>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${chStatus.color}`}>
                              {chStatus.label}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
