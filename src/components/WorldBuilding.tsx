'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, Users, MapPin, ScrollText, Swords,
  Plus, Trash2, Sparkles, Loader2, Search,
  ChevronRight, Save, X,
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'
import type { Character, Location, LoreItem, Faction, WorldTab } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ModelSelector } from '@/components/ModelSelector'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from '@/hooks/use-toast'

const TABS: { key: WorldTab; label: string; icon: React.ElementType; aiType: string }[] = [
  { key: 'characters', label: '角色', icon: Users, aiType: 'character' },
  { key: 'locations', label: '地点', icon: MapPin, aiType: 'worldbuilding' },
  { key: 'lore', label: '设定', icon: ScrollText, aiType: 'worldbuilding' },
  { key: 'factions', label: '势力', icon: Swords, aiType: 'worldbuilding' },
]

const ROLE_OPTIONS = ['主角', '配角', '反派', '导师', '盟友', '对手', '路人', '其他']
const GENDER_OPTIONS = ['男', '女', '其他', '未知']
const LOCATION_CATEGORIES = ['城市', '村庄', '荒野', '山脉', '水域', '地下', '天空', '异界', '建筑', '其他']
const LORE_CATEGORIES = ['魔法体系', '种族', '历史', '文化', '宗教', '科技', '物品', '组织', '规则', '其他']

// ── Character Form Fields ──────────────────────────────────────────────
interface CharacterFormData {
  name: string; role: string; title: string; age: string; gender: string;
  description: string; personality: string; background: string; abilities: string;
  relationships: string; motivation: string; arc: string; tags: string;
}

const EMPTY_CHARACTER: CharacterFormData = {
  name: '', role: '', title: '', age: '', gender: '', description: '',
  personality: '', background: '', abilities: '', relationships: '',
  motivation: '', arc: '', tags: '',
}

// ── Location Form Fields ───────────────────────────────────────────────
interface LocationFormData {
  name: string; category: string; description: string; history: string;
  features: string; atmosphere: string; tags: string;
}

const EMPTY_LOCATION: LocationFormData = {
  name: '', category: '', description: '', history: '',
  features: '', atmosphere: '', tags: '',
}

// ── LoreItem Form Fields ───────────────────────────────────────────────
interface LoreItemFormData {
  name: string; category: string; description: string; details: string;
  constraints: string; tags: string;
}

const EMPTY_LORE_ITEM: LoreItemFormData = {
  name: '', category: '', description: '', details: '',
  constraints: '', tags: '',
}

// ── Faction Form Fields ────────────────────────────────────────────────
interface FactionFormData {
  name: string; description: string; goals: string; members: string;
  territory: string; power: string; tags: string;
}

const EMPTY_FACTION: FactionFormData = {
  name: '', description: '', goals: '', members: '',
  territory: '', power: '', tags: '',
}

// ── Utility ────────────────────────────────────────────────────────────
function parseTags(tagsStr: string | null): string[] {
  if (!tagsStr) return []
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
}

function joinTags(tags: string[]): string {
  return tags.join(', ')
}

