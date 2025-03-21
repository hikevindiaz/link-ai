import { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface SettingsCardProps {
  title: string
  icon: ReactNode
  children: ReactNode
}

export function SettingsCard({ title, icon, children }: SettingsCardProps) {
  return (
    <Card className="w-full overflow-hidden p-0">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
        <Label className="font-medium flex items-center gap-2">
          {icon}
          {title}
        </Label>
      </div>
      <div className="p-4">
        {children}
      </div>
    </Card>
  )
} 