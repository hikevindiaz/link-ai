import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { Package, Shield, Star } from "lucide-react"

export function AddOnsTab() {
  const [premiumSupport, setPremiumSupport] = useState(false)
  const [advancedSecurity, setAdvancedSecurity] = useState(false)
  const [customFeatures, setCustomFeatures] = useState(false)

  return (
    <div className="mt-8 space-y-6">
      {/* Premium Support */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 bg-gray-950 px-4 py-3 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-gray-500 dark:text-white" />
            <Label className="font-medium text-gray-900 dark:text-white">Premium Support</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Enable Premium Support</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Get 24/7 premium support for your LinkRep
              </p>
            </div>
            <Switch
              checked={premiumSupport}
              onCheckedChange={setPremiumSupport}
            />
          </div>
        </div>
      </Card>

      {/* Advanced Security */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 bg-gray-950 px-4 py-3 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-500 dark:text-white" />
            <Label className="font-medium text-gray-900 dark:text-white">Advanced Security</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Enable Advanced Security</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Protect your data with advanced security features
              </p>
            </div>
            <Switch
              checked={advancedSecurity}
              onCheckedChange={setAdvancedSecurity}
            />
          </div>
        </div>
      </Card>

      {/* Custom Features */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 bg-gray-950 px-4 py-3 dark:bg-gray-950">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500 dark:text-white" />
            <Label className="font-medium text-gray-900 dark:text-white">Custom Features</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Enable Custom Features</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Add custom features to your LinkRep
              </p>
            </div>
            <Switch
              checked={customFeatures}
              onCheckedChange={setCustomFeatures}
            />
          </div>
        </div>
      </Card>
    </div>
  )
}