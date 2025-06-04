import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import type { Agent } from "@/types/agent"
import { Phone, Clock, MessageSquare, Loader2, AlertCircle, Info, CheckCircle } from "lucide-react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { SettingsTabWrapper } from "@/components/agents/settings-tab-wrapper"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"

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

interface CustomVoice {
  id: string
  name: string
  openaiVoice: string
  description?: string
  language?: string
  isDefault: boolean
  addedOn: string
}

export function CallTab({ agent, onSave }: CallTabProps) {
  // Utility function to capitalize voice names properly
  const capitalizeVoiceName = (name: string): string => {
    if (!name) return name;
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Use a ref to track if we've already initialized our local state
  const hasInitialized = useRef(false);
  const saveCount = useRef(0);
  
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
  const [voices, setVoices] = useState<CustomVoice[]>([])
  const [selectedPhoneNumberId, setSelectedPhoneNumberId] = useState<string | null>(null)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState({
    phoneNumbers: true,
    voices: true,
    saving: false
  })
  const [errors, setErrors] = useState({
    phoneNumbers: null as string | null,
    voices: null as string | null
  })

  // Track if form has changes
  const [isDirty, setIsDirty] = useState(false)
  
  // Local storage key for this agent's call settings
  const localStorageKey = `agent-call-settings-${agent.id}`;
  
  // Initial values for comparison and reset
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

  // Initialize settings from localStorage or agent
  useEffect(() => {
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

  // Fetch all data in parallel
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // Fetch phone numbers and voices in parallel
      const [phoneNumbersResult, voicesResult] = await Promise.allSettled([
        fetchPhoneNumbers(),
        fetchVoices()
      ]);
      
      // Handle results
      if (phoneNumbersResult.status === 'rejected') {
        setErrors(prev => ({ ...prev, phoneNumbers: 'Failed to load phone numbers' }));
      }
      if (voicesResult.status === 'rejected') {
        setErrors(prev => ({ ...prev, voices: 'Failed to load voices' }));
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, []);

  // Fetch phone numbers
  const fetchPhoneNumbers = async () => {
    setLoadingStates(prev => ({ ...prev, phoneNumbers: true }));
    setErrors(prev => ({ ...prev, phoneNumbers: null }));
    
    try {
      const response = await fetch('/api/twilio/phone-numbers');
      if (!response.ok) {
        throw new Error('Failed to fetch phone numbers');
      }
      const data = await response.json();
      console.log('Phone numbers API response:', data);
      
      const numbers = data.phoneNumbers || [];
      
      // Map the API response to the expected format
      const mappedNumbers = numbers.map((num: any) => ({
        id: num.id,
        number: num.number,
        agentId: num.agentId,
        agentName: num.agentName,
        status: num.status || num.calculatedStatus || 'active'
      }));
      
      // Filter for active numbers only
      const activeNumbers = mappedNumbers.filter((number: PhoneNumber) => 
        number.status === 'active' || number.status === 'warning' || number.status === 'pending'
      );
      
      setPhoneNumbers(activeNumbers);
      
      // Set the selected phone number ID based on initial values
      const phoneNumber = initialValues.phoneNumber || agent.phoneNumber;
      if (phoneNumber) {
        const matchingPhone = activeNumbers.find(p => p.number === phoneNumber);
        if (matchingPhone) {
          setSelectedPhoneNumberId(matchingPhone.id);
        }
      }
    } catch (error) {
      console.error('Error fetching phone numbers:', error);
      setErrors(prev => ({ ...prev, phoneNumbers: 'Failed to load phone numbers' }));
      toast.error('Failed to load phone numbers');
    } finally {
      setLoadingStates(prev => ({ ...prev, phoneNumbers: false }));
    }
  };

  // Fetch user voices
  const fetchVoices = async () => {
    setLoadingStates(prev => ({ ...prev, voices: true }));
    setErrors(prev => ({ ...prev, voices: null }));
    
    try {
      const response = await fetch('/api/user/voices');
      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }
      const data = await response.json();
      setVoices(data.voices || []);
    } catch (error) {
      console.error('Error fetching voices:', error);
      setErrors(prev => ({ ...prev, voices: 'Failed to load voices' }));
      toast.error('Failed to load voices');
    } finally {
      setLoadingStates(prev => ({ ...prev, voices: false }));
    }
  };

  // Memoized available phone numbers
  const availablePhoneNumbers = useMemo(() => {
    return phoneNumbers.filter(phone => !phone.agentId || phone.agentId === agent.id);
  }, [phoneNumbers, agent.id]);

  // Track changes - optimized with useMemo
  const hasChanges = useMemo(() => {
    if (loadingStates.phoneNumbers) return false;
    
    const phoneNumberObj = phoneNumbers.find(p => p.id === selectedPhoneNumberId);
    const currentPhoneNumberString = phoneNumberObj ? phoneNumberObj.number : null;
    
    return (
      currentPhoneNumberString !== initialValues.phoneNumber ||
      checkUserPresence !== initialValues.checkUserPresence ||
      presenceMessageDelay !== initialValues.presenceMessageDelay ||
      silenceTimeout !== initialValues.silenceTimeout ||
      callTimeout !== initialValues.callTimeout ||
      presenceMessage !== initialValues.presenceMessage ||
      hangUpMessage !== initialValues.hangUpMessage ||
      responseRate !== initialValues.responseRate ||
      selectedVoice !== initialValues.voice
    );
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
    loadingStates.phoneNumbers,
    phoneNumbers,
    initialValues
  ]);

  useEffect(() => {
    setIsDirty(hasChanges);
  }, [hasChanges]);

  // Handle phone number selection
  const handlePhoneNumberChange = useCallback((value: string) => {
    setSelectedPhoneNumberId(value === 'none' ? null : value);
  }, []);

  // Handle voice selection
  const handleVoiceChange = useCallback((value: string) => {
    setSelectedVoice(value === 'none' ? null : value);
  }, []);

  // Handle saving call settings
  const handleSaveSettings = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, saving: true }));
      saveCount.current += 1;
      
      // Get the selected phone number object
      const phoneNumberObj = phoneNumbers.find(p => p.id === selectedPhoneNumberId);
      const phoneNumberString = phoneNumberObj ? phoneNumberObj.number : null;
      
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
      };
      
      // Save to the agent
      await onSave(saveData);
      
      // Handle phone number assignment changes
      const previousPhoneNumberId = phoneNumbers.find(p => p.number === initialValues.phoneNumber)?.id || null;
      
      if (selectedPhoneNumberId !== previousPhoneNumberId) {
        // If there was a previous phone number, unassign it
        if (previousPhoneNumberId && previousPhoneNumberId !== selectedPhoneNumberId) {
          toast.loading('Unassigning previous phone number...', { id: 'phone-unassign' });
          
          const unassignResponse = await fetch(`/api/twilio/phone-numbers/${previousPhoneNumberId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: null }),
          });
          
          if (!unassignResponse.ok) {
            toast.error('Failed to unassign previous phone number', { id: 'phone-unassign' });
            throw new Error('Failed to unassign previous phone number');
          }
          
          toast.success('Previous phone number unassigned', { id: 'phone-unassign' });
        }
        
        // If there's a new phone number, assign it
        if (selectedPhoneNumberId) {
          toast.loading('Configuring phone number...', { id: 'phone-assign' });
          
          const assignResponse = await fetch(`/api/twilio/phone-numbers/${selectedPhoneNumberId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentId: agent.id }),
          });
          
          if (!assignResponse.ok) {
            const error = await assignResponse.json();
            toast.error(error.error || 'Failed to configure phone number', { id: 'phone-assign' });
            throw new Error('Failed to assign new phone number');
          }
          
          const result = await assignResponse.json();
          toast.success('Phone number configured successfully!', { id: 'phone-assign' });
          
          // Log webhook configuration for debugging
          console.log('Phone number assignment result:', result);
          
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
      
      toast.success('Call settings saved successfully!');
    } catch (error) {
      console.error('Error saving call settings:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to save: ${errorMsg}`);
    } finally {
      setLoadingStates(prev => ({ ...prev, saving: false }));
    }
  };
  
  // Cancel handler to revert changes
  const handleCancel = useCallback(() => {
    // Reset to original values
    const currentPhoneNumberId = phoneNumbers.find(p => p.number === initialValues.phoneNumber)?.id || null;
    setSelectedPhoneNumberId(currentPhoneNumberId);
    setCheckUserPresence(initialValues.checkUserPresence);
    setPresenceMessageDelay(initialValues.presenceMessageDelay);
    setSilenceTimeout(initialValues.silenceTimeout);
    setCallTimeout(initialValues.callTimeout);
    setPresenceMessage(initialValues.presenceMessage);
    setHangUpMessage(initialValues.hangUpMessage);
    setResponseRate(initialValues.responseRate);
    setSelectedVoice(initialValues.voice);
    setIsDirty(false);
  }, [phoneNumbers, initialValues]);

  // Retry handlers
  const retryPhoneNumbers = useCallback(() => {
    fetchPhoneNumbers();
  }, []);

  const retryVoices = useCallback(() => {
    fetchVoices();
  }, []);

  if (isLoading) {
    return (
      <SettingsTabWrapper
        tabName="Call"
        isDirty={false}
        onSave={handleSaveSettings}
        onCancel={handleCancel}
      >
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>
            </Card>
          ))}
        </div>
      </SettingsTabWrapper>
    );
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
              {selectedPhoneNumberId && (
                <Badge variant="secondary" className="ml-auto">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Assigned
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-900/50">
            {errors.phoneNumbers ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{errors.phoneNumbers}</span>
                  <Button variant="ghost" size="sm" onClick={retryPhoneNumbers}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex-1">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                    {loadingStates.phoneNumbers ? (
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
                          {availablePhoneNumbers.map((phone) => (
                            <SelectItem key={phone.id} value={phone.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{phone.number}</span>
                                {phone.status === 'pending' && (
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">(Unassigned)</span>
                                )}
                                {phone.status === 'warning' && (
                                  <span className="text-xs text-orange-600 dark:text-orange-400 ml-2">(Warning)</span>
                                )}
                                {phone.agentId && phone.agentId !== agent.id && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Assigned to {phone.agentName})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {availablePhoneNumbers.length === 0 ? (
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
              </>
            )}
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
            {errors.voices ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{errors.voices}</span>
                  <Button variant="ghost" size="sm" onClick={retryVoices}>
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex-1">
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
                  {loadingStates.voices ? (
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
                          <SelectItem key={voice.id} value={voice.id}>
                            <div className="flex flex-col items-start text-left w-full">
                              <span className="font-medium">{capitalizeVoiceName(voice.name)}</span>
                              <span className="text-xs text-gray-500">
                                {voice.openaiVoice} {voice.language ? `• ${voice.language}` : ''}
                              </span>
                            </div>
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
                {initialValues.voice && !voices.some(v => v.id === initialValues.voice) && !loadingStates.voices && (
                  <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-500 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Your agent has a voice assigned in the database, but it's not available in your account.
                  </div>
                )}
              </div>
            )}
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
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-gray-900 dark:text-gray-100">
                      Presence Check Delay
                    </Label>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {presenceMessageDelay} seconds
                    </span>
                  </div>
                  <Slider
                    value={[presenceMessageDelay]}
                    max={10}
                    min={1}
                    step={1}
                    onValueChange={(value) => setPresenceMessageDelay(value[0])}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Time to wait before asking if the user is still there
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-900 dark:text-gray-100">Presence Message</Label>
                  <Input
                    value={presenceMessage}
                    onChange={(e) => setPresenceMessage(e.target.value)}
                    placeholder="Are you still there?"
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-gray-900 dark:text-gray-100">
                    Silence Duration
                  </Label>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {silenceTimeout} seconds
                  </span>
                </div>
                <Slider
                  value={[silenceTimeout]}
                  max={30}
                  min={3}
                  step={1}
                  onValueChange={(value) => setSilenceTimeout(value[0])}
                  className="w-full"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Maximum silence before ending the call
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-gray-900 dark:text-gray-100">Hang Up Message</Label>
                <Input
                  value={hangUpMessage}
                  onChange={(e) => setHangUpMessage(e.target.value)}
                  placeholder="I haven't heard from you, so I'll end the call."
                  className="w-full"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-gray-900 dark:text-gray-100">
                  Maximum Call Duration
                </Label>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {Math.floor(callTimeout / 60)} minutes
                </span>
              </div>
              <Slider
                value={[callTimeout]}
                max={900}
                min={30}
                step={30}
                onValueChange={(value) => setCallTimeout(value[0])}
                className="w-full"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The call will automatically end after this duration
              </p>
            </div>
          </div>
        </Card>
      </div>
    </SettingsTabWrapper>
  )
} 