// ── Main Component ─────────────────────────────────────────────────────
export function WorldBuilding() {
  const {
    worldTab, setWorldTab, currentProject,
    characters, setCharacters, selectedCharacter, setSelectedCharacter,
    locations, setLocations, selectedLocation, setSelectedLocation,
    loreItems, setLoreItems, selectedLoreItem, setSelectedLoreItem,
    factions, setFactions, selectedFaction, setSelectedFaction,
    selectedModel, setSelectedModel,
  } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)

  // ── Load data when tab switches ──────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!currentProject) return
    setLoading(true)
    try {
      switch (worldTab) {
        case 'characters': {
          const data = await api.getCharacters(currentProject.id)
          setCharacters(data as Character[])
          break
        }
        case 'locations': {
          const data = await api.getLocations(currentProject.id)
          setLocations(data as Location[])
          break
        }
        case 'lore': {
          const data = await api.getLoreItems(currentProject.id)
          setLoreItems(data as LoreItem[])
          break
        }
        case 'factions': {
          const data = await api.getFactions(currentProject.id)
          setFactions(data as Faction[])
          break
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err)
      toast({ title: '加载失败', description: '无法加载数据，请稍后重试', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [currentProject, worldTab, setCharacters, setLocations, setLoreItems, setFactions])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Clear selected when switching tabs
  useEffect(() => {
    setSelectedCharacter(null)
    setSelectedLocation(null)
    setSelectedLoreItem(null)
    setSelectedFaction(null)
    setSearchQuery('')
  }, [worldTab, setSelectedCharacter, setSelectedLocation, setSelectedLoreItem, setSelectedFaction])

  // ── Get current list and selected ────────────────────────────────────
  const getCurrentList = () => {
    switch (worldTab) {
      case 'characters': return characters
      case 'locations': return locations
      case 'lore': return loreItems
      case 'factions': return factions
    }
  }

  const getSelected = () => {
    switch (worldTab) {
      case 'characters': return selectedCharacter
      case 'locations': return selectedLocation
      case 'lore': return selectedLoreItem
      case 'factions': return selectedFaction
    }
  }

  const currentList = getCurrentList()
  const currentSelected = getSelected()

  const filteredList = (currentList as Array<{ name: string; tags?: string | null; description?: string | null }>).filter(item => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      item.name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.tags && item.tags.toLowerCase().includes(q))
    )
  })

  // ── Delete handler ───────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!currentProject) return
    try {
      switch (worldTab) {
        case 'characters':
          await api.deleteCharacter(currentProject.id, id)
          setCharacters(characters.filter(c => c.id !== id))
          if (selectedCharacter?.id === id) setSelectedCharacter(null)
          break
        case 'locations':
          await api.deleteLocation(currentProject.id, id)
          setLocations(locations.filter(l => l.id !== id))
          if (selectedLocation?.id === id) setSelectedLocation(null)
          break
        case 'lore':
          await api.deleteLoreItem(currentProject.id, id)
          setLoreItems(loreItems.filter(l => l.id !== id))
          if (selectedLoreItem?.id === id) setSelectedLoreItem(null)
          break
        case 'factions':
          await api.deleteFaction(currentProject.id, id)
          setFactions(factions.filter(f => f.id !== id))
          if (selectedFaction?.id === id) setSelectedFaction(null)
          break
      }
      toast({ title: '删除成功', description: '项目已删除' })
    } catch (err) {
      console.error('Failed to delete:', err)
      toast({ title: '删除失败', description: '无法删除，请稍后重试', variant: 'destructive' })
    }
  }

  // ── AI Generate ──────────────────────────────────────────────────────
  const handleAiGenerate = async () => {
    if (!currentProject) return
    setAiGenerating(true)
    try {
      const tab = TABS.find(t => t.key === worldTab)!
      const params: Record<string, string> = {}

      if (worldTab === 'characters') {
        if (selectedCharacter) {
          params.name = selectedCharacter.name
          params.role = selectedCharacter.role || ''
          params.existingInfo = selectedCharacter.description || ''
        }
      } else {
        params.direction = tab.label
      }

      const result = await api.aiGenerate(currentProject.id, tab.aiType, params, selectedModel)

      // Try to fill in AI-generated content
      if (result.result && typeof result.result === 'object') {
        const data = result.result as Record<string, unknown>
        switch (worldTab) {
          case 'characters':
            if (selectedCharacter) {
              const updated = {
                ...(data.personality && { personality: String(data.personality) }),
                ...(data.background && { background: String(data.background) }),
                ...(data.abilities && { abilities: String(data.abilities) }),
                ...(data.relationships && { relationships: String(data.relationships) }),
                ...(data.motivation && { motivation: String(data.motivation) }),
                ...(data.arc && { arc: String(data.arc) }),
                ...(data.description && { description: String(data.description) }),
              }
              const saved = await api.updateCharacter(currentProject.id, selectedCharacter.id, updated)
              const newChars = characters.map(c => c.id === saved.id ? saved as Character : c)
              setCharacters(newChars)
              setSelectedCharacter(saved as Character)
            }
            break
          case 'locations':
            if (selectedLocation) {
              const updated = {
                ...(data.history && { history: String(data.history) }),
                ...(data.features && { features: String(data.features) }),
                ...(data.atmosphere && { atmosphere: String(data.atmosphere) }),
                ...(data.description && { description: String(data.description) }),
              }
              const saved = await api.updateLocation(currentProject.id, selectedLocation.id, updated)
              const newLocs = locations.map(l => l.id === saved.id ? saved as Location : l)
              setLocations(newLocs)
              setSelectedLocation(saved as Location)
            }
            break
          case 'lore':
            if (selectedLoreItem) {
              const updated = {
                ...(data.details && { details: String(data.details) }),
                ...(data.constraints && { constraints: String(data.constraints) }),
                ...(data.description && { description: String(data.description) }),
              }
              const saved = await api.updateLoreItem(currentProject.id, selectedLoreItem.id, updated)
              const newLore = loreItems.map(l => l.id === saved.id ? saved as LoreItem : l)
              setLoreItems(newLore)
              setSelectedLoreItem(saved as LoreItem)
            }
            break
          case 'factions':
            if (selectedFaction) {
              const updated = {
                ...(data.goals && { goals: String(data.goals) }),
                ...(data.members && { members: String(data.members) }),
                ...(data.territory && { territory: String(data.territory) }),
                ...(data.power && { power: String(data.power) }),
                ...(data.description && { description: String(data.description) }),
              }
              const saved = await api.updateFaction(currentProject.id, selectedFaction.id, updated)
              const newFactions = factions.map(f => f.id === saved.id ? saved as Faction : f)
              setFactions(newFactions)
              setSelectedFaction(saved as Faction)
            }
            break
        }
      }
      toast({ title: 'AI生成完成', description: 'AI已自动填充生成的内容' })
    } catch (err) {
      console.error('AI generation failed:', err)
      toast({ title: 'AI生成失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setAiGenerating(false)
    }
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
    <div className="h-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
              <Globe className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">世界观构建</h2>
              <p className="text-sm text-muted-foreground">
                管理《{currentProject.title}》的世界观设定
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} compact />
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-4 flex-shrink-0 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = worldTab === tab.key
            const count = (() => {
              switch (tab.key) {
                case 'characters': return characters.length
                case 'locations': return locations.length
                case 'lore': return loreItems.length
                case 'factions': return factions.length
              }
            })()
            return (
              <Button
                key={tab.key}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={isActive ? 'bg-violet-600 hover:bg-violet-700' : ''}
                onClick={() => setWorldTab(tab.key)}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {tab.label}
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={`ml-1.5 text-[10px] px-1.5 py-0 h-4 ${
                      isActive ? 'bg-violet-400/30 text-white' : ''
                    }`}
                  >
                    {count}
                  </Badge>
                )}
              </Button>
            )
          })}
        </div>

        {/* Main content: Left list + Right detail */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left panel - Item list */}
          <div className="w-72 flex-shrink-0 flex flex-col">
            <Card className="flex-1 flex flex-col border-border/60">
              {/* Search + Create */}
              <div className="p-3 border-b space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="搜索..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <CreateDialog
                    worldTab={worldTab}
                    projectId={currentProject.id}
                    onCreated={loadData}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={handleAiGenerate}
                    disabled={aiGenerating || !currentSelected}
                  >
                    {aiGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    {currentSelected ? 'AI扩展' : 'AI生成'}
                  </Button>
                </div>
              </div>

              {/* List */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                    </div>
                  ) : filteredList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      {(() => {
                        const tab = TABS.find(t => t.key === worldTab)
                        const Icon = tab?.icon || Globe
                        return <Icon className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      })()}
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? '未找到匹配项' : `暂无${TABS.find(t => t.key === worldTab)?.label}`}
                      </p>
                      {!searchQuery && (
                        <p className="text-xs text-muted-foreground/70 mt-1">点击上方按钮创建</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredList.map((item) => {
                        const isSelected = currentSelected?.id === (item as { id: string }).id
                        const tags = parseTags((item as { tags?: string | null }).tags)
                        return (
                          <motion.div
                            key={(item as { id: string }).id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div
                              className={`p-2.5 rounded-lg cursor-pointer transition-all group ${
                                isSelected
                                  ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                                  : 'hover:bg-muted/50 border border-transparent'
                              }`}
                              onClick={() => {
                                switch (worldTab) {
                                  case 'characters': setSelectedCharacter(item as Character); break
                                  case 'locations': setSelectedLocation(item as Location); break
                                  case 'lore': setSelectedLoreItem(item as LoreItem); break
                                  case 'factions': setSelectedFaction(item as Faction); break
                                }
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-medium truncate">{item.name}</span>
                                  {'role' in item && (item as Character).role && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                      {(item as Character).role}
                                    </Badge>
                                  )}
                                  {'category' in item && (item as Location | LoreItem).category && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                      {(item as Location | LoreItem).category}
                                    </Badge>
                                  )}
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {item.description}
                                </p>
                              )}
                              {tags.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {tags.slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {tags.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">+{tags.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          </div>

          {/* Right panel - Detail / Edit form */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {currentSelected ? (
                <motion.div
                  key={currentSelected.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <DetailPanel
                    worldTab={worldTab}
                    item={currentSelected}
                    projectId={currentProject.id}
                    onDelete={handleDelete}
                    onSaved={loadData}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border-dashed border-2 h-full flex items-center justify-center min-h-[400px]">
                    <CardContent className="flex flex-col items-center py-16">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        {(() => {
                          const tab = TABS.find(t => t.key === worldTab)
                          const Icon = tab?.icon || Globe
                          return <Icon className="h-8 w-8 text-muted-foreground" />
                        })()}
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        选择一个{TABS.find(t => t.key === worldTab)?.label}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">
                        从左侧列表中选择一项查看详情，或创建新的{TABS.find(t => t.key === worldTab)?.label}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create Dialog ──────────────────────────────────────────────────────
function CreateDialog({
  worldTab,
  projectId,
  onCreated,
}: {
  worldTab: WorldTab
  projectId: string
  onCreated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [charForm, setCharForm] = useState<CharacterFormData>(EMPTY_CHARACTER)
  const [locForm, setLocForm] = useState<LocationFormData>(EMPTY_LOCATION)
  const [loreForm, setLoreForm] = useState<LoreItemFormData>(EMPTY_LORE_ITEM)
  const [factionForm, setFactionForm] = useState<FactionFormData>(EMPTY_FACTION)

  const resetForms = () => {
    setCharForm(EMPTY_CHARACTER)
    setLocForm(EMPTY_LOCATION)
    setLoreForm(EMPTY_LORE_ITEM)
    setFactionForm(EMPTY_FACTION)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) resetForms()
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      switch (worldTab) {
        case 'characters':
          if (!charForm.name.trim()) {
            toast({ title: '请输入角色名称', variant: 'destructive' })
            setCreating(false)
            return
          }
          await api.createCharacter(projectId, {
            name: charForm.name.trim(),
            role: charForm.role || undefined,
            title: charForm.title || undefined,
            age: charForm.age || undefined,
            gender: charForm.gender || undefined,
            description: charForm.description || undefined,
            tags: charForm.tags || undefined,
          })
          break
        case 'locations':
          if (!locForm.name.trim()) {
            toast({ title: '请输入地点名称', variant: 'destructive' })
            setCreating(false)
            return
          }
          await api.createLocation(projectId, {
            name: locForm.name.trim(),
            category: locForm.category || undefined,
            description: locForm.description || undefined,
            tags: locForm.tags || undefined,
          })
          break
        case 'lore':
          if (!loreForm.name.trim()) {
            toast({ title: '请输入设定名称', variant: 'destructive' })
            setCreating(false)
            return
          }
          await api.createLoreItem(projectId, {
            name: loreForm.name.trim(),
            category: loreForm.category || undefined,
            description: loreForm.description || undefined,
            tags: loreForm.tags || undefined,
          })
          break
        case 'factions':
          if (!factionForm.name.trim()) {
            toast({ title: '请输入势力名称', variant: 'destructive' })
            setCreating(false)
            return
          }
          await api.createFaction(projectId, {
            name: factionForm.name.trim(),
            description: factionForm.description || undefined,
            tags: factionForm.tags || undefined,
          })
          break
      }
      toast({ title: '创建成功', description: '新项目已创建' })
      onCreated()
      setOpen(false)
      resetForms()
    } catch (err) {
      console.error('Failed to create:', err)
      toast({ title: '创建失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
          <Plus className="h-3.5 w-3.5 mr-1" />
          新建
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>创建{TABS.find(t => t.key === worldTab)?.label}</DialogTitle>
          <DialogDescription>填写基本信息，创建后可在详情面板补充更多设定</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {worldTab === 'characters' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">名称 *</Label>
                <Input
                  placeholder="角色名称"
                  value={charForm.name}
                  onChange={e => setCharForm({ ...charForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">角色</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={charForm.role}
                    onChange={e => setCharForm({ ...charForm, role: e.target.value })}
                  >
                    <option value="">选择角色类型</option>
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">性别</Label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={charForm.gender}
                    onChange={e => setCharForm({ ...charForm, gender: e.target.value })}
                  >
                    <option value="">选择性别</option>
                    {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">称号</Label>
                  <Input
                    placeholder="角色的称号/别名"
                    value={charForm.title}
                    onChange={e => setCharForm({ ...charForm, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">年龄</Label>
                  <Input
                    placeholder="角色的年龄"
                    value={charForm.age}
                    onChange={e => setCharForm({ ...charForm, age: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">简介</Label>
                <Textarea
                  placeholder="简要描述角色"
                  value={charForm.description}
                  onChange={e => setCharForm({ ...charForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">标签（逗号分隔）</Label>
                <Input
                  placeholder="如: 强者, 神秘, 主线"
                  value={charForm.tags}
                  onChange={e => setCharForm({ ...charForm, tags: e.target.value })}
                />
              </div>
            </>
          )}

          {worldTab === 'locations' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">名称 *</Label>
                <Input
                  placeholder="地点名称"
                  value={locForm.name}
                  onChange={e => setLocForm({ ...locForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">类别</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={locForm.category}
                  onChange={e => setLocForm({ ...locForm, category: e.target.value })}
                >
                  <option value="">选择类别</option>
                  {LOCATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">描述</Label>
                <Textarea
                  placeholder="简要描述这个地点"
                  value={locForm.description}
                  onChange={e => setLocForm({ ...locForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">标签（逗号分隔）</Label>
                <Input
                  placeholder="如: 危险, 古老, 主线"
                  value={locForm.tags}
                  onChange={e => setLocForm({ ...locForm, tags: e.target.value })}
                />
              </div>
            </>
          )}

          {worldTab === 'lore' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">名称 *</Label>
                <Input
                  placeholder="设定名称"
                  value={loreForm.name}
                  onChange={e => setLoreForm({ ...loreForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">类别</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={loreForm.category}
                  onChange={e => setLoreForm({ ...loreForm, category: e.target.value })}
                >
                  <option value="">选择类别</option>
                  {LORE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">描述</Label>
                <Textarea
                  placeholder="简要描述这个设定"
                  value={loreForm.description}
                  onChange={e => setLoreForm({ ...loreForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">标签（逗号分隔）</Label>
                <Input
                  placeholder="如: 核心, 魔法, 战斗"
                  value={loreForm.tags}
                  onChange={e => setLoreForm({ ...loreForm, tags: e.target.value })}
                />
              </div>
            </>
          )}

          {worldTab === 'factions' && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">名称 *</Label>
                <Input
                  placeholder="势力名称"
                  value={factionForm.name}
                  onChange={e => setFactionForm({ ...factionForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">描述</Label>
                <Textarea
                  placeholder="简要描述这个势力"
                  value={factionForm.description}
                  onChange={e => setFactionForm({ ...factionForm, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">标签（逗号分隔）</Label>
                <Input
                  placeholder="如: 正义, 强大, 隐秘"
                  value={factionForm.tags}
                  onChange={e => setFactionForm({ ...factionForm, tags: e.target.value })}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
            取消
          </Button>
          <Button onClick={handleCreate} disabled={creating} className="bg-violet-600 hover:bg-violet-700">
            {creating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Panel ───────────────────────────────────────────────────────
function DetailPanel({
  worldTab,
  item,
  projectId,
  onDelete,
  onSaved,
}: {
  worldTab: WorldTab
  item: Character | Location | LoreItem | Faction
  projectId: string
  onDelete: (id: string) => Promise<void>
  onSaved: () => void
}) {
  const {
    characters, setCharacters, setSelectedCharacter,
    locations, setLocations, setSelectedLocation,
    loreItems, setLoreItems, setSelectedLoreItem,
    factions, setFactions, setSelectedFaction,
  } = useAppStore()

  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Edit form state
  const [charForm, setCharForm] = useState<CharacterFormData>(EMPTY_CHARACTER)
  const [locForm, setLocForm] = useState<LocationFormData>(EMPTY_LOCATION)
  const [loreForm, setLoreForm] = useState<LoreItemFormData>(EMPTY_LORE_ITEM)
  const [factionForm, setFactionForm] = useState<FactionFormData>(EMPTY_FACTION)

  // Populate form when item changes or edit mode starts
  useEffect(() => {
    if (!editMode) return
    switch (worldTab) {
      case 'characters': {
        const c = item as Character
        setCharForm({
          name: c.name, role: c.role || '', title: c.title || '', age: c.age || '',
          gender: c.gender || '', description: c.description || '', personality: c.personality || '',
          background: c.background || '', abilities: c.abilities || '', relationships: c.relationships || '',
          motivation: c.motivation || '', arc: c.arc || '', tags: c.tags || '',
        })
        break
      }
      case 'locations': {
        const l = item as Location
        setLocForm({
          name: l.name, category: l.category || '', description: l.description || '',
          history: l.history || '', features: l.features || '', atmosphere: l.atmosphere || '',
          tags: l.tags || '',
        })
        break
      }
      case 'lore': {
        const l = item as LoreItem
        setLoreForm({
          name: l.name, category: l.category || '', description: l.description || '',
          details: l.details || '', constraints: l.constraints || '', tags: l.tags || '',
        })
        break
      }
      case 'factions': {
        const f = item as Faction
        setFactionForm({
          name: f.name, description: f.description || '', goals: f.goals || '',
          members: f.members || '', territory: f.territory || '', power: f.power || '',
          tags: f.tags || '',
        })
        break
      }
    }
  }, [item, worldTab, editMode])

  const handleSave = async () => {
    setSaving(true)
    try {
      switch (worldTab) {
        case 'characters': {
          const saved = await api.updateCharacter(projectId, (item as Character).id, {
            name: charForm.name, role: charForm.role || null, title: charForm.title || null,
            age: charForm.age || null, gender: charForm.gender || null,
            description: charForm.description || null, personality: charForm.personality || null,
            background: charForm.background || null, abilities: charForm.abilities || null,
            relationships: charForm.relationships || null, motivation: charForm.motivation || null,
            arc: charForm.arc || null, tags: charForm.tags || null,
          }) as Character
          setCharacters(characters.map(c => c.id === saved.id ? saved : c))
          setSelectedCharacter(saved)
          break
        }
        case 'locations': {
          const saved = await api.updateLocation(projectId, (item as Location).id, {
            name: locForm.name, category: locForm.category || null,
            description: locForm.description || null, history: locForm.history || null,
            features: locForm.features || null, atmosphere: locForm.atmosphere || null,
            tags: locForm.tags || null,
          }) as Location
          setLocations(locations.map(l => l.id === saved.id ? saved : l))
          setSelectedLocation(saved)
          break
        }
        case 'lore': {
          const saved = await api.updateLoreItem(projectId, (item as LoreItem).id, {
            name: loreForm.name, category: loreForm.category || null,
            description: loreForm.description || null, details: loreForm.details || null,
            constraints: loreForm.constraints || null, tags: loreForm.tags || null,
          }) as LoreItem
          setLoreItems(loreItems.map(l => l.id === saved.id ? saved : l))
          setSelectedLoreItem(saved)
          break
        }
        case 'factions': {
          const saved = await api.updateFaction(projectId, (item as Faction).id, {
            name: factionForm.name, description: factionForm.description || null,
            goals: factionForm.goals || null, members: factionForm.members || null,
            territory: factionForm.territory || null, power: factionForm.power || null,
            tags: factionForm.tags || null,
          }) as Faction
          setFactions(factions.map(f => f.id === saved.id ? saved : f))
          setSelectedFaction(saved)
          break
        }
      }
      toast({ title: '保存成功' })
      setEditMode(false)
      onSaved()
    } catch (err) {
      console.error('Failed to save:', err)
      toast({ title: '保存失败', description: '请稍后重试', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditMode(false)
  }

  const tags = parseTags(
    'tags' in item ? (item as { tags: string | null }).tags : null
  )

  return (
    <Card className="h-full flex flex-col border-border/60">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-lg font-semibold truncate">
              {editMode ? `编辑: ${item.name}` : item.name}
            </h3>
            {!editMode && 'role' in item && (item as Character).role && (
              <Badge variant="secondary" className="shrink-0">
                {(item as Character).role}
              </Badge>
            )}
            {!editMode && 'category' in item && (item as Location | LoreItem).category && (
              <Badge variant="secondary" className="shrink-0">
                {(item as Location | LoreItem).category}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit} disabled={saving}>
                  <X className="h-3.5 w-3.5 mr-1" />
                  取消
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5 mr-1" />
                  )}
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  编辑
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要删除「{item.name}」吗？此操作无法撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => onDelete(item.id)}
                      >
                        删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
        {!editMode && tags.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {editMode ? (
            <EditModeForm
              worldTab={worldTab}
              charForm={charForm}
              setCharForm={setCharForm}
              locForm={locForm}
              setLocForm={setLocForm}
              loreForm={loreForm}
              setLoreForm={setLoreForm}
              factionForm={factionForm}
              setFactionForm={setFactionForm}
            />
          ) : (
            <ViewModeContent worldTab={worldTab} item={item} />
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

// ── Shared sub-components (must be defined outside render) ─────────────
function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
        <div className="w-1 h-4 rounded-full bg-violet-400" />
        {title}
      </h4>
      {children}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="mb-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-md p-2.5">
        {value}
      </p>
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
        <div className="w-1 h-4 rounded-full bg-violet-400" />
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

// ── View Mode (Read-Only) ──────────────────────────────────────────────
function ViewModeContent({
  worldTab,
  item,
}: {
  worldTab: WorldTab
  item: Character | Location | LoreItem | Faction
}) {

  switch (worldTab) {
    case 'characters': {
      const c = item as Character
      return (
        <>
          {/* Basic info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {c.role && (
              <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">角色</p>
                <p className="text-sm font-medium">{c.role}</p>
              </div>
            )}
            {c.gender && (
              <div className="bg-violet-50/50 dark:bg-violet-900/10 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">性别</p>
                <p className="text-sm font-medium">{c.gender}</p>
              </div>
            )}
            {c.age && (
              <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">年龄</p>
                <p className="text-sm font-medium">{c.age}</p>
              </div>
            )}
            {c.title && (
              <div className="bg-sky-50/50 dark:bg-sky-900/10 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground">称号</p>
                <p className="text-sm font-medium">{c.title}</p>
              </div>
            )}
          </div>
          <DetailSection title="描述"><DetailField label="" value={c.description} /></DetailSection>
          <DetailSection title="性格"><DetailField label="" value={c.personality} /></DetailSection>
          <DetailSection title="背景"><DetailField label="" value={c.background} /></DetailSection>
          <DetailSection title="能力"><DetailField label="" value={c.abilities} /></DetailSection>
          <DetailSection title="关系"><DetailField label="" value={c.relationships} /></DetailSection>
          <DetailSection title="动机"><DetailField label="" value={c.motivation} /></DetailSection>
          <DetailSection title="成长弧线"><DetailField label="" value={c.arc} /></DetailSection>
        </>
      )
    }

    case 'locations': {
      const l = item as Location
      return (
        <>
          {l.category && (
            <div className="mb-5">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {l.category}
              </Badge>
            </div>
          )}
          <DetailSection title="描述"><DetailField label="" value={l.description} /></DetailSection>
          <DetailSection title="历史"><DetailField label="" value={l.history} /></DetailSection>
          <DetailSection title="特色"><DetailField label="" value={l.features} /></DetailSection>
          <DetailSection title="氛围"><DetailField label="" value={l.atmosphere} /></DetailSection>
        </>
      )
    }

    case 'lore': {
      const li = item as LoreItem
      return (
        <>
          {li.category && (
            <div className="mb-5">
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                {li.category}
              </Badge>
            </div>
          )}
          <DetailSection title="描述"><DetailField label="" value={li.description} /></DetailSection>
          <DetailSection title="详细设定"><DetailField label="" value={li.details} /></DetailSection>
          <DetailSection title="限制与约束"><DetailField label="" value={li.constraints} /></DetailSection>
        </>
      )
    }

    case 'factions': {
      const f = item as Faction
      return (
        <>
          <DetailSection title="描述"><DetailField label="" value={f.description} /></DetailSection>
          <DetailSection title="目标"><DetailField label="" value={f.goals} /></DetailSection>
          <DetailSection title="成员"><DetailField label="" value={f.members} /></DetailSection>
          <DetailSection title="领地"><DetailField label="" value={f.territory} /></DetailSection>
          <DetailSection title="实力"><DetailField label="" value={f.power} /></DetailSection>
        </>
      )
    }
  }
}

// ── Edit Mode Form ─────────────────────────────────────────────────────
function EditModeForm({
  worldTab,
  charForm, setCharForm,
  locForm, setLocForm,
  loreForm, setLoreForm,
  factionForm, setFactionForm,
}: {
  worldTab: WorldTab
  charForm: CharacterFormData; setCharForm: (f: CharacterFormData) => void
  locForm: LocationFormData; setLocForm: (f: LocationFormData) => void
  loreForm: LoreItemFormData; setLoreForm: (f: LoreItemFormData) => void
  factionForm: FactionFormData; setFactionForm: (f: FactionFormData) => void
}) {
  switch (worldTab) {
    case 'characters':
      return (
        <>
          <FormSection title="基本信息">
            <div className="space-y-1.5">
              <Label className="text-xs">名称 *</Label>
              <Input value={charForm.name} onChange={e => setCharForm({ ...charForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">角色</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={charForm.role}
                  onChange={e => setCharForm({ ...charForm, role: e.target.value })}
                >
                  <option value="">选择角色类型</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">性别</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={charForm.gender}
                  onChange={e => setCharForm({ ...charForm, gender: e.target.value })}
                >
                  <option value="">选择性别</option>
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">称号</Label>
                <Input value={charForm.title} onChange={e => setCharForm({ ...charForm, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">年龄</Label>
                <Input value={charForm.age} onChange={e => setCharForm({ ...charForm, age: e.target.value })} />
              </div>
            </div>
          </FormSection>
          <FormSection title="描述">
            <Textarea value={charForm.description} onChange={e => setCharForm({ ...charForm, description: e.target.value })} rows={3} />
          </FormSection>
          <FormSection title="性格">
            <Textarea value={charForm.personality} onChange={e => setCharForm({ ...charForm, personality: e.target.value })} rows={3} placeholder="描述角色的性格特征..." />
          </FormSection>
          <FormSection title="背景">
            <Textarea value={charForm.background} onChange={e => setCharForm({ ...charForm, background: e.target.value })} rows={3} placeholder="角色的背景故事..." />
          </FormSection>
          <FormSection title="能力">
            <Textarea value={charForm.abilities} onChange={e => setCharForm({ ...charForm, abilities: e.target.value })} rows={3} placeholder="角色拥有的能力..." />
          </FormSection>
          <FormSection title="关系">
            <Textarea value={charForm.relationships} onChange={e => setCharForm({ ...charForm, relationships: e.target.value })} rows={3} placeholder="与其他角色的关系..." />
          </FormSection>
          <FormSection title="动机">
            <Textarea value={charForm.motivation} onChange={e => setCharForm({ ...charForm, motivation: e.target.value })} rows={2} placeholder="角色的核心动机..." />
          </FormSection>
          <FormSection title="成长弧线">
            <Textarea value={charForm.arc} onChange={e => setCharForm({ ...charForm, arc: e.target.value })} rows={2} placeholder="角色的发展轨迹..." />
          </FormSection>
          <FormSection title="标签">
            <Input value={charForm.tags} onChange={e => setCharForm({ ...charForm, tags: e.target.value })} placeholder="逗号分隔，如: 强者, 神秘, 主线" />
          </FormSection>
        </>
      )

    case 'locations':
      return (
        <>
          <FormSection title="基本信息">
            <div className="space-y-1.5">
              <Label className="text-xs">名称 *</Label>
              <Input value={locForm.name} onChange={e => setLocForm({ ...locForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">类别</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={locForm.category}
                onChange={e => setLocForm({ ...locForm, category: e.target.value })}
              >
                <option value="">选择类别</option>
                {LOCATION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </FormSection>
          <FormSection title="描述">
            <Textarea value={locForm.description} onChange={e => setLocForm({ ...locForm, description: e.target.value })} rows={3} />
          </FormSection>
          <FormSection title="历史">
            <Textarea value={locForm.history} onChange={e => setLocForm({ ...locForm, history: e.target.value })} rows={3} placeholder="地点的历史背景..." />
          </FormSection>
          <FormSection title="特色">
            <Textarea value={locForm.features} onChange={e => setLocForm({ ...locForm, features: e.target.value })} rows={3} placeholder="地点的特色和标志..." />
          </FormSection>
          <FormSection title="氛围">
            <Textarea value={locForm.atmosphere} onChange={e => setLocForm({ ...locForm, atmosphere: e.target.value })} rows={2} placeholder="地点的氛围和感觉..." />
          </FormSection>
          <FormSection title="标签">
            <Input value={locForm.tags} onChange={e => setLocForm({ ...locForm, tags: e.target.value })} placeholder="逗号分隔，如: 危险, 古老, 主线" />
          </FormSection>
        </>
      )

    case 'lore':
      return (
        <>
          <FormSection title="基本信息">
            <div className="space-y-1.5">
              <Label className="text-xs">名称 *</Label>
              <Input value={loreForm.name} onChange={e => setLoreForm({ ...loreForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">类别</Label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={loreForm.category}
                onChange={e => setLoreForm({ ...loreForm, category: e.target.value })}
              >
                <option value="">选择类别</option>
                {LORE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </FormSection>
          <FormSection title="描述">
            <Textarea value={loreForm.description} onChange={e => setLoreForm({ ...loreForm, description: e.target.value })} rows={3} />
          </FormSection>
          <FormSection title="详细设定">
            <Textarea value={loreForm.details} onChange={e => setLoreForm({ ...loreForm, details: e.target.value })} rows={4} placeholder="详细的世界观规则和设定..." />
          </FormSection>
          <FormSection title="限制与约束">
            <Textarea value={loreForm.constraints} onChange={e => setLoreForm({ ...loreForm, constraints: e.target.value })} rows={3} placeholder="这个设定的限制和约束条件..." />
          </FormSection>
          <FormSection title="标签">
            <Input value={loreForm.tags} onChange={e => setLoreForm({ ...loreForm, tags: e.target.value })} placeholder="逗号分隔，如: 核心, 魔法, 战斗" />
          </FormSection>
        </>
      )

    case 'factions':
      return (
        <>
          <FormSection title="基本信息">
            <div className="space-y-1.5">
              <Label className="text-xs">名称 *</Label>
              <Input value={factionForm.name} onChange={e => setFactionForm({ ...factionForm, name: e.target.value })} />
            </div>
          </FormSection>
          <FormSection title="描述">
            <Textarea value={factionForm.description} onChange={e => setFactionForm({ ...factionForm, description: e.target.value })} rows={3} />
          </FormSection>
          <FormSection title="目标">
            <Textarea value={factionForm.goals} onChange={e => setFactionForm({ ...factionForm, goals: e.target.value })} rows={3} placeholder="势力的核心目标..." />
          </FormSection>
          <FormSection title="成员">
            <Textarea value={factionForm.members} onChange={e => setFactionForm({ ...factionForm, members: e.target.value })} rows={3} placeholder="主要成员和其角色..." />
          </FormSection>
          <FormSection title="领地">
            <Textarea value={factionForm.territory} onChange={e => setFactionForm({ ...factionForm, territory: e.target.value })} rows={2} placeholder="势力控制的区域..." />
          </FormSection>
          <FormSection title="实力">
            <Textarea value={factionForm.power} onChange={e => setFactionForm({ ...factionForm, power: e.target.value })} rows={2} placeholder="势力的实力水平..." />
          </FormSection>
          <FormSection title="标签">
            <Input value={factionForm.tags} onChange={e => setFactionForm({ ...factionForm, tags: e.target.value })} placeholder="逗号分隔，如: 正义, 强大, 隐秘" />
          </FormSection>
        </>
      )
  }
}
