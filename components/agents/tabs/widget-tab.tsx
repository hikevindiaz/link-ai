import { Icons } from "@/components/icons"
import { SettingsCard } from "../cards/settings-card"
import type { Agent } from "@/types/agent"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Callout } from "@/components/callout"
import { RiInformationLine, RiCodeLine, RiClipboardLine, RiCheckLine, RiFileLine } from "@remixicon/react"
import { toast } from "sonner"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/Accordion"
import { Code2, MonitorSmartphone, Settings, Palette, Crown, Globe, Layout } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { GradientPicker } from "@/components/gradient-picker"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import Image from "next/image"
import { useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"

interface WidgetTabProps {
  agent: Agent
  onSave: (data: Partial<Agent>) => Promise<void>
}

function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <div className="flex">
        <div className="relative flex-grow">
          <pre className="relative text-sm sm:text-base bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <code className="language-html break-all whitespace-pre-wrap">
              {code}
            </code>
          </pre>
        </div>
        <div className="relative ml-2 flex-shrink-0">
          <button
            onClick={copyToClipboard}
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-xl border",
              "transition-all duration-200",
              "hover:bg-neutral-100 dark:hover:bg-neutral-800",
              "border-neutral-200 dark:border-neutral-800",
              "focus:outline-none focus:ring-2 focus:ring-neutral-500 dark:focus:ring-neutral-500"
            )}
          >
            <div className="relative">
              <RiClipboardLine 
                className={cn(
                  "h-5 w-5 text-neutral-500 dark:text-neutral-400",
                  "transition-opacity duration-200",
                  copied ? "opacity-0" : "opacity-100"
                )} 
              />
              <RiCheckLine 
                className={cn(
                  "absolute inset-0 h-5 w-5 text-green-500",
                  "transition-opacity duration-200",
                  copied ? "opacity-100" : "opacity-0"
                )}
              />
            </div>
          </button>
          <div 
            className={cn(
              "absolute top-full left-1/2 -translate-x-1/2 mt-2",
              "text-xs text-neutral-500 dark:text-neutral-400",
              "whitespace-nowrap",
              "transition-opacity duration-200",
              copied ? "opacity-100" : "opacity-0"
            )}
          >
            Copied!
          </div>
        </div>
      </div>
    </div>
  )
}

const customizationOptions = [
  {
    title: "Basic Settings",
    subtitle: "Configure general settings",
    icon: Settings,
    type: "basic",
    description: "Configure the basic settings for your chatbot"
  },
  {
    title: "Appearance",
    subtitle: "Customize colors and styling",
    icon: Palette,
    type: "appearance",
    description: "Customize how your chatbot looks"
  },
  {
    title: "Pro Features",
    subtitle: "Advanced customization options",
    icon: Crown,
    type: "pro",
    description: "Access premium features and advanced customization options"
  },
  {
    title: "Widget Embed",
    subtitle: "Add a chat widget to your website",
    icon: Code2,
    type: "widget",
    description: "Add the following script to the head section of your HTML to embed the chatbot widget:"
  },
  {
    title: "Window Embed",
    subtitle: "Embed as a full window",
    icon: MonitorSmartphone,
    type: "window",
    description: "Use this code to embed the chatbot as a full window on your website:"
  }
]

// Add the customization schema
const customizationSchema = z.object({
  chatTitle: z.string().optional(),
  chatMessagePlaceHolder: z.string().optional(),
  chatInputStyle: z.enum(['default', 'full-width']),
  chatHistoryEnabled: z.boolean(),
  bubbleColor: z.string(),
  bubbleTextColor: z.string(),
  chatHeaderBackgroundColor: z.string(),
  chatHeaderTextColor: z.string(),
  userReplyBackgroundColor: z.string(),
  userReplyTextColor: z.string(),
  displayBranding: z.boolean().default(false),
  fileAttachmentEnabled: z.boolean().default(false),
})

