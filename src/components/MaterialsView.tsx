'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Plus, Trash2, Search, Eye, Pencil,
  FileText, BookOpen, Lightbulb, Wrench, BookMarked, Route,
  Loader2, X, Save, Globe2,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { Material } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { toast } from '@/hooks/use-toast'

// ── Constants ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'template', label: '模板', icon: FileText },
  { value: 'reference', label: '参考', icon: BookOpen },
  { value: 'inspiration', label: '灵感', icon: Lightbulb },
  { value: 'generator', label: '生成器', icon: Wrench },
  { value: 'name-dict', label: '名词', icon: BookMarked },
  { value: 'trope', label: '桥段', icon: Route },
]

const CATEGORY_TABS: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: '全部', icon: Archive },
  ...CATEGORY_OPTIONS,
]

// ── Helpers ────────────────────────────────────────────────────────────

function getCategoryInfo(category: string | null) {
  return CATEGORY_OPTIONS.find(c => c.value === category) || { value: category || '', label: category || '未分类', icon: FileText }
}

function getCategoryBadgeStyle(category: string | null): string {
  switch (category) {
    case 'template': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'reference': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'inspiration': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'generator': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'name-dict': return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
    case 'trope': return 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    default: return 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800'
  }
}

function parseTags(tagsStr: string | null): string[] {
  if (!tagsStr) return []
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
}

// ── Form Data ──────────────────────────────────────────────────────────

interface MaterialFormData {
  title: string
  category: string
  content: string
  source: string
  tags: string
  isGlobal: boolean
}

const EMPTY_FORM: MaterialFormData = {
  title: '',
  category: '',
  content: '',
  source: '',
  tags: '',
  isGlobal: false,
}

function materialToForm(m: Material): MaterialFormData {
  return {
    title: m.title,
    category: m.category || '',
    content: m.content || '',
    source: m.source || '',
    tags: m.tags || '',
    isGlobal: m.isGlobal,
  }
}

// ── Main Component ─────────────────────────────────────────────────────

