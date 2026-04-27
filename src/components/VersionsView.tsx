'use client'

import { GitBranch, Camera, GitCompare } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function VersionsView() {
  const { currentProject, snapshots, changes, versionTab, setVersionTab } = useAppStore()

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center">
            <GitBranch className="h-5 w-5 text-teal-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">版本管理</h2>
            <p className="text-sm text-muted-foreground">
              《{currentProject?.title}》的版本快照与变更提案
            </p>
          </div>
        </div>

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
            {snapshots.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    还没有快照
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    创建项目快照来保存当前状态，随时可以回滚到之前的版本
                  </p>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                    创建快照
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snapshot) => (
                  <Card key={snapshot.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{snapshot.label}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(snapshot.createdAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <Badge variant="outline">{snapshot.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="changes">
            {changes.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <GitCompare className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    还没有变更提案
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
                    提出故事变更方案，评估影响范围后再执行，避免破坏已有设定
                  </p>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                    新建变更提案
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {changes.map((change) => (
                  <Card key={change.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{change.title}</h4>
                          {change.description && (
                            <p className="text-xs text-muted-foreground mt-1">{change.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">{change.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
