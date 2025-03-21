import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { Agent } from "@/types/agent"
import { Phone, Clock, MessageSquare, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { FloatingActionCard } from "@/components/agents/floating-action-card"

interface CallTabProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<void>
}

interface PhoneNumber {
  id: string
  number: string
  agentId: string | null
  agentName: string | null
  status: string
}

interface Voice {
  id: string
  voice_id: string
  name: string
  language?: string
  labels?: Record<string, any>
}

export function CallTab({ agent, onSave }: CallTabProps) {
  // Call settings
  const [checkUserPresence, setCheckUserPresence] = useState(agent.checkUserPresence || false)
  const [presenceMessageDelay, setPresenceMessageDelay] = useState(agent.presenceMessageDelay || 3)
  const [silenceTimeout, setSilenceTimeout] = useState(agent.silenceTimeout || 10)
  const [callTimeout, setCallTimeout] = useState(agent.callTimeout || 300)
  const [presenceMessage, setPresenceMessage] = useState(agent.presenceMessage || "Are you still there?")
  const [hangUpMessage, setHangUpMessage] = useState(agent.hangUpMessage || "I haven't heard from you, so I'll end the call. Feel free to call back when you're ready.")
  const [responseRate, setResponseRate] = useState<'rapid' | 'normal' | 'patient'>(agent.responseRate || "normal")
  
  // Phone and voice settings
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string | null>(agent.phoneNumber || null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(agent.voice || null)
  
  // Loading states
  const [isPhoneNumbersLoading, setIsPhoneNumbersLoading] = useState(true)
  const [isVoicesLoading, setIsVoicesLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Add state variables for tracking changes and save status
  const [isDirty, setIsDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Fetch phone numbers
  useEffect(() => {
    const fetchPhoneNumbers = async () => {
      setIsPhoneNumbersLoading(true)
      try {
        const response = await fetch('/api/twilio/phone-numbers')
        if (!response.ok) {
          throw new Error('Failed to fetch phone numbers')
        }
        const data = await response.json()
        const numbers = data.phoneNumbers || []
        
        // Filter for active numbers only
        const activeNumbers = numbers.filter((number: PhoneNumber) => number.status === 'active')
        setPhoneNumbers(activeNumbers)
      } catch (error) {
        console.error('Error fetching phone numbers:', error)
        toast.error('Failed to load phone numbers')
        setPhoneNumbers([])
      } finally {
        setIsPhoneNumbersLoading(false)
      }
    }

    fetchPhoneNumbers()
  }, [])

  // Fetch user voices
  useEffect(() => {
    const fetchVoices = async () => {
      setIsVoicesLoading(true)
      try {
        const response = await fetch('/api/user/voices')
        if (!response.ok) {
          throw new Error('Failed to fetch voices')
        }
        const data = await response.json()
        setVoices(data.voices || [])
      } catch (error) {
        console.error('Error fetching voices:', error)
        toast.error('Failed to load voices')
        setVoices([])
      } finally {
        setIsVoicesLoading(false)
      }
    }

    fetchVoices()
  }, [])

  // Track changes when state changes
  useEffect(() => {
    const hasCheckUserPresenceChanged = checkUserPresence !== (agent.checkUserPresence || false)
    const hasPresenceMessageDelayChanged = presenceMessageDelay !== (agent.presenceMessageDelay || 3)
    const hasSilenceTimeoutChanged = silenceTimeout !== (agent.silenceTimeout || 10)
    const hasCallTimeoutChanged = callTimeout !== (agent.callTimeout || 300)
    const hasPresenceMessageChanged = presenceMessage !== (agent.presenceMessage || "Are you still there?")
    const hasHangUpMessageChanged = hangUpMessage !== (agent.hangUpMessage || "I haven't heard from you, so I'll end the call. Feel free to call back when you're ready.")
    const hasResponseRateChanged = responseRate !== (agent.responseRate || "normal")
    const hasSelectedPhoneNumberChanged = selectedPhoneNumber !== agent.phoneNumber
    const hasSelectedVoiceChanged = selectedVoice !== agent.voice
    
    setIsDirty(
      hasCheckUserPresenceChanged || 
      hasPresenceMessageDelayChanged || 
      hasSilenceTimeoutChanged || 
      hasCallTimeoutChanged || 
      hasPresenceMessageChanged || 
      hasHangUpMessageChanged || 
      hasResponseRateChanged || 
      hasSelectedPhoneNumberChanged || 
      hasSelectedVoiceChanged
    )
  }, [
    checkUserPresence, 
    presenceMessageDelay, 
    silenceTimeout, 
    callTimeout, 
    presenceMessage, 
    hangUpMessage, 
    responseRate, 
    selectedPhoneNumber, 
    selectedVoice, 
    agent
  ])

  // Get available phone numbers (either unassigned or assigned to this agent)
  const getAvailablePhoneNumbers = () => {
    return phoneNumbers.filter(phone => !phone.agentId || phone.agentId === agent.id)
  }

  // Handle phone number selection
  const handlePhoneNumberChange = (value: string) => {
    // Store the phone number ID in local state without immediately saving
    const phoneNumberId = value === 'none' ? null : value
    
    // Get the phone number string for display purposes
    const selectedNumberObject = phoneNumbers.find(p => p.id === phoneNumberId)
    const phoneNumberString = selectedNumberObject ? selectedNumberObject.number : null
    
    // Just update the local state
    setSelectedPhoneNumber(phoneNumberString)
  }

  // Handle voice selection
  const handleVoiceChange = (value: string) => {
    // Store the voice ID in local state without immediately saving
    const voiceId = value === 'none' ? null : value
    setSelectedVoice(voiceId)
  }

  // Handle saving call settings
  const handleSaveSettings = async () => {
    setIsSaving(true)
    setSaveStatus('saving')
    setErrorMessage('')
    
    try {
      const saveData = {
        checkUserPresence,
        presenceMessageDelay,
        silenceTimeout,
        callTimeout,
        presenceMessage,
        hangUpMessage,
        responseRate,
        phoneNumber: selectedPhoneNumber,
        voice: selectedVoice,
      }
      
      // If we're assigning a phone number, we need to update the phone number's agent assignment
      if (selectedPhoneNumber) {
        const phoneNumberObj = phoneNumbers.find(p => p.number === selectedPhoneNumber)
        if (phoneNumberObj && phoneNumberObj.agentId !== agent.id) {
          const response = await fetch(`/api/twilio/phone-numbers/${phoneNumberObj.id}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: agent.id }),
          })
          
          if (!response.ok) {
            throw new Error('Failed to assign phone number')
          }
        }
      }
      
      await onSave(saveData)
      
      toast.success('Call settings saved successfully')
      setSaveStatus('success')
      
      // Reset the save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle')
      }, 3000)
    } catch (error) {
      console.error('Error saving call settings:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to save call settings: ${errorMsg}`)
      setSaveStatus('error')
      setErrorMessage(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }
  
  // Cancel handler to revert changes
  const handleCancel = () => {
    // Reset to original values
    setCheckUserPresence(agent.checkUserPresence || false)
    setPresenceMessageDelay(agent.presenceMessageDelay || 3)
    setSilenceTimeout(agent.silenceTimeout || 10)
    setCallTimeout(agent.callTimeout || 300)
    setPresenceMessage(agent.presenceMessage || "Are you still there?")
    setHangUpMessage(agent.hangUpMessage || "I haven't heard from you, so I'll end the call. Feel free to call back when you're ready.")
    setResponseRate(agent.responseRate || "normal")
    setSelectedPhoneNumber(agent.phoneNumber || null)
    setSelectedVoice(agent.voice || null)
    setSaveStatus('idle')
  }

  // Find the currently assigned phone number
  const currentPhoneNumber = phoneNumbers.find(p => p.number === agent.phoneNumber)

  return (
    <div className="mt-8 space-y-6">
      {/* Phone Number */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Label className="font-medium text-gray-900 dark:text-gray-100">Phone Number</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex-1">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
              {isPhoneNumbersLoading ? (
                <div className="flex items-center pl-9 h-10">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-gray-500" />
                  <span className="text-sm text-gray-500">Loading phone numbers...</span>
                </div>
              ) : (
                <Select 
                  value={(phoneNumbers.find(p => p.number === selectedPhoneNumber)?.id) || 'none'} 
                  onValueChange={handlePhoneNumberChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="pl-9 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <SelectValue placeholder="Select phone number" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No phone number</SelectItem>
                    {getAvailablePhoneNumbers().map((phone) => (
                      <SelectItem key={phone.id} value={phone.id}>
                        {phone.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getAvailablePhoneNumbers().length === 0 ? (
                  "No available phone numbers found. You can purchase a new one"
                ) : (
                  "You can manage your phone numbers"
                )}
              </p>
              <a href="/dashboard/phone-numbers" className="text-sm text-primary hover:underline">
                here
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Voice Selection */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Label className="font-medium text-gray-900 dark:text-gray-100">Voice</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex-1">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
              {isVoicesLoading ? (
                <div className="flex items-center pl-9 h-10">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-gray-500" />
                  <span className="text-sm text-gray-500">Loading voices...</span>
                </div>
              ) : (
                <Select 
                  value={selectedVoice || 'none'} 
                  onValueChange={handleVoiceChange}
                  disabled={isSaving}
                >
                  <SelectTrigger className="pl-9 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                    <SelectValue placeholder="Select voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Default Voice</SelectItem>
                    {voices.map((voice) => (
                      <SelectItem key={voice.voice_id} value={voice.voice_id}>
                        {voice.name} {voice.language ? `(${voice.language})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="mt-2 flex items-center gap-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {voices.length === 0 ? (
                  "No voices found. You can add voices from your voice library"
                ) : (
                  "You can manage your voices"
                )}
              </p>
              <a href="/dashboard/voices" className="text-sm text-primary hover:underline">
                here
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Check User Presence */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Label className="font-medium text-gray-900 dark:text-gray-100">Check User Presence</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enable User Presence Check</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Ask if user is still there after silence
              </p>
            </div>
            <Switch
              checked={checkUserPresence}
              onCheckedChange={setCheckUserPresence}
            />
          </div>
          {checkUserPresence && (
            <div className="mt-6">
              <div className="space-y-4">
                <Slider
                  defaultValue={[presenceMessageDelay]}
                  max={10}
                  min={1}
                  step={1}
                  onValueChange={(value) => setPresenceMessageDelay(value[0])}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current delay:
                  <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                    {presenceMessageDelay} seconds
                  </span>
                </p>
              </div>
              <p className="mt-4 text-sm/6 text-gray-500 dark:text-gray-400">
                Seconds to wait in silence before asking.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Silence Timeout */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Label className="font-medium text-gray-900 dark:text-gray-100">Silence Timeout</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex-1">
            <div className="space-y-4">
              <Slider
                defaultValue={[silenceTimeout]}
                max={30}
                min={3}
                step={1}
                onValueChange={(value) => setSilenceTimeout(value[0])}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current timeout:
                <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                  {silenceTimeout} seconds
                </span>
              </p>
            </div>
            <p className="mt-4 text-sm/6 text-gray-500 dark:text-gray-400">
              This will hang up the call after this many seconds of silence.
            </p>
          </div>
        </div>
      </Card>

      {/* Call Timeout */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Label className="font-medium text-gray-900 dark:text-gray-100">Call Termination</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex-1">
            <div className="space-y-4">
              <Slider
                defaultValue={[callTimeout]}
                max={900}
                min={30}
                step={30}
                onValueChange={(value) => setCallTimeout(value[0])}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Current timeout:
                <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                  {callTimeout} seconds
                </span>
              </p>
            </div>
            <p className="mt-4 text-sm/6 text-gray-500 dark:text-gray-400">
              The call will hang up after this many seconds of call time.
            </p>
          </div>
        </div>
      </Card>
      
      {/* Add Floating Action Card for unsaved changes */}
      {isDirty && (
        <FloatingActionCard 
          isSaving={isSaving}
          isDirty={isDirty}
          onSave={handleSaveSettings}
          onCancel={handleCancel}
          saveStatus={saveStatus}
          errorMessage={errorMessage}
        />
      )}
    </div>
  )
} 