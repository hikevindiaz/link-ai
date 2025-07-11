import { useState, useEffect } from "react"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Calendar, ShoppingBag, UserPlus, AlertCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Callout } from "@/components/callout"
import { RiInformationLine, RiBrushAiLine, RiChatSmileAiLine, RiWhatsappLine, RiMessage2Line, RiMessengerLine, RiInstagramLine, RiCustomerService2Line, RiMailLine, RiTicketLine, RiRobotLine, RiHeartLine, RiAlarmLine, RiBarChartLine, RiFileTextLine, RiDashboard3Line } from "@remixicon/react"
import type { Agent } from "@/types/agent"
import { ChannelItem } from "@/components/agents/channels/channel-item"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { toast } from "sonner"
import { useAgentConfig } from "@/hooks/use-agent-config"
import { UniversalSavingCard } from "@/components/universal-saving-card"

interface ActionsTabProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<void>
}

interface Calendar {
  id: string
  name: string
}

export function ActionsTab({ agent, onSave }: ActionsTabProps) {
  const {
    currentData,
    updateCurrentData,
    isDirty,
    isSaving,
    saveStatus,
    errorMessage,
    save,
    resetToInitialData
  } = useAgentConfig()
  
  const [isLoading, setIsLoading] = useState(true)
  const [calendars, setCalendars] = useState<Calendar[]>([])
  
  // Use current data from context, fallback to agent prop
  const activeAgent = currentData || agent
  const calendarEnabled = activeAgent?.calendarEnabled || false
  const selectedCalendarId = activeAgent?.calendarId || null
  const aviationStackEnabled = activeAgent?.aviationStackEnabled || false
  
  // Check if user has calendar integration enabled
  const [hasCalendarIntegration, setHasCalendarIntegration] = useState(false)
  // Check if user has aviationstack integration enabled
  const [hasAviationStackIntegration, setHasAviationStackIntegration] = useState(false)
  
  // Fetch calendars and check integration status on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!activeAgent) return
      
      setIsLoading(true)
      try {
        // Check integration status
        const integrationsResponse = await fetch(`/api/users/${activeAgent.userId}/integrations`)
          .then(res => res.json())
          .catch(() => ({ calendar: true, aviationstack: false })) // Default to enabled for calendar, disabled for aviationstack
        
        setHasCalendarIntegration(integrationsResponse.calendar || false)
        setHasAviationStackIntegration(integrationsResponse.aviationstack || false)
        
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
  }, [activeAgent?.userId])
  
  const handleCalendarToggle = (enabled: boolean) => {
    updateCurrentData({
      calendarEnabled: enabled,
      calendarId: enabled ? selectedCalendarId : null
    })
  }
  
  const handleCalendarSelect = (calendarId: string) => {
    updateCurrentData({
      calendarId: calendarId
    })
  }
  
  const handleAviationStackToggle = (enabled: boolean) => {
    updateCurrentData({
      aviationStackEnabled: enabled
    })
  }
  
  const handleSave = async () => {
    if (!isDirty) return
    
    try {
      await save(onSave)
      toast.success("Agent actions updated successfully")
    } catch (error) {
      console.error("Failed to save actions:", error)
      toast.error("Failed to save actions. Please try again.")
    }
  }
  
  const handleCancel = () => {
    resetToInitialData()
    toast.info("Changes discarded")
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </Card>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 rounded-xl">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-6 w-10 rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="space-y-6">
        {!hasCalendarIntegration ? (
          <Alert className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-sm font-semibold text-black dark:text-white">
              Calendar integration not available
            </AlertTitle>
            <AlertDescription className="text-sm text-neutral-500 dark:text-neutral-400">
              To enable calendar actions for your agent, you need to set up calendar integration first.
              <Button variant="ghost" className="px-0 h-auto ml-1 text-sm" asChild>
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
              className="rounded-xl"
            >
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Enable actions to give your agent the ability to perform tasks like scheduling appointments,
                processing orders, and more on your behalf.
              </span>
            </Callout>
            
            <Accordion type="multiple" className="w-full space-y-4">
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
                  <div className="px-3 py-2 space-y-4 bg-neutral-50 dark:bg-neutral-900 animate-in slide-in-from-top-5 duration-300">
                    <div className="space-y-2">
                      <Label htmlFor="calendar-select" className="text-sm font-medium text-black dark:text-white">
                        Select Calendar
                      </Label>
                      {calendars.length === 0 ? (
                        <div className="text-sm text-neutral-500 dark:text-neutral-400">
                          No calendars found. 
                          <Button variant="ghost" className="px-1 h-auto text-sm" asChild>
                            <Link href="/dashboard/calendar">Create a calendar</Link>
                          </Button>
                          first.
                        </div>
                      ) : (
                        <Select value={selectedCalendarId || ""} onValueChange={handleCalendarSelect}>
                          <SelectTrigger id="calendar-select" className="rounded-xl">
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
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Choose which calendar your agent will use for booking appointments.
                      </p>
                    </div>
                    
                    {selectedCalendarId && (
                      <div className="pt-2">
                        <Button variant="secondary" size="sm" className="rounded-xl" asChild>
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
                <div className="px-3 py-2 space-y-4 bg-neutral-50 dark:bg-neutral-900 animate-in slide-in-from-top-5 duration-300">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Coming soon! We're working on adding powerful automation features to help you:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Schedule Appointments</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Book meetings automatically</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Process Orders</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Handle purchases seamlessly</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Collect Leads</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Capture customer information</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Create Tickets</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage support requests</p>
                      </div>
                    </div>
                  </div>
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
                <div className="px-3 py-2 space-y-4 bg-neutral-50 dark:bg-neutral-900 animate-in slide-in-from-top-5 duration-300">
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                    Coming soon! We're working on adding powerful automation features to help you:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Schedule Appointments</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Book meetings automatically</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <ShoppingBag className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Process Orders</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Handle purchases seamlessly</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Collect Leads</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Capture customer information</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-black dark:text-white">Create Tickets</h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Manage support requests</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ChannelItem>
              
              {/* AviationStack Action */}
              <ChannelItem
                id="aviationstack"
                name="AviationStack"
                description="Access real-time flight data and aviation information"
                icon={<RiBarChartLine className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />}
                enabled={aviationStackEnabled}
                onToggle={handleAviationStackToggle}
                disabled={!hasAviationStackIntegration}
              >
                {aviationStackEnabled && (
                  <div className="px-3 py-2 space-y-4 bg-neutral-50 dark:bg-neutral-900 animate-in slide-in-from-top-5 duration-300">
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Your agent can now access real-time flight information, airport data, and aviation details to help users with:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></div>
                        Flight status and delays
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></div>
                        Airport information
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></div>
                        Airline details
                      </div>
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <div className="h-1.5 w-1.5 bg-indigo-500 rounded-full"></div>
                        Aircraft information
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Enable AviationStack integration in your settings to use this feature.
                    </div>
                  </div>
                )}
              </ChannelItem>
            </Accordion>
          </>
        )}
      </div>
      
      {/* Universal Saving Card */}
      <UniversalSavingCard
        isDirty={isDirty}
        isSaving={isSaving}
        saveStatus={saveStatus}
        errorMessage={errorMessage}
        onSave={handleSave}
        onCancel={handleCancel}
        position="fixed-bottom"
      />
    </div>
  )
} 