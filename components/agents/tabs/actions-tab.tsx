import { useState, useEffect } from "react"
import { Accordion } from "@/components/ui/accordion"
import { Calendar, ShoppingBag, UserPlus, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/callout"
import { RiInformationLine } from "@remixicon/react"
import type { Agent } from "@/types/agent"
import { ChannelItem } from "@/components/agents/channels/channel-item"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { toast } from "sonner"
import { FloatingActionCard } from "@/components/agents/floating-action-card"

interface ActionsTabProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<void>
}

interface Calendar {
  id: string
  name: string
}

export function ActionsTab({ agent, onSave }: ActionsTabProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [calendarEnabled, setCalendarEnabled] = useState(agent.calendarEnabled || false)
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(agent.calendarId || null)
  const [hasChanged, setHasChanged] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  
  // Track initial values for dirty checking
  const [initialCalendarEnabled] = useState(agent.calendarEnabled || false)
  const [initialCalendarId] = useState(agent.calendarId || null)
  
  // Check if user has calendar integration enabled
  const [hasCalendarIntegration, setHasCalendarIntegration] = useState(false)
  
  // Fetch calendars and check integration status on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Check integration status
        const integrationsResponse = await fetch(`/api/users/${agent.userId}/integrations`)
          .then(res => res.json())
          .catch(() => ({ calendar: true })) // Default to enabled for now
        
        setHasCalendarIntegration(integrationsResponse.calendar || false)
        
        // Fetch calendars
        const calendarsResponse = await fetch('/api/calendars')
        if (calendarsResponse.ok) {
          const data = await calendarsResponse.json()
          setCalendars(data)
        }
      } catch (error) {
        console.error("Failed to fetch data:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [agent.userId])
  
  // Track changes
  useEffect(() => {
    const changed = calendarEnabled !== initialCalendarEnabled || selectedCalendarId !== initialCalendarId
    setHasChanged(changed)
  }, [calendarEnabled, selectedCalendarId, initialCalendarEnabled, initialCalendarId])
  
  const handleCalendarToggle = (enabled: boolean) => {
    setCalendarEnabled(enabled)
    if (!enabled) {
      setSelectedCalendarId(null)
    }
  }
  
  const handleCalendarSelect = (calendarId: string) => {
    setSelectedCalendarId(calendarId)
  }
  
  const handleSave = async () => {
    if (!hasChanged) return
    
    try {
      setIsSaving(true)
      setSaveStatus('saving')
      
      await onSave({
        calendarEnabled,
        calendarId: selectedCalendarId
      })
      
      setSaveStatus('success')
      toast.success("Agent actions updated successfully")
      
      setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error("Failed to save actions:", error)
      setSaveStatus('error')
      setErrorMessage(error instanceof Error ? error.message : "An error occurred")
      toast.error("Failed to save actions. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleCancel = () => {
    setCalendarEnabled(initialCalendarEnabled)
    setSelectedCalendarId(initialCalendarId)
    setSaveStatus('idle')
    setErrorMessage('')
    toast.info("Changes discarded")
  }

  return (
    <div className="space-y-6 relative min-h-[calc(100vh-200px)]">
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
        </div>
      ) : !hasCalendarIntegration ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Calendar integration not available</AlertTitle>
          <AlertDescription>
            To enable calendar actions for your agent, you need to set up calendar integration first.
            <Button variant="ghost" className="px-0 h-auto" asChild>
              <Link href="/dashboard/integrations">
                Go to Integrations
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Callout 
            title="Enhance your agent with Actions" 
            icon={RiInformationLine}
            className="mb-4"
          >
            Enable actions to give your agent the ability to perform tasks like scheduling appointments,
            processing orders, and more on your behalf.
          </Callout>
          
          <Accordion type="multiple" className="w-full">
            {/* Calendar Action */}
            <ChannelItem
              id="calendar"
              name="Calendar Booking"
              description="Allow your agent to schedule appointments"
              icon={<Calendar className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
              enabled={calendarEnabled}
              onToggle={handleCalendarToggle}
              disabled={!hasCalendarIntegration || calendars.length === 0}
            >
              {calendarEnabled && (
                <div className="px-4 py-4 space-y-4 animate-in slide-in-from-top-5 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="calendar-select">Select Calendar</Label>
                    {calendars.length === 0 ? (
                      <div className="text-sm text-neutral-500">
                        No calendars found. 
                        <Button variant="ghost" className="px-1 h-auto" asChild>
                          <Link href="/dashboard/calendar">Create a calendar</Link>
                        </Button>
                        first.
                      </div>
                    ) : (
                      <Select value={selectedCalendarId || ""} onValueChange={handleCalendarSelect}>
                        <SelectTrigger id="calendar-select">
                          <SelectValue placeholder="Select a calendar" />
                        </SelectTrigger>
                        <SelectContent>
                          {calendars.map(calendar => (
                            <SelectItem key={calendar.id} value={calendar.id}>
                              {calendar.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-sm text-neutral-500">
                      Choose which calendar your agent will use for booking appointments.
                    </p>
                  </div>
                  
                  {selectedCalendarId && (
                    <div className="pt-2">
                      <Button variant="secondary" size="sm" asChild>
                        <Link href="/dashboard/calendar">
                          Configure Calendar Settings
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </ChannelItem>
            
            {/* Order Processing Action */}
            <ChannelItem
              id="orders"
              name="Order Processing"
              description="Let your agent create and process orders"
              icon={<ShoppingBag className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
              enabled={false}
              onToggle={() => {}}
              disabled={true}
              isComingSoon={true}
            >
              <div className="space-y-4 animate-in slide-in-from-top-5 duration-300 px-4 py-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Order processing will be available soon.
                </p>
              </div>
            </ChannelItem>
            
            {/* Smart Forms Action */}
            <ChannelItem
              id="forms"
              name="Smart Forms"
              description="Let your agent create and process form submissions"
              icon={<UserPlus className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
              enabled={false}
              onToggle={() => {}}
              disabled={true}
              isComingSoon={true}
            >
              <div className="space-y-4 animate-in slide-in-from-top-5 duration-300 px-4 py-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Smart Forms will be available soon.
                </p>
              </div>
            </ChannelItem>
          </Accordion>
          
          {/* Floating action card for saving changes */}
          {hasChanged && (
            <FloatingActionCard 
              isSaving={isSaving}
              isDirty={hasChanged}
              onSave={handleSave}
              onCancel={handleCancel}
              saveStatus={saveStatus}
              errorMessage={errorMessage}
            />
          )}
        </>
      )}
    </div>
  )
} 