'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, Camera, GitCompare, Plus, Trash2,
  RotateCcw, Loader2, Clock, CheckCircle2, XCircle,
  ArrowRight, Eye, Pencil, Save, AlertTriangle,
  Milestone, Bookmark, Zap, Shield,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { VersionSnapshot, ChangeProposal } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'

// ── Constants ──────────────────────────────────────────────────────────

const SNAPSHOT_TYPES: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'milestone', label: '里程碑', icon: Milestone },
  { value: 'checkpoint', label: '检查点', icon: Bookmark },
  { value: 'auto', label: '自动', icon: Zap },
  { value: 'pre-change', label: '变更前', icon: Shield },
]

const CHANGE_TYPES: { value: string; label: string }[] = [
  { value: 'revision', label: '修订' },
  { value: 'addition', label: '新增' },
  { value: 'deletion', label: '删除' },
  { value: 'restructuring', label: '重构' },
]

const CHANGE_STATUSES: { value: string; label: string; icon: React.ElementType }[] = [
  { value: 'proposed', label: '提议', icon: GitCompare },
  { value: 'approved', label: '已批准', icon: CheckCircle2 },
  { value: 'in-progress', label: '进行中', icon: Clock },
  { value: 'applied', label: '已应用', icon: CheckCircle2 },
  { value: 'rejected', label: '已拒绝', icon: XCircle },
  { value: 'archived', label: '已归档', icon: Archive },
]

