import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { GradientPicker } from "@/components/gradient-picker"
import { 
  Globe, 
  MessageSquare, 
  Phone, 
  MessagesSquare,
  Settings,
  Code2
} from "lucide-react"
import type { Agent } from "@/types/agent"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { FloatingActionCard } from "@/components/agents/floating-action-card"

interface ChannelsTabProps {
  agent: Agent;
  onSave: (data: Partial<Agent>) => Promise<void>;
}

// Schema based on Prisma schema fields for chatbot model
const websiteWidgetSchema = z.object({
  chatTitle: z.string().optional(),
  chatMessagePlaceHolder: z.string().optional(),
  chatInputStyle: z.enum(['default', 'full-width']).default('default'),
  chatHistoryEnabled: z.boolean().default(false),
  bubbleColor: z.string().default('#FFFFFF'),
  bubbleTextColor: z.string().default('#000000'),
  chatHeaderBackgroundColor: z.string().default('#FFFFFF'),
  chatHeaderTextColor: z.string().default('#000000'),
  userReplyBackgroundColor: z.string().default('#e4e4e7'),
  userReplyTextColor: z.string().default('#000000'),
  displayBranding: z.boolean().default(true),
  chatFileAttachementEnabled: z.boolean().default(false),
});

function WebsiteWidgetConfig({ agent, onSave, onClose }: { 
  agent: Agent, 
  onSave: (data: Partial<Agent>) => Promise<void>,
  onClose: () => void
}) {
  const [bubbleColor, setBubbleColor] = useState(agent.bubbleColor || '#FFFFFF');
  const [bubbleTextColor, setBubbleTextColor] = useState(agent.bubbleTextColor || '#000000');
  const [chatHeaderBackgroundColor, setChatHeaderBackgroundColor] = useState(agent.chatHeaderBackgroundColor || '#FFFFFF');
  const [chatHeaderTextColor, setChatHeaderTextColor] = useState(agent.chatHeaderTextColor || '#000000');
  const [userReplyBackgroundColor, setUserReplyBackgroundColor] = useState(agent.userReplyBackgroundColor || '#e4e4e7');
  const [userReplyTextColor, setUserReplyTextColor] = useState(agent.userReplyTextColor || '#000000');
  
  const form = useForm<z.infer<typeof websiteWidgetSchema>>({
    resolver: zodResolver(websiteWidgetSchema),
    defaultValues: {
      chatTitle: agent.chatTitle || "",
      chatMessagePlaceHolder: agent.chatMessagePlaceHolder || "Type a message...",
      chatInputStyle: agent.chatInputStyle as 'default' | 'full-width' || "default",
      chatHistoryEnabled: agent.chatHistoryEnabled || false,
      bubbleColor: agent.bubbleColor || "#FFFFFF",
      bubbleTextColor: agent.bubbleTextColor || "#000000",
      chatHeaderBackgroundColor: agent.chatHeaderBackgroundColor || "#FFFFFF",
      chatHeaderTextColor: agent.chatHeaderTextColor || "#000000",
      userReplyBackgroundColor: agent.userReplyBackgroundColor || "#e4e4e7",
      userReplyTextColor: agent.userReplyTextColor || "#000000",
      displayBranding: agent.displayBranding || true,
      chatFileAttachementEnabled: agent.chatFileAttachementEnabled || false,
    },
  });
  
  const handleSubmit = async (values: z.infer<typeof websiteWidgetSchema>) => {
    try {
      // Include color values that are managed separately
      const updatedValues = {
        ...values,
        bubbleColor,
        bubbleTextColor,
        chatHeaderBackgroundColor,
        chatHeaderTextColor,
        userReplyBackgroundColor,
        userReplyTextColor
      };
      
      await onSave(updatedValues);
      onClose();
    } catch (error) {
      console.error("Error saving widget settings:", error);
    }
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://example.com';
  const widgetCode = `<script>
    window.chatbotConfig = { chatbotId: '${agent.id}' };
    (function() {
        var script = document.createElement('script');
        script.src = '${baseUrl}/embed/chatbot.js';
        document.head.appendChild(script);
    })();
</script>`;

  return (
    <div className="space-y-6 px-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-4">
            <div className="grid gap-4">
              <FormField
                control={form.control}
                name="chatTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chatbox Title</FormLabel>
                    <FormDescription>Change the chatbox title</FormDescription>
                    <FormControl>
                      <Input placeholder="Chat with AI" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="chatMessagePlaceHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Placeholder</FormLabel>
                    <FormDescription>Update the placeholder text in the chatbox input</FormDescription>
                    <FormControl>
                      <Input placeholder="Type a message..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chatHistoryEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Chat History</FormLabel>
                      <FormDescription>
                        Enable or disable chat history for your users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Widget Colors</h3>
              <div className="grid gap-4">
                <FormField
                  name="bubbleColor"
                  render={() => (
                    <FormItem>
                      <FormLabel>Bubble Color</FormLabel>
                      <FormDescription>Select the color for your chatbot bubble</FormDescription>
                      <FormControl>
                        <GradientPicker background={bubbleColor} setBackground={setBubbleColor} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  name="bubbleTextColor"
                  render={() => (
                    <FormItem>
                      <FormLabel>Logo Color</FormLabel>
                      <FormDescription>Select the color for your chatbot logo</FormDescription>
                      <FormControl>
                        <GradientPicker withGradient={false} background={bubbleTextColor} setBackground={setBubbleTextColor} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Advanced Settings</h3>
              <FormField
                control={form.control}
                name="displayBranding"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Display Branding
                      </FormLabel>
                      <FormDescription>
                        Show "Powered by" branding in the chatbot.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="chatFileAttachementEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        File Attachment
                      </FormLabel>
                      <FormDescription>
                        Allow users to attach files in the chat.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Embed Code</h3>
            <div className="relative">
              <pre className="p-4 bg-gray-50 dark:bg-gray-900 border rounded-md overflow-auto">
                <code className="text-sm">{widgetCode}</code>
              </pre>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => {
                  navigator.clipboard.writeText(widgetCode);
                }}
              >
                <Code2 className="w-4 h-4 mr-1" /> Copy
              </Button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export function ChannelsTab({ agent, onSave }: ChannelsTabProps) {
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  
  // Add state variables for tracking changes and save status
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Add state for tracking channel enabled states
  const [websiteEnabled, setWebsiteEnabled] = useState<boolean>(agent.websiteEnabled || false);
  const [whatsappEnabled, setWhatsappEnabled] = useState<boolean>(agent.whatsappEnabled || false);
  const [smsEnabled, setSmsEnabled] = useState<boolean>(false); // Disabled for now
  const [messengerEnabled, setMessengerEnabled] = useState<boolean>(false); // Disabled for now

  // Track changes when state changes
  useEffect(() => {
    const hasWebsiteChanged = websiteEnabled !== (agent.websiteEnabled || false);
    const hasWhatsappChanged = whatsappEnabled !== (agent.whatsappEnabled || false);
    
    setIsDirty(hasWebsiteChanged || hasWhatsappChanged);
  }, [websiteEnabled, whatsappEnabled, agent]);

  const handleOpenDrawer = (drawerName: string) => {
    setOpenDrawer(drawerName);
  };
  
  const handleCloseDrawer = () => {
    setOpenDrawer(null);
  };
  
  // Save handler to update all channel settings at once
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    setErrorMessage('');
    
    try {
      const saveData = {
        websiteEnabled: websiteEnabled,
        whatsappEnabled: whatsappEnabled,
        // Add more channel settings as needed
      };
      
      await onSave(saveData);
      
      toast.success('Channel settings saved successfully');
      setSaveStatus('success');
      
      // Reset the save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Error saving channel settings:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to save channel settings: ${errorMsg}`);
      setSaveStatus('error');
      setErrorMessage(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cancel handler to revert changes
  const handleCancel = () => {
    // Reset to original values
    setWebsiteEnabled(agent.websiteEnabled || false);
    setWhatsappEnabled(agent.whatsappEnabled || false);
    setSaveStatus('idle');
  };
  
  return (
    <div className="mt-8 space-y-6">
      {/* Website */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">Website</Label>
            </div>
            <Button 
              variant="secondary" 
              size="icon"
              onClick={() => handleOpenDrawer('website')}
              className="h-8 w-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enable Website Chat</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Add a chat widget to your website
              </p>
            </div>
            <Switch 
              checked={websiteEnabled} 
              onCheckedChange={setWebsiteEnabled} 
            />
          </div>
        </div>
      </Card>

      {/* WhatsApp */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">WhatsApp</Label>
            </div>
            <Button 
              variant="secondary" 
              size="icon"
              onClick={() => handleOpenDrawer('whatsapp')}
              className="h-8 w-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enable WhatsApp</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Connect your WhatsApp number
              </p>
            </div>
            <Switch 
              checked={whatsappEnabled} 
              onCheckedChange={setWhatsappEnabled} 
            />
          </div>
        </div>
      </Card>

      {/* SMS */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">SMS</Label>
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Coming Soon
              </span>
            </div>
            <Button 
              variant="secondary" 
              size="icon"
              onClick={() => handleOpenDrawer('sms')}
              className="h-8 w-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              disabled
            >
              <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enable SMS</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Connect a phone number for SMS
              </p>
            </div>
            <Switch disabled />
          </div>
        </div>
      </Card>

      {/* Facebook Messenger */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800">
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-900 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessagesSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Label className="font-medium text-gray-900 dark:text-gray-100">Facebook Messenger</Label>
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Coming Soon
              </span>
            </div>
            <Button 
              variant="secondary" 
              size="icon"
              onClick={() => handleOpenDrawer('messenger')}
              className="h-8 w-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              disabled
            >
              <Settings className="h-4 w-4 text-gray-700 dark:text-gray-300" />
            </Button>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Enable Messenger</p>
              <p className="text-sm/6 text-gray-500 dark:text-gray-400">
                Connect your Facebook page
              </p>
            </div>
            <Switch disabled />
          </div>
        </div>
      </Card>

      {/* Website Configuration Drawer */}
      <Drawer open={openDrawer === 'website'} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Website Chat Configuration</DrawerTitle>
            <DrawerDescription>Customize your website chat widget</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 max-h-[70vh] overflow-y-auto">
            <WebsiteWidgetConfig 
              agent={agent} 
              onSave={onSave} 
              onClose={handleCloseDrawer} 
            />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="secondary">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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