export function MaterialsView() {
  const { currentProject, materials, setMaterials } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState<MaterialFormData>(EMPTY_FORM)
  const [editForm, setEditForm] = useState<MaterialFormData>(EMPTY_FORM)

  // ── Load materials ───────────────────────────────────────────────────
  const loadMaterials = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      const data = await api.getMaterials(currentProject.id)
      setMaterials(data as Material[])
    } catch (err) {
      console.error('Failed to load materials:', err)
      toast({ title: '加载失败', description: '无法加载素材列表', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentProject, setMaterials])

  useEffect(() => {
    loadMaterials()
  }, [loadMaterials])

  // ── Filtered list ────────────────────────────────────────────────────
  const filteredMaterials = materials.filter(m => {
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      m.title.toLowerCase().includes(q) ||
      (m.content && m.content.toLowerCase().includes(q)) ||
      (m.tags && m.tags.toLowerCase().includes(q)) ||
      (m.source && m.source.toLowerCase().includes(q))
    )
  })

  // ── Create ───────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!currentProject) return
    if (!createForm.title.trim()) {
      toast({ title: '请输入素材标题', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api.createMaterial(currentProject.id, {
        title: createForm.title.trim(),
        category: createForm.category || undefined,
        content: createForm.content || undefined,
        source: createForm.source || undefined,
        tags: createForm.tags || undefined,
        isGlobal: createForm.isGlobal,
      })
      toast({ title: '创建成功', description: '素材已添加' })
      setCreateDialogOpen(false)
      setCreateForm(EMPTY_FORM)
      loadMaterials()
    } catch (err) {
      console.error('Failed to create material:', err)
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Update ───────────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!currentProject || !selectedMaterial) return
    if (!editForm.title.trim()) {
      toast({ title: '请输入素材标题', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const updated = await api.updateMaterial(currentProject.id, selectedMaterial.id, {
        title: editForm.title.trim(),
        category: editForm.category || undefined,
        content: editForm.content || undefined,
        source: editForm.source || undefined,
        tags: editForm.tags || undefined,
        isGlobal: editForm.isGlobal,
      })
      const newList = materials.map(m => m.id === selectedMaterial.id ? (updated as Material) : m)
      setMaterials(newList)
      setSelectedMaterial(updated as Material)
      toast({ title: '保存成功', description: '素材已更新' })
      setEditDialogOpen(false)
    } catch (err) {
      console.error('Failed to update material:', err)
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!currentProject || !selectedMaterial) return
    try {
      await api.deleteMaterial(currentProject.id, selectedMaterial.id)
      setMaterials(materials.filter(m => m.id !== selectedMaterial.id))
      toast({ title: '删除成功', description: '素材已删除' })
      setDeleteDialogOpen(false)
      setSelectedMaterial(null)
      setViewDialogOpen(false)
    } catch (err) {
      console.error('Failed to delete material:', err)
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' })
    }
  }

  // ── Dialog open handlers ─────────────────────────────────────────────
  const openView = (m: Material) => {
    setSelectedMaterial(m)
    setViewDialogOpen(true)
  }

  const openEdit = (m: Material) => {
    setSelectedMaterial(m)
    setEditForm(materialToForm(m))
    setEditDialogOpen(true)
  }

  const openDelete = (m: Material) => {
    setSelectedMaterial(m)
    setDeleteDialogOpen(true)
  }

  // ── Render ───────────────────────────────────────────────────────────
  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">请选择一个项目</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Archive className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">素材库</h2>
              <p className="text-sm text-muted-foreground">
                管理《{currentProject.title}》的创作素材
              </p>
            </div>
          </div>
          <Button
            className="bg-orange-600 hover:bg-orange-700 text-white"
            onClick={() => {
              setCreateForm(EMPTY_FORM)
              setCreateDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            添加素材
          </Button>
        </div>

        {/* Search + Category filter */}
        <div className="mb-6 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索素材标题、内容、标签..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORY_TABS.map(tab => {
              const Icon = tab.icon
              const isActive = categoryFilter === tab.value
              return (
                <Button
                  key={tab.value}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  className={isActive ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}
                  onClick={() => setCategoryFilter(tab.value)}
                >
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {tab.label}
                  {tab.value !== 'all' && (
                    <Badge
                      variant="secondary"
                      className={`ml-1 text-[10px] px-1 py-0 h-4 ${
                        isActive ? 'bg-orange-400/30 text-white' : ''
                      }`}
                    >
                      {materials.filter(m => m.category === tab.value).length}
                    </Badge>
                  )}
                  {tab.value === 'all' && materials.length > 0 && (
                    <Badge
                      variant="secondary"
                      className={`ml-1 text-[10px] px-1 py-0 h-4 ${
                        isActive ? 'bg-orange-400/30 text-white' : ''
                      }`}
                    >
                      {materials.length}
                    </Badge>
                  )}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                <Archive className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery || categoryFilter !== 'all' ? '未找到匹配素材' : '素材库为空'}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                {searchQuery || categoryFilter !== 'all'
                  ? '尝试调整搜索条件或筛选类别'
                  : '收集灵感、参考模板、名词设定等创作素材，方便随时查阅'}
              </p>
              {!searchQuery && categoryFilter === 'all' && (
                <Button
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  onClick={() => {
                    setCreateForm(EMPTY_FORM)
                    setCreateDialogOpen(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  添加素材
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredMaterials.map(material => {
                const catInfo = getCategoryInfo(material.category)
                const CatIcon = catInfo.icon
                const tags = parseTags(material.tags)
                return (
                  <motion.div
                    key={material.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer group border-border/60 hover:border-orange-200 dark:hover:border-orange-800">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${getCategoryBadgeStyle(material.category).split(' ').slice(0, 2).join(' ')}`}>
                              <CatIcon className="h-3.5 w-3.5" />
                            </div>
                            <h4 className="font-semibold text-sm line-clamp-1">{material.title}</h4>
                          </div>
                          {material.category && (
                            <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getCategoryBadgeStyle(material.category)}`}>
                              {catInfo.label}
                            </Badge>
                          )}
                        </div>
                        {material.content && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                            {material.content}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                                {tag}
                              </Badge>
                            ))}
                            {tags.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{tags.length - 3}</span>
                            )}
                            {material.isGlobal && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">
                                <Globe2 className="h-2.5 w-2.5 mr-0.5" />全局
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); openView(material) }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => { e.stopPropagation(); openEdit(material) }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); openDelete(material) }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        {material.source && (
                          <p className="text-[10px] text-muted-foreground/70 mt-2 truncate">
                            来源: {material.source}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create Material Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>添加素材</DialogTitle>
            <DialogDescription>收集灵感、参考模板、名词设定等创作素材</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">标题 *</Label>
              <Input
                placeholder="素材标题"
                value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">类别</Label>
              <Select
                value={createForm.category}
                onValueChange={v => setCreateForm({ ...createForm, category: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择素材类别" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">内容</Label>
              <Textarea
                placeholder="素材内容..."
                value={createForm.content}
                onChange={e => setCreateForm({ ...createForm, content: e.target.value })}
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">来源</Label>
              <Input
                placeholder="素材来源（如：某网站、某书、自创等）"
                value={createForm.source}
                onChange={e => setCreateForm({ ...createForm, source: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">标签（逗号分隔）</Label>
              <Input
                placeholder="如: 战斗, 魔法, 爽文"
                value={createForm.tags}
                onChange={e => setCreateForm({ ...createForm, tags: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">全局素材（所有项目可见）</Label>
              <Switch
                checked={createForm.isGlobal}
                onCheckedChange={v => setCreateForm({ ...createForm, isGlobal: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Material Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedMaterial && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedMaterial.title}</DialogTitle>
                  {selectedMaterial.category && (
                    <Badge variant="outline" className={`text-[10px] ${getCategoryBadgeStyle(selectedMaterial.category)}`}>
                      {getCategoryInfo(selectedMaterial.category).label}
                    </Badge>
                  )}
                  {selectedMaterial.isGlobal && (
                    <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400">
                      <Globe2 className="h-2.5 w-2.5 mr-0.5" />全局
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  创建于 {new Date(selectedMaterial.createdAt).toLocaleString('zh-CN')}
                  {selectedMaterial.updatedAt !== selectedMaterial.createdAt && (
                    <> · 更新于 {new Date(selectedMaterial.updatedAt).toLocaleString('zh-CN')}</>
                  )}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 py-2">
                  {selectedMaterial.content && (
                    <div>
                      <Label className="text-xs text-muted-foreground">内容</Label>
                      <div className="mt-1.5 text-sm whitespace-pre-wrap leading-relaxed bg-muted/50 rounded-md p-3">
                        {selectedMaterial.content}
                      </div>
                    </div>
                  )}
                  {selectedMaterial.source && (
                    <div>
                      <Label className="text-xs text-muted-foreground">来源</Label>
                      <p className="mt-1 text-sm">{selectedMaterial.source}</p>
                    </div>
                  )}
                  {selectedMaterial.tags && (
                    <div>
                      <Label className="text-xs text-muted-foreground">标签</Label>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {parseTags(selectedMaterial.tags).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false)
                    openEdit(selectedMaterial)
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1.5" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setViewDialogOpen(false)
                    openDelete(selectedMaterial)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  删除
                </Button>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  关闭
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑素材</DialogTitle>
            <DialogDescription>修改素材内容与分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">标题 *</Label>
              <Input
                placeholder="素材标题"
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">类别</Label>
              <Select
                value={editForm.category}
                onValueChange={v => setEditForm({ ...editForm, category: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择素材类别" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-3.5 w-3.5" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">内容</Label>
              <Textarea
                placeholder="素材内容..."
                value={editForm.content}
                onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                rows={6}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">来源</Label>
              <Input
                placeholder="素材来源"
                value={editForm.source}
                onChange={e => setEditForm({ ...editForm, source: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">标签（逗号分隔）</Label>
              <Input
                placeholder="如: 战斗, 魔法, 爽文"
                value={editForm.tags}
                onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">全局素材（所有项目可见）</Label>
              <Switch
                checked={editForm.isGlobal}
                onCheckedChange={v => setEditForm({ ...editForm, isGlobal: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <Save className="h-4 w-4 mr-1.5" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除素材</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除素材「{selectedMaterial?.title}」吗？此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