function Archive(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>
    </svg>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────

function getSnapshotTypeInfo(type: string) {
  return SNAPSHOT_TYPES.find(t => t.value === type) || { value: type, label: type, icon: Camera }
}

function getSnapshotTypeBadgeStyle(type: string): string {
  switch (type) {
    case 'milestone': return 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    case 'checkpoint': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'auto': return 'bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800'
    case 'pre-change': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    default: return 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800'
  }
}

function getChangeTypeLabel(type: string): string {
  return CHANGE_TYPES.find(t => t.value === type)?.label || type
}

function getStatusInfo(status: string) {
  return CHANGE_STATUSES.find(s => s.value === status) || { value: status, label: status, icon: Clock }
}

function getStatusBadgeStyle(status: string): string {
  switch (status) {
    case 'proposed': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    case 'approved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'in-progress': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    case 'applied': return 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    case 'rejected': return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800'
    case 'archived': return 'bg-gray-50 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800'
    default: return 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-200 dark:border-gray-800'
  }
}

function getNextStatus(current: string): string | null {
  switch (current) {
    case 'proposed': return 'approved'
    case 'approved': return 'in-progress'
    case 'in-progress': return 'applied'
    default: return null
  }
}

function getNextStatusLabel(current: string): string | null {
  const next = getNextStatus(current)
  if (!next) return null
  return getStatusInfo(next).label
}

function getRejectStatus(_current: string): string | null {
  return 'rejected'
}

// ── Form Data ──────────────────────────────────────────────────────────

interface SnapshotFormData {
  label: string
  type: string
  note: string
}

const EMPTY_SNAPSHOT_FORM: SnapshotFormData = {
  label: '',
  type: 'checkpoint',
  note: '',
}

interface ChangeFormData {
  title: string
  type: string
  description: string
  targetScope: string
  impact: string
  plan: string
}

const EMPTY_CHANGE_FORM: ChangeFormData = {
  title: '',
  type: 'revision',
  description: '',
  targetScope: '',
  impact: '',
  plan: '',
}

function changeToForm(c: ChangeProposal): ChangeFormData {
  return {
    title: c.title,
    type: c.type,
    description: c.description || '',
    targetScope: c.targetScope || '',
    impact: c.impact || '',
    plan: c.plan || '',
  }
}

// ── Snapshots Tab ──────────────────────────────────────────────────────

function SnapshotsTab({ projectId }: { projectId: string }) {
  const { snapshots, setSnapshots } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<VersionSnapshot | null>(null)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState<SnapshotFormData>(EMPTY_SNAPSHOT_FORM)

  // Load snapshots
  const loadSnapshots = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getSnapshots(projectId)
      setSnapshots(data as VersionSnapshot[])
    } catch (err) {
      console.error('Failed to load snapshots:', err)
      toast({ title: '加载失败', description: '无法加载快照列表', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [projectId, setSnapshots])

  useEffect(() => {
    loadSnapshots()
  }, [loadSnapshots])

  // Create snapshot
  const handleCreate = async () => {
    if (!createForm.label.trim()) {
      toast({ title: '请输入快照标签', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api.createSnapshot(projectId, {
        label: createForm.label.trim(),
        type: createForm.type,
        note: createForm.note || undefined,
      })
      toast({ title: '快照创建成功', description: '当前项目状态已保存' })
      setCreateDialogOpen(false)
      setCreateForm(EMPTY_SNAPSHOT_FORM)
      loadSnapshots()
    } catch (err) {
      console.error('Failed to create snapshot:', err)
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Restore snapshot
  const handleRestore = async () => {
    if (!selectedSnapshot) return
    setSaving(true)
    try {
      await api.restoreSnapshot(projectId, selectedSnapshot.id)
      toast({ title: '恢复成功', description: `已恢复到快照「${selectedSnapshot.label}」` })
      setRestoreDialogOpen(false)
      setViewDialogOpen(false)
    } catch (err) {
      console.error('Failed to restore snapshot:', err)
      toast({ title: '恢复失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Delete snapshot
  const handleDelete = async () => {
    if (!selectedSnapshot) return
    try {
      await api.deleteSnapshot(projectId, selectedSnapshot.id)
      setSnapshots(snapshots.filter(s => s.id !== selectedSnapshot.id))
      toast({ title: '删除成功', description: '快照已删除' })
      setDeleteDialogOpen(false)
      setViewDialogOpen(false)
      setSelectedSnapshot(null)
    } catch (err) {
      console.error('Failed to delete snapshot:', err)
      toast({ title: '删除失败', description: '请稍后重试', variant: 'destructive' })
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          保存项目状态快照，随时可以回滚到之前的版本
        </p>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => {
            setCreateForm(EMPTY_SNAPSHOT_FORM)
            setCreateDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          创建快照
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
        </div>
      ) : snapshots.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              还没有快照
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              创建项目快照来保存当前状态，随时可以回滚到之前的版本
            </p>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                setCreateForm(EMPTY_SNAPSHOT_FORM)
                setCreateDialogOpen(true)
              }}
            >
              <Camera className="h-4 w-4 mr-1.5" />
              创建快照
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {snapshots.map((snapshot, index) => {
              const typeInfo = getSnapshotTypeInfo(snapshot.type)
              const TypeIcon = typeInfo.icon
              return (
                <motion.div
                  key={snapshot.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group hover:border-teal-200 dark:hover:border-teal-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${getSnapshotTypeBadgeStyle(snapshot.type).split(' ').slice(0, 2).join(' ')}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate">{snapshot.label}</h4>
                              <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${getSnapshotTypeBadgeStyle(snapshot.type)}`}>
                                {typeInfo.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(snapshot.createdAt).toLocaleString('zh-CN')}
                            </p>
                            {snapshot.note && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {snapshot.note}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setSelectedSnapshot(snapshot)
                              setViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-teal-600 hover:text-teal-700"
                            onClick={() => {
                              setSelectedSnapshot(snapshot)
                              setRestoreDialogOpen(true)
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedSnapshot(snapshot)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Snapshot Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>创建快照</DialogTitle>
            <DialogDescription>保存当前项目状态，可随时回滚到此版本</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">标签 *</Label>
              <Input
                placeholder="如：第一章完成、大纲修订版"
                value={createForm.label}
                onChange={e => setCreateForm({ ...createForm, label: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">类型</Label>
              <Select
                value={createForm.type}
                onValueChange={v => setCreateForm({ ...createForm, type: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择快照类型" />
                </SelectTrigger>
                <SelectContent>
                  {SNAPSHOT_TYPES.map(opt => (
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
              <Label className="text-xs">备注</Label>
              <Textarea
                placeholder="快照备注（可选）"
                value={createForm.note}
                onChange={e => setCreateForm({ ...createForm, note: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <Camera className="h-4 w-4 mr-1.5" />
              创建快照
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Snapshot Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedSnapshot && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedSnapshot.label}</DialogTitle>
                  <Badge variant="outline" className={`text-[10px] ${getSnapshotTypeBadgeStyle(selectedSnapshot.type)}`}>
                    {getSnapshotTypeInfo(selectedSnapshot.type).label}
                  </Badge>
                </div>
                <DialogDescription>
                  创建于 {new Date(selectedSnapshot.createdAt).toLocaleString('zh-CN')}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 py-2">
                  {selectedSnapshot.note && (
                    <div>
                      <Label className="text-xs text-muted-foreground">备注</Label>
                      <p className="mt-1 text-sm">{selectedSnapshot.note}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">快照数据</Label>
                    <div className="mt-1.5 text-xs bg-muted/50 rounded-md p-3 max-h-48 overflow-auto font-mono">
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedSnapshot.data)
                          return JSON.stringify(parsed, null, 2).slice(0, 2000)
                        } catch {
                          return String(selectedSnapshot.data).slice(0, 2000)
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  className="text-teal-600 hover:text-teal-700 border-teal-300 dark:border-teal-700"
                  onClick={() => {
                    setViewDialogOpen(false)
                    setRestoreDialogOpen(true)
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  恢复
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setViewDialogOpen(false)
                    setDeleteDialogOpen(true)
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

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              确认恢复快照
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要恢复到快照「{selectedSnapshot?.label}」吗？当前未保存的修改可能会丢失。建议先创建一个新快照保存当前状态。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              className="bg-teal-600 hover:bg-teal-700"
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <RotateCcw className="h-4 w-4 mr-1.5" />
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除快照</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除快照「{selectedSnapshot?.label}」吗？此操作不可撤销。
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

// ── Change Proposals Tab ───────────────────────────────────────────────

function ChangesTab({ projectId }: { projectId: string }) {
  const { changes, setChanges } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedChange, setSelectedChange] = useState<ChangeProposal | null>(null)
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState<ChangeFormData>(EMPTY_CHANGE_FORM)
  const [editForm, setEditForm] = useState<ChangeFormData>(EMPTY_CHANGE_FORM)

  // Load changes
  const loadChanges = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getChanges(projectId)
      setChanges(data as ChangeProposal[])
    } catch (err) {
      console.error('Failed to load changes:', err)
      toast({ title: '加载失败', description: '无法加载变更提案列表', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [projectId, setChanges])

  useEffect(() => {
    loadChanges()
  }, [loadChanges])

  // Create change proposal
  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      toast({ title: '请输入提案标题', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await api.createChange(projectId, {
        title: createForm.title.trim(),
        type: createForm.type,
        description: createForm.description || undefined,
        targetScope: createForm.targetScope || undefined,
        impact: createForm.impact || undefined,
        plan: createForm.plan || undefined,
      })
      toast({ title: '提案创建成功', description: '新的变更提案已提交' })
      setCreateDialogOpen(false)
      setCreateForm(EMPTY_CHANGE_FORM)
      loadChanges()
    } catch (err) {
      console.error('Failed to create change:', err)
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Update change proposal
  const handleUpdate = async () => {
    if (!selectedChange) return
    if (!editForm.title.trim()) {
      toast({ title: '请输入提案标题', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const updated = await api.updateChange(projectId, selectedChange.id, {
        title: editForm.title.trim(),
        type: editForm.type,
        description: editForm.description || undefined,
        targetScope: editForm.targetScope || undefined,
        impact: editForm.impact || undefined,
        plan: editForm.plan || undefined,
      })
      const newList = changes.map(c => c.id === selectedChange.id ? (updated as ChangeProposal) : c)
      setChanges(newList)
      setSelectedChange(updated as ChangeProposal)
      toast({ title: '保存成功', description: '变更提案已更新' })
      setEditDialogOpen(false)
    } catch (err) {
      console.error('Failed to update change:', err)
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Status transition
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedChange) return
    setSaving(true)
    try {
      const updated = await api.updateChange(projectId, selectedChange.id, { status: newStatus })
      const newList = changes.map(c => c.id === selectedChange.id ? (updated as ChangeProposal) : c)
      setChanges(newList)
      setSelectedChange(updated as ChangeProposal)
      toast({ title: '状态更新成功', description: `提案状态已变更为「${getStatusInfo(newStatus).label}」` })
    } catch (err) {
      console.error('Failed to update status:', err)
      toast({ title: '状态更新失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Delete
  const handleDelete = async () => {
    if (!selectedChange) return
    try {
      await api.updateChange(projectId, selectedChange.id, { status: 'archived' })
      const newList = changes.map(c => c.id === selectedChange.id ? { ...c, status: 'archived' } as ChangeProposal : c)
      setChanges(newList)
      toast({ title: '已归档', description: '变更提案已归档' })
      setDeleteDialogOpen(false)
      setViewDialogOpen(false)
      setSelectedChange(null)
    } catch (err) {
      console.error('Failed to archive change:', err)
      toast({ title: '操作失败', description: '请稍后重试', variant: 'destructive' })
    }
  }

  // Dialog openers
  const openView = (c: ChangeProposal) => {
    setSelectedChange(c)
    setViewDialogOpen(true)
  }

  const openEdit = (c: ChangeProposal) => {
    setSelectedChange(c)
    setEditForm(changeToForm(c))
    setEditDialogOpen(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          提出变更方案，评估影响范围后再执行
        </p>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => {
            setCreateForm(EMPTY_CHANGE_FORM)
            setCreateDialogOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          新建变更提案
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-teal-500 animate-spin" />
        </div>
      ) : changes.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center mb-4">
              <GitCompare className="h-8 w-8 text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              还没有变更提案
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              提出故事变更方案，评估影响范围后再执行，避免破坏已有设定
            </p>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => {
                setCreateForm(EMPTY_CHANGE_FORM)
                setCreateDialogOpen(true)
              }}
            >
              <GitCompare className="h-4 w-4 mr-1.5" />
              新建变更提案
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {changes.filter(c => c.status !== 'archived').map((change, index) => {
              const statusInfo = getStatusInfo(change.status)
              const StatusIcon = statusInfo.icon
              return (
                <motion.div
                  key={change.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group hover:border-teal-200 dark:hover:border-teal-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{change.title}</h4>
                            <Badge variant="outline" className="text-[10px] border-muted">
                              {getChangeTypeLabel(change.type)}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] ${getStatusBadgeStyle(change.status)}`}>
                              <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          {change.description && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                              {change.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                            <span>创建: {new Date(change.createdAt).toLocaleDateString('zh-CN')}</span>
                            {change.updatedAt !== change.createdAt && (
                              <span>更新: {new Date(change.updatedAt).toLocaleDateString('zh-CN')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-3">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openView(change)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(change)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Show archived count */}
          {changes.filter(c => c.status === 'archived').length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              还有 {changes.filter(c => c.status === 'archived').length} 个已归档的提案
            </p>
          )}
        </div>
      )}

      {/* Create Change Proposal Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建变更提案</DialogTitle>
            <DialogDescription>提出故事变更方案，评估影响后再执行</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">标题 *</Label>
              <Input
                placeholder="如：主角身世修改、新增支线剧情"
                value={createForm.title}
                onChange={e => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">变更类型</Label>
              <Select
                value={createForm.type}
                onValueChange={v => setCreateForm({ ...createForm, type: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择变更类型" />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">描述</Label>
              <Textarea
                placeholder="描述变更的具体内容..."
                value={createForm.description}
                onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">影响范围</Label>
              <Input
                placeholder="如：第1-5章、角色设定、世界观"
                value={createForm.targetScope}
                onChange={e => setCreateForm({ ...createForm, targetScope: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">影响评估</Label>
              <Textarea
                placeholder="评估变更可能带来的影响..."
                value={createForm.impact}
                onChange={e => setCreateForm({ ...createForm, impact: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">执行计划</Label>
              <Textarea
                placeholder="如何执行此变更..."
                value={createForm.plan}
                onChange={e => setCreateForm({ ...createForm, plan: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              提交提案
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Change Proposal Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {selectedChange && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle>{selectedChange.title}</DialogTitle>
                  <Badge variant="outline" className="text-[10px] border-muted">
                    {getChangeTypeLabel(selectedChange.type)}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${getStatusBadgeStyle(selectedChange.status)}`}>
                    {getStatusInfo(selectedChange.status).label}
                  </Badge>
                </div>
                <DialogDescription>
                  创建于 {new Date(selectedChange.createdAt).toLocaleString('zh-CN')}
                  {selectedChange.updatedAt !== selectedChange.createdAt && (
                    <> · 更新于 {new Date(selectedChange.updatedAt).toLocaleString('zh-CN')}</>
                  )}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 py-2">
                  {selectedChange.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">描述</Label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedChange.description}</p>
                    </div>
                  )}
                  {selectedChange.targetScope && (
                    <div>
                      <Label className="text-xs text-muted-foreground">影响范围</Label>
                      <p className="mt-1 text-sm">{selectedChange.targetScope}</p>
                    </div>
                  )}
                  {selectedChange.impact && (
                    <div>
                      <Label className="text-xs text-muted-foreground">影响评估</Label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedChange.impact}</p>
                    </div>
                  )}
                  {selectedChange.plan && (
                    <div>
                      <Label className="text-xs text-muted-foreground">执行计划</Label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{selectedChange.plan}</p>
                    </div>
                  )}
                  {selectedChange.appliedAt && (
                    <div>
                      <Label className="text-xs text-muted-foreground">应用时间</Label>
                      <p className="mt-1 text-sm">{new Date(selectedChange.appliedAt).toLocaleString('zh-CN')}</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Status transition buttons */}
              <div className="border-t pt-4 space-y-3">
                <Label className="text-xs text-muted-foreground">状态操作</Label>
                <div className="flex items-center gap-2 flex-wrap">
                  {getNextStatus(selectedChange.status) && (
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                      disabled={saving}
                      onClick={() => handleStatusChange(getNextStatus(selectedChange.status)!)}
                    >
                      <ArrowRight className="h-3.5 w-3.5 mr-1" />
                      推进到「{getNextStatusLabel(selectedChange.status)}」
                    </Button>
                  )}
                  {selectedChange.status !== 'rejected' && selectedChange.status !== 'applied' && selectedChange.status !== 'archived' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 border-red-300 dark:border-red-700"
                      disabled={saving}
                      onClick={() => handleStatusChange(getRejectStatus(selectedChange.status)!)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      拒绝
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewDialogOpen(false)
                      openEdit(selectedChange)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setViewDialogOpen(false)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    归档
                  </Button>
                </div>
              </div>
        <DialogFooter>
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  关闭
                </Button>
        </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Change Proposal Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑变更提案</DialogTitle>
            <DialogDescription>修改提案内容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">标题 *</Label>
              <Input
                placeholder="提案标题"
                value={editForm.title}
                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">变更类型</Label>
              <Select
                value={editForm.type}
                onValueChange={v => setEditForm({ ...editForm, type: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择变更类型" />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_TYPES.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">描述</Label>
              <Textarea
                placeholder="描述变更的具体内容..."
                value={editForm.description}
                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">影响范围</Label>
              <Input
                placeholder="如：第1-5章、角色设定、世界观"
                value={editForm.targetScope}
                onChange={e => setEditForm({ ...editForm, targetScope: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">影响评估</Label>
              <Textarea
                placeholder="评估变更可能带来的影响..."
                value={editForm.impact}
                onChange={e => setEditForm({ ...editForm, impact: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">执行计划</Label>
              <Textarea
                placeholder="如何执行此变更..."
                value={editForm.plan}
                onChange={e => setEditForm({ ...editForm, plan: e.target.value })}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              取消
            </Button>
            <Button onClick={handleUpdate} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              <Save className="h-4 w-4 mr-1.5" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认归档提案</AlertDialogTitle>
            <AlertDialogDescription>
              确定要归档提案「{selectedChange?.title}」吗？归档后的提案将不再显示在列表中。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              归档
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────

export function VersionsView() {
  const { currentProject, versionTab, setVersionTab } = useAppStore()

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">请选择一个项目</p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-teal-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">版本管理</h2>
            <p className="text-sm text-muted-foreground">
              《{currentProject.title}》的版本快照与变更提案
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={versionTab} onValueChange={(v) => setVersionTab(v as 'snapshots' | 'changes')}>
          <TabsList className="mb-6">
            <TabsTrigger value="snapshots" className="gap-1.5">
              <Camera className="h-3.5 w-3.5" />
              快照
            </TabsTrigger>
            <TabsTrigger value="changes" className="gap-1.5">
              <GitCompare className="h-3.5 w-3.5" />
              变更提案
            </TabsTrigger>
          </TabsList>

          <TabsContent value="snapshots">
            <SnapshotsTab projectId={currentProject.id} />
          </TabsContent>

          <TabsContent value="changes">
            <ChangesTab projectId={currentProject.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
