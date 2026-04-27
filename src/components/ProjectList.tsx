'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  BookOpen,
  FileText,
  Clock,
  Trash2,
  MoreVertical,
  Sparkles,
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
  DialogTrigger,
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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300' },
  outlining: { label: '大纲中', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  writing: { label: '写作中', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  revision: { label: '修订中', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  complete: { label: '已完成', color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300' },
}

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
  const { projects, setProjects, setCurrentProject, setCurrentView } = useAppStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
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

  async function handleCreate() {
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
    setCurrentView('dashboard')
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
            <p className="text-muted-foreground mt-1">管理你的网文创作项目</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                创建新项目
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  创建新项目
                </DialogTitle>
                <DialogDescription>
                  填写基本信息，开始你的网文创作之旅
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-4">
                {/* Title */}
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

                {/* Description */}
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

                {/* Genre & Writing Style */}
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

                {/* Target Words */}
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

                {/* Premise */}
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
                  onClick={handleCreate}
                  disabled={!form.title.trim() || creating}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                >
                  {creating ? '创建中...' : '开始创作'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <div className="w-24 h-24 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-6">
              <BookOpen className="h-12 w-12 text-amber-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              还没有作品
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              创建你的第一个网文项目，让AI助手帮你构建世界观、大纲和正文
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建第一个项目
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project, i) => {
              const status = STATUS_MAP[project.status] || STATUS_MAP.draft
              const totalWords = (project as any).totalWordCount ?? project.wordCount ?? 0
              const chapterCount = (project as any).chapterCount ?? (project as any)._count?.chapters ?? 0
              const characterCount = (project as any).characterCount ?? (project as any)._count?.characters ?? 0

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
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

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