export function WidgetTab({ agent, onSave }: WidgetTabProps) {
  const baseUrl = "https://dashboard.getlinkai.com"
  
  const widgetCode = `<script>
    window.chatbotConfig = { chatbotId: '${agent.id}' };
    (function() {
        var script = document.createElement('script');
        script.src = '${baseUrl}/embed/chatbot.js';
        document.head.appendChild(script);
    })();
</script>
<!-- This chatbot is built using Link AI -->`

  const iframeCode = `<iframe 
    src="${baseUrl}/dashboard/chatbots/${agent.id}/embed?chatbox=false"
    style="overflow: hidden; height: 80vh; width: 480px; bottom: -30px; border: 2px solid #e2e8f0; border-radius: 0.375rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);"
    allowfullscreen allow="clipboard-read; clipboard-write" 
>
</iframe>
<!-- This chatbot is built using Link AI -->`

  const [bubbleColor, setBubbleColor] = useState(agent.bubbleColor || '')
  const [bubbleLogoColor, setBubbleLogoColor] = useState(agent.bubbleTextColor || '')
  const [chatHeaderBackgroundColor, setChatHeaderBackgroundColor] = useState(agent.chatHeaderBackgroundColor || '')
  const [chatHeaderTextColor, setChatHeaderTextColor] = useState(agent.chatHeaderTextColor || '')
  const [userBubbleColor, setUserBubbleColor] = useState(agent.userReplyBackgroundColor || '')
  const [userBubbleMessageColor, setUserBubbleMessageColor] = useState(agent.userReplyTextColor || '')
  const [chatbotLogoURL, setChatbotLogoURL] = useState(agent.chatbotLogoURL || '')
  const [useDefaultImage, setUseDefaultImage] = useState<boolean>(true)
  const inputFileRef = useRef<HTMLInputElement>(null)
  const [widgetEnabled, setWidgetEnabled] = useState(false)
  const [theme, setTheme] = useState("light")
  const [layout, setLayout] = useState("default")

  const form = useForm<z.infer<typeof customizationSchema>>({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      chatTitle: agent.chatTitle || "",
      chatMessagePlaceHolder: agent.chatMessagePlaceHolder || "",
      chatInputStyle: agent.chatInputStyle || "default",
      chatHistoryEnabled: agent.chatHistoryEnabled || false,
      bubbleColor: agent.bubbleColor || "",
      bubbleTextColor: agent.bubbleTextColor || "",
      chatHeaderBackgroundColor: agent.chatHeaderBackgroundColor || "",
      chatHeaderTextColor: agent.chatHeaderTextColor || "",
      userReplyBackgroundColor: agent.userReplyBackgroundColor || "",
      userReplyTextColor: agent.userReplyTextColor || "",
      displayBranding: agent.displayBranding || false,
      fileAttachmentEnabled: agent.fileAttachmentEnabled || false,
    },
  })

  const onSubmit = async (data: z.infer<typeof customizationSchema>) => {
    const formData = new FormData()
    
    // Add all form fields to formData
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, String(value))
    })

    // Handle logo upload
    if (!useDefaultImage && inputFileRef.current?.files?.[0]) {
      formData.append('chatbotLogoFilename', inputFileRef.current.files[0].name)
      formData.append('chatbotLogo', inputFileRef.current.files[0])
    }
    formData.append('useDefaultImage', String(useDefaultImage))

    await onSave(Object.fromEntries(formData))
  }

  const isSaving = form.formState.isSubmitting

  return (
    <div className="mt-8 space-y-6">
      {/* Enable Widget */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <Label className="font-medium text-neutral-900 dark:text-neutral-100">Enable Widget</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-neutral-950">
          <div className="flex items-center justify-between">
              <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">Enable Website Widget</p>
              <p className="text-sm/6 text-neutral-500 dark:text-neutral-400">
                Add a chat widget to your website
              </p>
            </div>
            <Switch
              checked={widgetEnabled}
              onCheckedChange={setWidgetEnabled}
            />
          </div>
              </div>
      </Card>

      {/* Theme Selection */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <Label className="font-medium text-neutral-900 dark:text-neutral-100">Theme</Label>
              </div>
            </div>
        <div className="p-4 bg-white dark:bg-neutral-950">
          <div className="flex-1">
            <div className="relative">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400 z-10" />
              <Input 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Enter theme"
                className="pl-9 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              />
            </div>
            <p className="mt-2 text-sm/6 text-neutral-500 dark:text-neutral-400">
              Choose the theme for your widget.
            </p>
          </div>
        </div>
      </Card>

      {/* Layout Selection */}
      <Card className="overflow-hidden p-0 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 bg-neutral-50/50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <Label className="font-medium text-neutral-900 dark:text-neutral-100">Layout</Label>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-neutral-950">
          <div className="flex-1">
            <div className="relative">
              <Layout className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500 dark:text-neutral-400 z-10" />
              <Input 
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
                placeholder="Enter layout"
                className="pl-9 bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800"
              />
            </div>
            <p className="mt-2 text-sm/6 text-neutral-500 dark:text-neutral-400">
              Choose the layout for your widget.
            </p>
          </div>
        </div>
      </Card>

      <Accordion
        type="multiple"
        defaultValue={['Customization']}
        className="mt-6 space-y-2"
      >
        {customizationOptions.map((option) => (
          <AccordionItem
            key={option.title}
            value={option.title}
            className="rounded-xl border !border-neutral-300 px-4 !shadow-sm dark:border-neutral-800"
          >
            <AccordionTrigger>
              <div className="flex items-center space-x-2">
                <span
                  className="flex size-5 items-center justify-center"
                  aria-hidden={true}
                >
                  <option.icon
                    className="h-5 w-5 text-neutral-500 dark:text-neutral-400"
                    aria-hidden={true}
                  />
                </span>
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {option.title}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {option.subtitle}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 pt-2">
              <div className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {option.description}
                </p>
                
                {option.type === 'widget' && (
                  <CodeSnippet code={widgetCode} />
                )}
                
                {option.type === 'window' && (
                  <CodeSnippet code={iframeCode} />
                )}
                
                {option.type === 'basic' && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="chatTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Chatbox Title</FormLabel>
                              <FormDescription>Change the chatbox title</FormDescription>
                              <FormControl>
                                <Input placeholder="Chat with Link AI" {...field} />
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
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Chat History</FormLabel>
                                <FormDescription>
                                  Enable or disable chat history. Enabling chat history will allow users to view previous chat with your chatbot.
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
                    </form>
                  </Form>
                )}
                
                {option.type === 'appearance' && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="space-y-6">
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
                                    <GradientPicker withGradient={false} background={bubbleLogoColor} setBackground={setBubbleLogoColor} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium">Header Appearance</h3>
                          <div className="grid gap-4">
                            <FormField
                              name="chatHeaderBackgroundColor"
                              render={() => (
                                <FormItem>
                                  <FormLabel>Header Background Color</FormLabel>
                                  <FormDescription>Select the background color for your header</FormDescription>
                                  <FormControl>
                                    <GradientPicker background={chatHeaderBackgroundColor} setBackground={setChatHeaderBackgroundColor} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              name="chatHeaderTextColor"
                              render={() => (
                                <FormItem>
                                  <FormLabel>Header Text Color</FormLabel>
                                  <FormDescription>Select the text color for your header</FormDescription>
                                  <FormControl>
                                    <GradientPicker withGradient={false} background={chatHeaderTextColor} setBackground={setChatHeaderTextColor} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium">User Messages</h3>
                          <div className="grid gap-4">
                            <FormField
                              name="userReplyBackgroundColor"
                              render={() => (
                                <FormItem>
                                  <FormLabel>Message Background Color</FormLabel>
                                  <FormDescription>Choose the background color for user messages</FormDescription>
                                  <FormControl>
                                    <GradientPicker withGradient={false} background={userBubbleColor} setBackground={setUserBubbleColor} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              name="userReplyTextColor"
                              render={() => (
                                <FormItem>
                                  <FormLabel>Message Text Color</FormLabel>
                                  <FormDescription>Choose the text color for user messages</FormDescription>
                                  <FormControl>
                                    <GradientPicker withGradient={false} background={userBubbleMessageColor} setBackground={setUserBubbleMessageColor} />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-medium">Chatbot Image</h3>
                          <div className="flex justify-center rounded-xl border border-dashed border-neutral-300 px-6 py-10 dark:border-neutral-800">
                            <div className="text-center">
                              <RiFileLine className="mx-auto h-12 w-12 text-neutral-400" />
                              <div className="mt-4 flex text-sm leading-6 text-neutral-500">
                                <label className="relative cursor-pointer rounded-xl font-semibold text-neutral-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-neutral-600 focus-within:ring-offset-2 hover:text-neutral-600">
                                  <span>Upload a file</span>
                                  <input 
                                    ref={inputFileRef}
                                    type="file" 
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) => {
                                      if (e.target.files?.length) {
                                        setUseDefaultImage(false)
                                      }
                                    }}
                                  />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs leading-5 text-neutral-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="useDefault"
                              checked={useDefaultImage}
                              onCheckedChange={(checked) => setUseDefaultImage(checked as boolean)}
                            />
                            <label 
                              htmlFor="useDefault" 
                              className="text-sm text-neutral-500 cursor-pointer"
                            >
                              Use default chatbot image
                            </label>
                          </div>
                        </div>
                      </div>
                    </form>
                  </Form>
                )}

                {option.type === 'pro' && (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid gap-4">
                        <FormField
                          control={form.control}
                          name="displayBranding"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Link AI Branding Label
                                </FormLabel>
                                <FormDescription>
                                  Remove "Powered by Link AI" from the chatbot.
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
                          name="fileAttachmentEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Chatbot File Attachment
                                </FormLabel>
                                <FormDescription>
                                  Client Side File Attachment. Enables the user to add a file in the chat. The file will be sent to the chatbot.
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

                      <Button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full"
                      >
                        {isSaving ? (
                          <>
                            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                            Saving Changes...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
} 