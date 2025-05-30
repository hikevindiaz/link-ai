import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { fetchCalendars, type Calendar } from "@/lib/services/calendar-service"
import { bookCalendarAppointment, type CalendarToolConfig, type CalendarToolInput } from "@/lib/agent/tools/calendar-tool"
import { CalendarIcon, AlertCircle, CheckIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

/**
 * Calendar Action Tester Component
 * Used to test calendar booking capabilities directly
 */
export function CalendarActionTester({ agentId, calendarConfig }: { 
  agentId: string, 
  calendarConfig: CalendarToolConfig 
}) {
  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Input state
  const [input, setInput] = useState<CalendarToolInput>({
    title: "",
    startTime: "",
    attendeeName: "",
    attendeeEmail: "",
    calendarId: calendarConfig.defaultCalendarId || "",
    duration: calendarConfig.defaultDuration,
    description: "",
    notes: "",
    attendeePhone: "",
    location: calendarConfig.defaultLocation || ""
  })
  
  useEffect(() => {
    const getCalendars = async () => {
      setLoading(true)
      setError(null)
      try {
        const calendarsData = await fetchCalendars()
        setCalendars(calendarsData)
        
        // If we have a default calendar configured, update the input
        if (calendarConfig.defaultCalendarId) {
          setInput(prev => ({
            ...prev,
            calendarId: calendarConfig.defaultCalendarId
          }))
        } else if (calendarsData.length > 0) {
          // If no default is set but we have calendars, use the first one
          setInput(prev => ({
            ...prev,
            calendarId: calendarsData[0].id
          }))
        }
      } catch (error) {
        console.error('Failed to fetch calendars:', error)
        setError('Failed to load calendars. Please check your network connection and try again.')
      } finally {
        setLoading(false)
      }
    }
    
    getCalendars()
  }, [calendarConfig.defaultCalendarId])
  
  const handleInputChange = (field: keyof CalendarToolInput, value: string | number) => {
    setInput(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    try {
      // Validate required fields
      if (!input.title || !input.startTime || !input.attendeeName || !input.attendeeEmail) {
        throw new Error("Please fill out all required fields")
      }
      
      // Check phone number requirement
      if (calendarConfig.requirePhoneNumber && !input.attendeePhone) {
        throw new Error("Phone number is required for booking appointments")
      }
      
      // Check minimum advance notice
      if (input.startTime) {
        const startTime = new Date(input.startTime)
        const now = new Date()
        const minutesDifference = Math.floor((startTime.getTime() - now.getTime()) / (1000 * 60))
        
        if (minutesDifference < calendarConfig.minimumAdvanceNotice) {
          throw new Error(`Appointments must be booked at least ${calendarConfig.minimumAdvanceNotice} minutes in advance`)
        }
      }
      
      // Book the appointment
      const result = await bookCalendarAppointment(input, calendarConfig)
      
      if (result.success) {
        setSuccess(result.message)
        toast.success("Appointment booked successfully!")
      } else {
        setError(result.message)
        toast.error(result.message)
      }
    } catch (error) {
      console.error('Failed to book appointment:', error)
      setError(`Failed to book appointment: ${error.message || "Unknown error"}`)
      toast.error(`Failed to book appointment: ${error.message || "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Test Calendar Booking</CardTitle>
          <CardDescription>
            Use this form to test booking an appointment with the calendar configuration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calendarConfig.minimumAdvanceNotice > 0 && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Notice</AlertTitle>
              <AlertDescription>
                Appointments must be booked at least {calendarConfig.minimumAdvanceNotice} minutes in advance.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Appointment Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={input.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Meeting with Client"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  Start Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={input.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attendeeName">
                  Attendee Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="attendeeName"
                  value={input.attendeeName}
                  onChange={(e) => handleInputChange('attendeeName', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attendeeEmail">
                  Attendee Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="attendeeEmail"
                  type="email"
                  value={input.attendeeEmail}
                  onChange={(e) => handleInputChange('attendeeEmail', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={input.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  placeholder="30"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="attendeePhone">
                  Attendee Phone {calendarConfig.requirePhoneNumber && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  id="attendeePhone"
                  value={input.attendeePhone}
                  onChange={(e) => handleInputChange('attendeePhone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required={calendarConfig.requirePhoneNumber}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={input.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the appointment"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={input.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes about the appointment"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={input.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Meeting room, Zoom link, etc."
              />
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert>
                <CheckIcon className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Booking...' : 'Book Appointment'}
            {loading ? null : <CalendarIcon className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 