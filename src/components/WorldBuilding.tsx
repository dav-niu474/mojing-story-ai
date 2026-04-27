'use client'

import { Globe, Users, MapPin, ScrollText, Swords } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const TABS = [
  { key: 'characters' as const, label: '角色', icon: Users },
  { key: 'locations' as const, label: '地点', icon: MapPin },
  { key: 'lore' as const, label: '设定', icon: ScrollText },
  { key: 'factions' as const, label: '势力', icon: Swords },
]

export function WorldBuilding() {
  const { worldTab, setWorldTab, currentProject } = useAppStore()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <Globe className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">世界观构建</h2>
            <p className="text-sm text-muted-foreground">
              管理《{currentProject?.title}》的世界观设定
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = worldTab === tab.key
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
              </Button>
            )
          })}
        </div>

        {/* Placeholder content */}
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              {(() => {
                const tab = TABS.find(t => t.key === worldTab)
                const Icon = tab?.icon || Globe
                return <Icon className="h-8 w-8 text-muted-foreground" />
              })()}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {TABS.find(t => t.key === worldTab)?.label}管理
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
              此模块正在建设中，将支持创建、编辑和AI生成
              {TABS.find(t => t.key === worldTab)?.label}
              信息
            </p>
            <Badge variant="secondary">即将推出</Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
