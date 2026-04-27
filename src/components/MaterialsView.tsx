'use client'

import { Archive, Plus } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function MaterialsView() {
  const { currentProject, materials } = useAppStore()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Archive className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">素材库</h2>
              <p className="text-sm text-muted-foreground">
                管理《{currentProject?.title}》的创作素材
              </p>
            </div>
          </div>
          <Button className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            添加素材
          </Button>
        </div>

        {materials.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Archive className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                素材库为空
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                收集灵感、参考模板、名词设定等创作素材，方便随时查阅
              </p>
              <div className="flex gap-2">
                <Button variant="outline">手动添加</Button>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                  AI生成素材
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.map((material) => (
              <Card key={material.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm line-clamp-1">{material.title}</h4>
                    {material.category && (
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">
                        {material.category}
                      </Badge>
                    )}
                  </div>
                  {material.content && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                      {material.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
