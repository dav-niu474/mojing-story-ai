'use client'

import { useState } from 'react'
import { Cpu, ChevronDown, Star, Zap, Brain, Sparkles, ShieldCheck, AlertTriangle, CircleDot } from 'lucide-react'
import { AI_MODELS, MODEL_CATEGORIES, getModelById, getModelsByCategory } from '@/lib/models'
import type { ModelCategory, AiModel } from '@/lib/models'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  selectedModel: string
  onModelChange: (modelId: string) => void
  compact?: boolean
}

const TAG_ICONS: Record<string, React.ReactNode> = {
  '推荐': <Star className="h-3 w-3 text-amber-500" />,
  '最新': <Zap className="h-3 w-3 text-emerald-500" />,
  '深度思考': <Brain className="h-3 w-3 text-violet-500" />,
}

function ModelStatusIcon({ model }: { model: AiModel }) {
  switch (model.status) {
    case 'active':
      return <CircleDot className="h-3 w-3 text-emerald-500" title="稳定可用" />
    case 'thinking':
      return <Brain className="h-3 w-3 text-violet-500" title="思考模式（内容在推理字段）" />
    case 'down':
      return <AlertTriangle className="h-3 w-3 text-red-500" title="当前不可用" />
    case 'error':
      return <AlertTriangle className="h-3 w-3 text-orange-500" title="模型错误" />
    default:
      return null
  }
}

export function ModelSelector({ selectedModel, onModelChange, compact = false }: ModelSelectorProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const currentModel = getModelById(selectedModel)
  const displayName = currentModel?.name || selectedModel

  const filteredModels = AI_MODELS.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.providerLabel.includes(search) ||
    m.description.includes(search) ||
    m.tags.some(t => t.includes(search))
  )

  // Group filtered models by category
  const categoriesMap = getModelsByCategory()
  const groupedModels = MODEL_CATEGORIES.map(cat => ({
    ...cat,
    models: filteredModels.filter(m => m.category === cat.key),
  })).filter(g => g.models.length > 0)

  const activeCount = AI_MODELS.filter(m => m.status === 'active').length
  const thinkingCount = AI_MODELS.filter(m => m.status === 'thinking').length
  const downCount = AI_MODELS.filter(m => m.status === 'down' || m.status === 'error').length

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'default'}
          className={cn(
            'gap-1.5 h-8 text-xs font-medium',
            compact && 'h-7 px-2 text-[11px]'
          )}
        >
          <Cpu className={cn('text-amber-500', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
          <span className="truncate max-w-[120px]">{displayName}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="搜索模型名称、厂商、标签..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <ScrollArea className="max-h-[420px]">
          <div className="p-2">
            {/* Recommended models quick access - only active models */}
            {!search && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                    <Star className="h-3 w-3" /> 推荐模型（稳定可用）
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {AI_MODELS.filter(m => m.recommended && m.status === 'active').map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onModelChange(m.id); setOpen(false); }}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-colors text-xs',
                        selectedModel === m.id
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{m.providerLabel}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Separator className="my-1" />
              </>
            )}

            {/* All models grouped by category */}
            {groupedModels.map(group => (
              <div key={group.key}>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  {group.models.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { onModelChange(m.id); setOpen(false); }}
                      className={cn(
                        'flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left transition-colors',
                        selectedModel === m.id
                          ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200'
                          : 'hover:bg-muted',
                        m.status === 'down' && 'opacity-60',
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium">{m.name}</span>
                          <ModelStatusIcon model={m} />
                          <span className="text-[10px] text-muted-foreground">{m.providerLabel}</span>
                          {m.verified && m.status === 'active' && (
                            <ShieldCheck className="h-3 w-3 text-emerald-500" title="已验证可用" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{m.description}</p>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {m.tags.slice(0, 4).map(tag => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className={cn(
                                'text-[9px] px-1.5 py-0 h-4 font-medium',
                                tag === '推荐' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
                                tag === '最新' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                                tag === '深度思考' && 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
                                tag === '中文强' && 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                                tag === '快速' && 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
                                tag === '推理强' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
                                tag === '稳定' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
                              )}
                            >
                              {TAG_ICONS[tag]}{tag}
                            </Badge>
                          ))}
                          {m.contextLength >= 200000 && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                              {m.contextLength / 1000}K上下文
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedModel === m.id && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <Separator className="my-1" />
              </div>
            ))}

            {filteredModels.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                未找到匹配的模型
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            <CircleDot className="h-2.5 w-2.5 inline text-emerald-500" /> {activeCount}可用
            <span className="mx-1">·</span>
            <Brain className="h-2.5 w-2.5 inline text-violet-500" /> {thinkingCount}思考
            <span className="mx-1">·</span>
            <AlertTriangle className="h-2.5 w-2.5 inline text-red-500" /> {downCount}不可用
            <span className="mx-1">·</span>
            Powered by NVIDIA NIM
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
