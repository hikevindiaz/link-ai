import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import type { Agent } from "@/types/agent"
import { Phone, Clock, MessageSquare, Loader2, AlertCircle } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { Icons } from "@/components/icons"
import { SettingsTabWrapper } from "@/components/agents/settings-tab-wrapper"

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
  // Use a ref to track if we've already initialized our local state
  const hasInitialized = useRef(false);
  const saveCount = useRef(0);
  // Add a new state to track if we've completed the full initialization process
  const [isFullyInitialized, setIsFullyInitialized] = useState(false);
  
  // Call settings - initialize with agent values OR previously saved values
  const [checkUserPresence, setCheckUserPresence] = useState<boolean>(false)
  const [presenceMessageDelay, setPresenceMessageDelay] = useState<number>(3)
  const [silenceTimeout, setSilenceTimeout] = useState<number>(10)
  const [callTimeout, setCallTimeout] = useState<number>(300)
  const [presenceMessage, setPresenceMessage] = useState<string>("Are you still there?")
  const [hangUpMessage, setHangUpMessage] = useState<string>("I haven't heard from you, so I'll end the call. Feel free to call back when you're ready.")
  const [responseRate, setResponseRate] = useState<'rapid' | 'normal' | 'patient'>("normal")
  
  // Phone and voice settings
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  
  // Loading states
  const [isPhoneNumbersLoading, setIsPhoneNumbersLoading] = useState(true)
  const [isVoicesLoading, setIsVoicesLoading] = useState(true)

  // Track if form has changes
  const [isDirty, setIsDirty] = useState(false)
  
  // Local storage key for this agent's call settings
  const localStorageKey = `agent-call-settings-${agent.id}`;
  
  // Initial values for comparison and reset
  // This will start with default values but updated after first save
  const [initialValues, setInitialValues] = useState({
    checkUserPresence: false,
    presenceMessageDelay: 3,
    silenceTimeout: 10,
    callTimeout: 300,
    presenceMessage: "Are you still there?",
    hangUpMessage: "I haven't heard from you, so I'll end the call. Feel free to call back when you're ready.",
    responseRate: "normal" as 'rapid' | 'normal' | 'patient',
    phoneNumber: null as string | null,
    voice: null as string | null,
  })

  // Try to load saved settings from localStorage on component mount
  useEffect(() => {
    // Only initialize once
    if (hasInitialized.current) return;
    
    try {
      const savedSettings = localStorage.getItem(localStorageKey);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        console.log('Loaded settings from localStorage:', parsed);
        
        // Update state with saved values
        setCheckUserPresence(parsed.checkUserPresence);
        setPresenceMessageDelay(parsed.presenceMessageDelay);
        setSilenceTimeout(parsed.silenceTimeout);
        setCallTimeout(parsed.callTimeout);
        setPresenceMessage(parsed.presenceMessage);
        setHangUpMessage(parsed.hangUpMessage);
        setResponseRate(parsed.responseRate);
        setSelectedVoice(parsed.voice);
        
        // Also update initialValues for dirty checking
        setInitialValues(parsed);
      } else {
        // If no localStorage, try to use agent values if they exist
        initializeFromAgent(agent);
      }
      
      hasInitialized.current = true;
    } catch (error) {
      console.error('Error loading saved settings:', error);
      // If anything goes wrong, initialize from agent
      initializeFromAgent(agent);
      hasInitialized.current = true;
    }
  }, [agent.id]);

  // Helper function to initialize state from agent
  const initializeFromAgent = (agent: Agent) => {
    console.log('Initializing from agent:', agent);
    
    // Only use agent values if they're defined, otherwise use defaults
    if (agent.checkUserPresence !== undefined) setCheckUserPresence(agent.checkUserPresence);
    if (agent.presenceMessageDelay !== undefined) setPresenceMessageDelay(agent.presenceMessageDelay);
    if (agent.silenceTimeout !== undefined) setSilenceTimeout(agent.silenceTimeout);
    if (agent.callTimeout !== undefined) setCallTimeout(agent.callTimeout);
    if (agent.presenceMessage) setPresenceMessage(agent.presenceMessage);
    if (agent.hangUpMessage) setHangUpMessage(agent.hangUpMessage);
    if (agent.responseRate) setResponseRate(agent.responseRate);
    if (agent.voice) setSelectedVoice(agent.voice);
    
    // Update initialValues to match
    setInitialValues({
      checkUserPresence: agent.checkUserPresence || false,
      presenceMessageDelay: agent.presenceMessageDelay || 3,
      silenceTimeout: agent.silenceTimeout || 10,
      callTimeout: agent.callTimeout || 300,
      presenceMessage: agent.presenceMessage || "Are you still there?",
      hangUpMessage: agent.hangUpMessage || "I haven't heard from you, so I'll end the call. Feel free to call back when you're ready.",
      responseRate: agent.responseRate || "normal",
      phoneNumber: agent.phoneNumber || null,
      voice: agent.voice || null,
    });
  };

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
        
        // Set the selected phone number ID based on initial values
        const phoneNumber = initialValues.phoneNumber || agent.phoneNumber;
        if (phoneNumber) {
          const matchingPhone = activeNumbers.find(p => p.number === phoneNumber)
          if (matchingPhone) {
            setSelectedPhoneNumberId(matchingPhone.id)
          } else {
            setSelectedPhoneNumberId(null)
          }
        } else {
          setSelectedPhoneNumberId(null)
        }
      } catch (error) {
        console.error('Error fetching phone numbers:', error)
        toast.error('Failed to load phone numbers')
        setPhoneNumbers([])
      } finally {
        setIsPhoneNumbersLoading(false)
        // Mark full initialization as complete after phone numbers are loaded
        setIsFullyInitialized(true)
      }
    }

    fetchPhoneNumbers()
  }, [initialValues.phoneNumber, agent.phoneNumber])

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
  }, [selectedVoice, initialValues.voice, agent.voice])

  // Track changes when state changes
  useEffect(() => {
    // Don't set isDirty until phone numbers have loaded
    if (isPhoneNumbersLoading) return;
    
    // Get the current phone number string that would be saved
    const phoneNumberObj = phoneNumbers.find(p => p.id === selectedPhoneNumberId)
    const currentPhoneNumberString = phoneNumberObj ? phoneNumberObj.number : null
    
    // Compare with initial values
    const hasPhoneNumberChanged = currentPhoneNumberString !== initialValues.phoneNumber
    const hasCheckUserPresenceChanged = checkUserPresence !== initialValues.checkUserPresence
    const hasPresenceMessageDelayChanged = presenceMessageDelay !== initialValues.presenceMessageDelay
    const hasSilenceTimeoutChanged = silenceTimeout !== initialValues.silenceTimeout
    const hasCallTimeoutChanged = callTimeout !== initialValues.callTimeout
    const hasPresenceMessageChanged = presenceMessage !== initialValues.presenceMessage
    const hasHangUpMessageChanged = hangUpMessage !== initialValues.hangUpMessage
    const hasResponseRateChanged = responseRate !== initialValues.responseRate
    const hasSelectedVoiceChanged = selectedVoice !== initialValues.voice
    
    const newIsDirty = 
      hasPhoneNumberChanged ||
      hasCheckUserPresenceChanged || 
      hasPresenceMessageDelayChanged || 
      hasSilenceTimeoutChanged || 
      hasCallTimeoutChanged || 
      hasPresenceMessageChanged || 
      hasHangUpMessageChanged || 
      hasResponseRateChanged || 
      hasSelectedVoiceChanged;
    
    setIsDirty(newIsDirty);
  }, [
    selectedPhoneNumberId,
    checkUserPresence, 
    presenceMessageDelay, 
    silenceTimeout, 
    callTimeout, 
    presenceMessage, 
    hangUpMessage, 
    responseRate, 
    selectedVoice,
    isPhoneNumbersLoading,
    phoneNumbers,
    initialValues
  ])

  // Get available phone numbers (either unassigned or assigned to this agent)
  const getAvailablePhoneNumbers = () => {
    return phoneNumbers.filter(phone => !phone.agentId || phone.agentId === agent.id)
  }

  // Handle phone number selection
  const handlePhoneNumberChange = (value: string) => {
    setSelectedPhoneNumberId(value === 'none' ? null : value)
  }

  // Handle voice selection
  const handleVoiceChange = (value: string) => {
    setSelectedVoice(value === 'none' ? null : value)
  }

  // Handle saving call settings
  const handleSaveSettings = async () => {
    try {
      saveCount.current += 1;
      
      // Get the selected phone number object
      const phoneNumberObj = phoneNumbers.find(p => p.id === selectedPhoneNumberId)
      const phoneNumberString = phoneNumberObj ? phoneNumberObj.number : null
      
      // Build the save data
      const saveData = {
        checkUserPresence,
        presenceMessageDelay,
        silenceTimeout,
        callTimeout,
        presenceMessage,
        hangUpMessage,
        responseRate,
        phoneNumber: phoneNumberString,
        voice: selectedVoice,
      }
      
      // Save to the agent
      await onSave(saveData)
      
      // If phone number assignment changed, we need to update the phone number's agent assignment
      const previousPhoneNumberId = phoneNumbers.find(p => p.number === initialValues.phoneNumber)?.id || null;
      
      if (selectedPhoneNumberId !== previousPhoneNumberId) {
        // If there was a previous phone number, unassign it
        if (previousPhoneNumberId && previousPhoneNumberId !== selectedPhoneNumberId) {
          const unassignResponse = await fetch(`/api/twilio/phone-numbers/${previousPhoneNumberId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: null }),
          });
          
          if (!unassignResponse.ok) {
            throw new Error('Failed to unassign previous phone number');
          }
        }
        
        // If there's a new phone number, assign it
        if (selectedPhoneNumberId) {
          const assignResponse = await fetch(`/api/twilio/phone-numbers/${selectedPhoneNumberId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: agent.id }),
          });
          
          if (!assignResponse.ok) {
            throw new Error('Failed to assign new phone number');
          }
          
          // Update the local phoneNumbers state to reflect the assignment
          setPhoneNumbers(prev => prev.map(phone => {
            if (phone.id === selectedPhoneNumberId) {
              return { ...phone, agentId: agent.id, agentName: agent.name };
            } else if (phone.id === previousPhoneNumberId) {
              return { ...phone, agentId: null, agentName: null };
            }
            return phone;
          }));
        }
      }
      
      // Create updated values for tracking changes
      const updatedValues = {
        checkUserPresence,
        presenceMessageDelay,
        silenceTimeout,
        callTimeout,
        presenceMessage,
        hangUpMessage,
        responseRate,
        phoneNumber: phoneNumberString,
        voice: selectedVoice,
      };
      
      // Store the settings in localStorage to persist across page loads
      localStorage.setItem(localStorageKey, JSON.stringify(updatedValues));
      
      // Update initial values with the new values after successful save
      setInitialValues(updatedValues);
      
      // Force dirty state to false
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving call settings:', error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to save call settings: ${errorMsg}`)
    }
  }
  
  // Cancel handler to revert changes
  const handleCancel = () => {
    // Reset to original values
    const currentPhoneNumberId = phoneNumbers.find(p => p.number === initialValues.phoneNumber)?.id || null
    setSelectedPhoneNumberId(currentPhoneNumberId)
    setCheckUserPresence(initialValues.checkUserPresence)
    setPresenceMessageDelay(initialValues.presenceMessageDelay)
    setSilenceTimeout(initialValues.silenceTimeout)
    setCallTimeout(initialValues.callTimeout)
    setPresenceMessage(initialValues.presenceMessage)
    setHangUpMessage(initialValues.hangUpMessage)
    setResponseRate(initialValues.responseRate)
    setSelectedVoice(initialValues.voice)
    setIsDirty(false)
  }

  return (
    <SettingsTabWrapper
      tabName="Call"
      isDirty={isDirty}
      onSave={handleSaveSettings}
      onCancel={handleCancel}
    >
      <div className="space-y-6">
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
                    value={selectedPhoneNumberId || 'none'}
                    onValueChange={handlePhoneNumberChange}
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
                <a href="/dashboard/phone-numbers" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
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
                <a href="/dashboard/voices" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                  here
                </a>
              </div>
              {initialValues.voice && !voices.some(v => v.voice_id === initialValues.voice) && !isVoicesLoading && (
                <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-500 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Your agent has a voice assigned in the database, but it's not available in your account.
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Response Rate Selection */}
        <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
          <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">Response Rate</Label>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            <div className="flex-1">
              <Select 
                value={responseRate} 
                onValueChange={(value: 'rapid' | 'normal' | 'patient') => setResponseRate(value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
                  <SelectValue placeholder="Select response rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rapid">Rapid (Faster responses)</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="patient">Patient (More thoughtful)</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This controls how quickly your agent responds during conversations.
              </p>
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
                    value={[presenceMessageDelay]}
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
                <div className="mt-4">
                  <Label className="text-sm text-gray-900 dark:text-gray-100 mb-2 block">Presence Message</Label>
                  <Input
                    value={presenceMessage}
                    onChange={(e) => setPresenceMessage(e.target.value)}
                    placeholder="Are you still there?"
                    className="w-full"
                  />
                  <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                    Message to ask user after silence
                  </p>
                </div>
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
                  value={[silenceTimeout]}
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
              <div className="mt-4">
                <Label className="text-sm text-gray-900 dark:text-gray-100 mb-2 block">Hang Up Message</Label>
                <Input
                  value={hangUpMessage}
                  onChange={(e) => setHangUpMessage(e.target.value)}
                  placeholder="I haven't heard from you, so I'll end the call."
                  className="w-full"
                />
                <p className="mt-2 text-sm/6 text-gray-500 dark:text-gray-400">
                  Message before hanging up due to silence
                </p>
              </div>
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
                  value={[callTimeout]}
                  max={900}
                  min={30}
                  step={30}
                  onValueChange={(value) => setCallTimeout(value[0])}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Current timeout:
                  <span className="ml-1 font-semibold text-gray-900 dark:text-gray-100">
                    {callTimeout} seconds ({Math.floor(callTimeout / 60)} minutes)
                  </span>
                </p>
              </div>
              <p className="mt-4 text-sm/6 text-gray-500 dark:text-gray-400">
                The call will hang up after this many seconds of call time.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </SettingsTabWrapper>
  )
} 