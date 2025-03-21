import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/Button"
import { CustomerTicketsSettings } from "../settings/customer-tickets-settings"
import type { Agent } from "@/types/agent"
import { Switch } from "@/components/ui/switch"
import { FormField, FormControl } from "@/components/ui/form"

interface AddonConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (config: any) => void
  addonId: string
  agent: Agent
}

export function AddonConfigModal({ 
  isOpen, 
  onClose, 
  onSave, 
  addonId,
  agent 
}: AddonConfigModalProps) {
  const handleSubmit = async (data: any) => {
    await onSave(data)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Configure {getAddonTitle(addonId)}</DialogTitle>
        </DialogHeader>
        
        {addonId === 'ticket-system' && (
          <CustomerTicketsSettings 
            chatbotId={agent.id}
            onSubmit={handleSubmit}
            renderSwitch={(form) => (
              <div className="absolute right-6 top-6">
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Enable user inquiry feature"
                      />
                    </FormControl>
                  )}
                />
              </div>
            )}
          />
        )}
        
        {/* Add other addon configurations here when they become available */}
        
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit"
            form="customer-tickets-form"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function getAddonTitle(addonId: string): string {
  switch (addonId) {
    case 'ticket-system':
      return 'Customer Tickets'
    case 'satisfaction-survey':
      return 'Satisfaction Surveys'
    case 'lead-forms':
      return 'Lead Forms'
    case 'lead-scoring':
      return 'Lead Scoring'
    case 'order-tracking':
      return 'Order Tracking'
    case 'payment-processing':
      return 'Payment Processing'
    default:
      return 'Add-on'
  }
} 