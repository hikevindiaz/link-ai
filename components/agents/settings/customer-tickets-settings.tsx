"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider, UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Icons } from "@/components/icons"
import { toast } from "@/components/ui/use-toast"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  RiSettings4Fill,
  RiFileTextFill,
  RiMessage2Fill,
} from '@remixicon/react';

const ticketsSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  linkText: z.string().min(1),
  formTitle: z.string().min(1),
  formSubtitle: z.string(),
  emailLabel: z.string().min(1),
  messageLabel: z.string().min(1),
  sendButtonText: z.string().min(1),
  automaticReplyText: z.string(),
  displayAfterMessages: z.number().min(1).max(5),
})

type TicketsSettingsValues = z.infer<typeof ticketsSettingsSchema>

interface CustomerTicketsSettingsProps {
  chatbotId: string
  onSubmit: (data: TicketsSettingsValues) => Promise<void>
  renderSwitch?: (form: UseFormReturn<TicketsSettingsValues>) => React.ReactNode
}

export function CustomerTicketsSettings({ 
  chatbotId, 
  onSubmit,
  renderSwitch 
}: CustomerTicketsSettingsProps) {
  const form = useForm<TicketsSettingsValues>({
    resolver: zodResolver(ticketsSettingsSchema),
    defaultValues: {
      enabled: false,
      linkText: "Need help? Send us a message",
      formTitle: "Contact Support",
      formSubtitle: "We'll get back to you as soon as possible.",
      emailLabel: "Email",
      messageLabel: "Message",
      sendButtonText: "Send Message",
      automaticReplyText: "Thank you for your message. We'll get back to you soon.",
      displayAfterMessages: 1,
    },
  })

  useEffect(() => {
    // Fetch current settings
    fetch(`/api/chatbots/${chatbotId}/config`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        form.setValue("enabled", data.inquiryEnabled)
      })
  }, [chatbotId, form.setValue])

  return (
    <Form {...form}>
      <FormProvider {...form}>
        {renderSwitch?.(form)}
        <form id="customer-tickets-form" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="py-6">
            <Accordion type="single" defaultValue="display-settings" className="w-full" collapsible>
              <AccordionItem value="display-settings">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <RiSettings4Fill className="size-4 text-blue-500" />
                    Display Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="linkText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link Text</FormLabel>
                          <FormDescription>
                            Text shown to users to open the ticket form
                          </FormDescription>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="displayAfterMessages"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display After Messages</FormLabel>
                          <FormDescription>
                            Show the ticket option after this many messages
                          </FormDescription>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={1} 
                              max={5}
                              {...field}
                              onChange={e => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="form-settings">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <RiFileTextFill className="size-4 text-blue-500" />
                    Form Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="formTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Form Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="formSubtitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Form Subtitle</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="emailLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Field Label</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="messageLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message Field Label</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sendButtonText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Submit Button Text</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="response-settings">
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <RiMessage2Fill className="size-4 text-blue-500" />
                    Response Settings
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <FormField
                    control={form.control}
                    name="automaticReplyText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Automatic Reply Message</FormLabel>
                        <FormDescription>
                          Message shown to users after submitting a ticket
                        </FormDescription>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </form>
      </FormProvider>
    </Form>
  )
} 