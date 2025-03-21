import { Icons } from "@/components/icons"
import { SettingsCard } from "../cards/settings-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Callout } from "@/components/callout"
import { RiInformationLine } from "@remixicon/react"
import { Settings } from "lucide-react"
import type { Agent } from "@/types/agent"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { AddonConfigModal } from "../modals/addon-config-modal"

interface AddonsTabProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<void>
}

interface AddonCategory {
  id: string
  name: string
  description: string
  icon: keyof typeof Icons
  addons: {
    id: string
    name: string
    description: string
    isActive: boolean
  }[]
}

export function AddonsTab({ agent, onSave }: AddonsTabProps) {
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null)

  const handleConfigureAddon = (addonId: string) => {
    setSelectedAddon(addonId)
  }

  const handleCloseModal = () => {
    setSelectedAddon(null)
  }

  const handleSaveConfig = async (config: any) => {
    // Handle saving the configuration
    await onSave(config)
    handleCloseModal()
  }

  const categories: AddonCategory[] = [
    {
      id: "customer-service",
      name: "Customer Service",
      description: "Enhance your customer support capabilities",
      icon: "messagesSquare",
      addons: [
        {
          id: "ticket-system",
          name: "Customer Tickets",
          description: "Create and manage support tickets automatically",
          isActive: true
        },
        {
          id: "satisfaction-survey",
          name: "Satisfaction Surveys",
          description: "Collect feedback after conversations",
          isActive: false
        }
      ]
    },
    {
      id: "leads",
      name: "Lead Generation",
      description: "Capture and manage leads from your conversations",
      icon: "user",
      addons: [
        {
          id: "lead-forms",
          name: "Lead Forms",
          description: "Collect visitor information through customizable forms",
          isActive: false
        },
        {
          id: "lead-scoring",
          name: "Lead Scoring",
          description: "Automatically score leads based on conversation quality",
          isActive: false
        }
      ]
    },
    {
      id: "orders",
      name: "Order Management",
      description: "Handle orders and transactions seamlessly",
      icon: "billing",
      addons: [
        {
          id: "order-tracking",
          name: "Order Tracking",
          description: "Let customers track their orders and get updates",
          isActive: false
        },
        {
          id: "payment-processing",
          name: "Payment Processing",
          description: "Process payments directly through chat",
          isActive: false
        }
      ]
    }
  ]

  return (
    <>
      <div className="mt-8 space-y-6 font-medium text-gray-900 dark:text-gray-100">
        <SettingsCard
          title="Add-on Categories"
          icon={<Icons.badgeplus className="h-4 w-4" />}
        >
          <div className="flex-1">
            <Callout 
              title="Enhance Your LinkRep" 
              icon={RiInformationLine}
              className="mb-6"
            >
              Choose from our range of add-ons to extend your LinkRep&apos;s functionality.
            </Callout>

            <div className="space-y-4">
              {categories.map((category) => {
                const CategoryIcon = Icons[category.icon]
                return (
                  <Card key={category.id} className="p-4 bg-white dark:bg-gray-900/50">
                    <div className="space-y-4 ">
                      <div className="flex items-start gap-3">
                        <CategoryIcon className="h-5 w-5 text-gray-500 mt-1" />
                        <div>
                          <h3 className="font-medium">{category.name}</h3>
                          <p className="text-sm text-gray-500">
                            {category.description}
                          </p>
                        </div>
                      </div>
                      <div className="pl-8 space-y-3">
                        {category.addons.map((addon) => (
                          <div 
                            key={addon.id}
                            className="flex items-start justify-between border-l-2 border-gray-100 pl-4"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{addon.name}</p>
                                {!addon.isActive && (
                                  <Badge variant="neutral">Coming Soon</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {addon.description}
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              size="icon"
                              onClick={() => handleConfigureAddon(addon.id)}
                              className="h-8 w-8 p-0"
                              disabled={!addon.isActive}
                            >
                              <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        </SettingsCard>
      </div>

      <AddonConfigModal
        isOpen={selectedAddon !== null}
        onClose={handleCloseModal}
        onSave={handleSaveConfig}
        addonId={selectedAddon || ''}
        agent={agent}
      />
    </>
  )
} 