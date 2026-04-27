'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  BookOpen,
  FileText,
  Clock,
  Trash2,
  MoreVertical,
  Sparkles,
  Wand2,
  Loader2,
  ChevronRight,
  Lightbulb,
  Globe,
  ListTree,
  PenTool,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { NovelProject } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const GENRES = [
  '玄幻', '都市', '仙侠', '科幻', '历史', '游戏',
  '悬疑', '言情', '军事', '体育', '灵异', '二次元', '其他',
]

const WRITING_STYLES = [
  '轻松幽默', '热血爽文', '细腻文艺', '悬疑紧张', '宏大史诗',
]

const EXAMPLE_PREMISES = [
  { text: '一个少年意外获得逆天修仙功法，从废材逆袭成为至高强者', genre: '玄幻', style: '热血爽文' },
  { text: '都市白领重生回到2010年，利用前世记忆在商海纵横', genre: '都市', style: '轻松幽默' },
  { text: '地球突然进入灵气复苏时代，普通大学生觉醒异能守护城市', genre: '都市', style: '热血爽文' },
  { text: '天才黑客穿越到赛博世界，用代码改写虚拟帝国命运', genre: '科幻', style: '悬疑紧张' },
  { text: '落魄书生偶得上古仙人传承，踏上修仙求道之路', genre: '仙侠', style: '细腻文艺' },
  { text: '游戏玩家被困在虚拟现实中，必须通关才能回到现实', genre: '游戏', style: '悬疑紧张' },
]

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300' },
  outlining: { label: '大纲中', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  writing: { label: '写作中', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  revision: { label: '修订中', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  complete: { label: '已完成', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
}

const ONE_CLICK_STEPS = [
  { icon: Lightbulb, label: '正在生成故事概念...', color: 'text-amber-500' },
  { icon: Globe, label: '正在构建世界观...', color: 'text-violet-500' },
  { icon: ListTree, label: '正在生成大纲...', color: 'text-emerald-500' },
]

function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  return `${months}个月前`
}

export function ProjectList() {
  const { projects, setProjects, setCurrentProject, setCurrentView, selectedModel } = useAppStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // One-click creation state
  const [premise, setPremise] = useState('')
  const [genre, setGenre] = useState('')
  const [style, setStyle] = useState('')
  const [targetChapters, setTargetChapters] = useState('10')
  const [oneClickCreating, setOneClickCreating] = useState(false)
  const [oneClickProgress, setOneClickProgress] = useState('')
  const [oneClickStepIndex, setOneClickStepIndex] = useState(0)

  // Manual creation form
  const [form, setForm] = useState({
    title: '',
    description: '',
    genre: '',
    targetWords: '',
    premise: '',
    writingStyle: '',
  })

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const data = await api.getProjects()
      setProjects(data as NovelProject[])
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }

  async function handleOneClickCreate() {
    if (!premise.trim()) return
    setOneClickCreating(true)

    try {
      // Step 1: Generating concept
      setOneClickStepIndex(0)
      setOneClickProgress(ONE_CLICK_STEPS[0].label)
      await sleep(500)

      // Step 2: World building
      setOneClickStepIndex(1)
      setOneClickProgress(ONE_CLICK_STEPS[1].label)

      // Step 3: Outline
      setOneClickStepIndex(2)
      setOneClickProgress(ONE_CLICK_STEPS[2].label)

      // Call one-click API
      const result = await api.aiOneClick(
        premise.trim(),
        genre || undefined,
        style || undefined,
        selectedModel,
        parseInt(targetChapters) || 10,
      )

      // Reload projects
      await loadProjects()

      // Navigate to the new project
      const newProject = result.project as NovelProject
      if (newProject) {
        setCurrentProject(newProject)
        setCurrentView('pipeline')
      }

      // Reset form
      setPremise('')
      setGenre('')
      setStyle('')
      setTargetChapters('10')
    } catch (err) {
      console.error('One-click creation failed:', err)
      alert('一键创建失败，请重试。错误：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setOneClickCreating(false)
      setOneClickProgress('')
      setOneClickStepIndex(0)
    }
  }

  async function handleManualCreate() {
    if (!form.title.trim()) return
    setCreating(true)
    try {
      const data: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        genre: form.genre || null,
        targetWords: form.targetWords ? parseInt(form.targetWords) : null,
        premise: form.premise.trim() || null,
        writingStyle: form.writingStyle || null,
      }
      await api.createProject(data)
      await loadProjects()
      setCreateOpen(false)
      setForm({ title: '', description: '', genre: '', targetWords: '', premise: '', writingStyle: '' })
    } catch (err) {
      console.error('Failed to create project:', err)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteProject(id)
      await loadProjects()
      setDeleteId(null)
    } catch (err) {
      console.error('Failed to delete project:', err)
    }
  }

  function handleOpenProject(project: NovelProject) {
    setCurrentProject(project)
    setCurrentView('pipeline')
  }

  function handleExampleClick(example: typeof EXAMPLE_PREMISES[0]) {
    setPremise(example.text)
    setGenre(example.genre)
    setStyle(example.style)
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
    }),
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">我的作品</h2>
            <p className="text-muted-foreground mt-1">AI驱动的网文创作平台</p>
          </div>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-foreground text-sm"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            手动创建项目
          </Button>
        </div>

        {/* Projects Grid or Empty State with AI One-Click */}
        {projects.length === 0 ? (
          /* Empty State - Hero with AI One-Click */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            {/* Hero Section */}
            <div className="w-full max-w-2xl mx-auto text-center mb-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6"
              >
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/25">
                  <Wand2 className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                  AI一键创作
                </h2>
                <p className="text-muted-foreground mt-2 text-lg">
                  输入你的故事灵感，AI帮你完成从概念到大纲的全部创作
                </p>
              </motion.div>

              {/* One-Click Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="border-2 border-amber-200 dark:border-amber-800/50 shadow-lg shadow-amber-500/5 overflow-hidden">
                  <CardContent className="p-6">
                    {/* Premise Input */}
                    <div className="mb-4">
                      <Label className="text-base font-semibold mb-2 block">
                        ✨ 描述你的故事灵感
                      </Label>
                      <Textarea
                        placeholder="例如：一个少年意外获得逆天修仙功法，从废材逆袭成为至高强者..."
                        rows={3}
                        value={premise}
                        onChange={(e) => setPremise(e.target.value)}
                        className="text-base resize-none border-amber-200 dark:border-amber-800/50 focus:border-amber-400 dark:focus:border-amber-600"
                        disabled={oneClickCreating}
                      />
                    </div>

                    {/* Options Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">类型</Label>
                        <Select value={genre} onValueChange={setGenre} disabled={oneClickCreating}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="自动识别" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENRES.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">文风</Label>
                        <Select value={style} onValueChange={setStyle} disabled={oneClickCreating}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="自动选择" />
                          </SelectTrigger>
                          <SelectContent>
                            {WRITING_STYLES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">目标章数</Label>
                        <Input
                          type="number"
                          placeholder="10"
                          value={targetChapters}
                          onChange={(e) => setTargetChapters(e.target.value)}
                          className="h-9"
                          disabled={oneClickCreating}
                        />
                      </div>
                    </div>

                    {/* One-Click Button */}
                    <Button
                      onClick={handleOneClickCreate}
                      disabled={!premise.trim() || oneClickCreating}
                      className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/25 disabled:opacity-50"
                    >
                      {oneClickCreating ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>{oneClickProgress}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          <span>AI一键创作</span>
                        </div>
                      )}
                    </Button>

                    {/* Progress Steps */}
                    <AnimatePresence>
                      {oneClickCreating && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-2"
                        >
                          {ONE_CLICK_STEPS.map((step, i) => {
                            const Icon = step.icon
                            const isActive = i === oneClickStepIndex
                            const isCompleted = i < oneClickStepIndex
                            return (
                              <motion.div
                                key={step.label}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`flex items-center gap-2 text-sm transition-all ${
                                  isCompleted ? 'text-emerald-600 dark:text-emerald-400' :
                                  isActive ? 'text-amber-600 dark:text-amber-400' :
                                  'text-muted-foreground/40'
                                }`}
                              >
                                {isActive ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isCompleted ? (
                                  <span className="text-emerald-500">✓</span>
                                ) : (
                                  <Icon className="h-4 w-4" />
                                )}
                                <span>{step.label}</span>
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Example Premises */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6"
              >
                <p className="text-sm text-muted-foreground mb-3">没有灵感？试试这些：</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {EXAMPLE_PREMISES.map((example, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      onClick={() => handleExampleClick(example)}
                      disabled={oneClickCreating}
                      className="px-3 py-1.5 text-xs rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50 text-left max-w-[280px] truncate"
                    >
                      {example.text.slice(0, 30)}...
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          /* Projects List + Quick Create */
          <div>
            {/* Quick AI Create Bar */}
            <Card className="mb-6 border-2 border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-900/10 dark:to-orange-900/10">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="flex-1">
                    <Input
                      placeholder="输入故事灵感，AI一键创建完整项目..."
                      value={premise}
                      onChange={(e) => setPremise(e.target.value)}
                      className="border-amber-200 dark:border-amber-800/50 focus:border-amber-400"
                      disabled={oneClickCreating}
                    />
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Select value={genre} onValueChange={setGenre} disabled={oneClickCreating}>
                      <SelectTrigger className="w-24 h-9 text-xs">
                        <SelectValue placeholder="类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRES.map((g) => (
                          <SelectItem key={g} value={g}>{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={style} onValueChange={setStyle} disabled={oneClickCreating}>
                      <SelectTrigger className="w-24 h-9 text-xs">
                        <SelectValue placeholder="文风" />
                      </SelectTrigger>
                      <SelectContent>
                        {WRITING_STYLES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleOneClickCreate}
                      disabled={!premise.trim() || oneClickCreating}
                      className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md disabled:opacity-50"
                    >
                      {oneClickCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      {oneClickCreating ? '创建中...' : '一键创作'}
                    </Button>
                  </div>
                </div>
                {/* Progress */}
                <AnimatePresence>
                  {oneClickCreating && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400"
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{oneClickProgress}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Project Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map((project, i) => {
                const status = STATUS_MAP[project.status] || STATUS_MAP.draft
                const totalWords = (project as Record<string, unknown>).totalWordCount as number ?? project.wordCount ?? 0
                const chapterCount = (project as Record<string, unknown>).chapterCount as number ?? (project as Record<string, { chapters: unknown[] }>).chapters?.length ?? 0

                return (
                  <motion.div
                    key={project.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    layout
                  >
                    <Card
                      className="cursor-pointer group hover:shadow-lg hover:shadow-amber-900/5 transition-all duration-300 border-border/60 hover:border-amber-300/50 dark:hover:border-amber-700/50"
                      onClick={() => handleOpenProject(project)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-bold line-clamp-1 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                            {project.title}
                          </CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteId(project.id)
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除项目
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {project.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge variant="secondary" className={status.color}>
                            {status.label}
                          </Badge>
                          {project.genre && (
                            <Badge variant="outline" className="text-xs">
                              {project.genre}
                            </Badge>
                          )}
                          {project.writingStyle && (
                            <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-400">
                              {project.writingStyle}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {formatNumber(totalWords)}字
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {chapterCount}章
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(project.updatedAt)}
                          </span>
                        </div>
                        {/* Progress bar if target words set */}
                        {project.targetWords && project.targetWords > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>进度</span>
                              <span>{Math.min(100, Math.round((totalWords / project.targetWords) * 100))}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                                style={{ width: `${Math.min(100, (totalWords / project.targetWords) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Enter pipeline button */}
                        <div className="mt-3 flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                          <Sparkles className="h-3 w-3 mr-1" />
                          进入创作流程
                          <ChevronRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Manual Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5 text-stone-500" />
              手动创建项目
            </DialogTitle>
            <DialogDescription>
              手动填写项目信息，适合有明确创作计划的作者
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                标题 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="给你的作品起个名字"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">简介</Label>
              <Textarea
                id="description"
                placeholder="用一两句话描述你的故事"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>类型</Label>
                <Select value={form.genre} onValueChange={(v) => setForm({ ...form, genre: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENRES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>文风偏好</Label>
                <Select value={form.writingStyle} onValueChange={(v) => setForm({ ...form, writingStyle: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择文风" />
                  </SelectTrigger>
                  <SelectContent>
                    {WRITING_STYLES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetWords">目标字数</Label>
              <Input
                id="targetWords"
                type="number"
                placeholder="例如: 500000"
                value={form.targetWords}
                onChange={(e) => setForm({ ...form, targetWords: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="premise">核心设定</Label>
              <Textarea
                id="premise"
                placeholder="描述故事的核心设定、金手指、独特卖点..."
                rows={3}
                value={form.premise}
                onChange={(e) => setForm({ ...form, premise: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleManualCreate}
              disabled={!form.title.trim() || creating}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              {creating ? '创建中...' : '开始创作'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该项目及其所有数据（角色、世界观、大纲、章节等），无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
