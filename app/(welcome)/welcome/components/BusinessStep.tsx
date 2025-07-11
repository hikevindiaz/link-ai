'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { RiCheckLine, RiBriefcaseLine, RiTeamLine, RiCustomerService2Line, RiCalendarLine, RiMegaphoneLine, RiFileLine, RiDatabase2Line, RiChatSmileLine, RiGlobalLine, RiMailLine, RiWhatsappLine, RiFacebookLine, RiInstagramLine, RiMessage2Line } from '@remixicon/react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const companySizes = [
  { id: '1-10', label: '1-10 employees' },
  { id: '11-50', label: '11-50 employees' },
  { id: '51-200', label: '51-200 employees' },
  { id: '201-500', label: '201-500 employees' },
  { id: '501-1000', label: '501-1000 employees' },
  { id: '1000+', label: '1000+ employees' },
];

const industryTypes = [
  { id: 'technology', label: 'Technology' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'finance', label: 'Finance' },
  { id: 'education', label: 'Education' },
  { id: 'retail', label: 'Retail' },
  { id: 'manufacturing', label: 'Manufacturing' },
  { id: 'consulting', label: 'Consulting' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'other', label: 'Other' },
];

const businessTasks = [
  { id: 'customer-support', label: 'Customer Support', icon: RiCustomerService2Line },
  { id: 'lead-generation', label: 'Lead Generation', icon: RiMegaphoneLine },
  { id: 'appointment-booking', label: 'Appointment Booking', icon: RiCalendarLine },
  { id: 'product-recommendations', label: 'Product Recommendations', icon: RiBriefcaseLine },
  { id: 'faq-answering', label: 'FAQ Answering', icon: RiChatSmileLine },
  { id: 'data-collection', label: 'Data Collection', icon: RiDatabase2Line },
];

const communicationChannels = [
  { id: 'website', label: 'Website', icon: RiGlobalLine },
  { id: 'email', label: 'Email', icon: RiMailLine },
  { id: 'whatsapp', label: 'WhatsApp', icon: RiWhatsappLine },
  { id: 'facebook', label: 'Facebook Messenger', icon: RiFacebookLine },
  { id: 'instagram', label: 'Instagram', icon: RiInstagramLine },
  { id: 'sms', label: 'SMS', icon: RiMessage2Line },
];

const businessFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  businessWebsite: z.string().optional(),
  companySize: z.string().min(1, 'Company size is required'),
  industryType: z.string().min(1, 'Industry type is required'),
  businessTasks: z.array(z.string()).min(1, 'Select at least one business task'),
  communicationChannels: z.array(z.string()).min(1, 'Select at least one communication channel'),
});

type BusinessFormValues = z.infer<typeof businessFormSchema>;

interface BusinessStepProps {
  initialValues?: Partial<BusinessFormValues>;
  onNext: (data: BusinessFormValues) => void;
  onPrev: () => void;
  isSubmitting?: boolean;
  onSubstepChange?: (substep: number) => void;
  onSaveProgress?: (data: Partial<BusinessFormValues>) => Promise<void>;
}

export function BusinessStep({ initialValues, onNext, onPrev, isSubmitting = false, onSubstepChange, onSaveProgress }: BusinessStepProps) {
  const [subStep, setSubStep] = useState(0);
  
  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: initialValues || {
      companyName: '',
      businessWebsite: '',
      companySize: '',
      industryType: '',
      businessTasks: [],
      communicationChannels: [],
    },
  });

  // Notify parent of substep changes
  useEffect(() => {
    onSubstepChange?.(subStep);
  }, [subStep, onSubstepChange]);

  const handleNextSubStep = async () => {
    let fieldsToValidate: (keyof BusinessFormValues)[] = [];
    
    switch (subStep) {
      case 0:
        fieldsToValidate = ['companyName', 'businessWebsite'];
        break;
      case 1:
        fieldsToValidate = ['companySize', 'industryType'];
        break;
      case 2:
        fieldsToValidate = ['businessTasks'];
        break;
      case 3:
        fieldsToValidate = ['communicationChannels'];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      // Save progress for current substep
      const currentData = form.getValues();
      await onSaveProgress?.(currentData);
      
      if (subStep === 3) {
        // Last substep, submit the form
        form.handleSubmit(onNext)();
      } else {
        setSubStep(subStep + 1);
      }
    }
  };

  const handlePrevSubStep = () => {
    if (subStep === 0) {
      onPrev();
    } else {
      setSubStep(subStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          <AnimatePresence mode="wait">
            {/* Sub-step 0: Company Info */}
            {subStep === 0 && (
              <motion.div
                key="company-info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">Company Information</h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Let's start with some basic information about your company.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900 dark:text-neutral-50">Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Inc." {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessWebsite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900 dark:text-neutral-50">Business Website (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} className="h-12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {/* Sub-step 1: Company Details */}
            {subStep === 1 && (
              <motion.div
                key="company-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-2">Company Details</h2>
                  <p className="text-neutral-600 text-sm">
                    Help us understand your company better.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="companySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900">Company Size</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select company size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companySizes.map((size) => (
                            <SelectItem key={size.id} value={size.id}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="industryType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900">Industry</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industryTypes.map((industry) => (
                            <SelectItem key={industry.id} value={industry.id}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {/* Sub-step 2: Business Tasks */}
            {subStep === 2 && (
              <motion.div
                key="business-tasks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-2">What tasks do you want Link AI to perform?</h2>
                  <p className="text-neutral-600 text-sm">
                    Select all that apply. You can always add more later.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="businessTasks"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {businessTasks.map((task) => {
                          const isSelected = field.value?.includes(task.id);
                          return (
                            <div
                              key={task.id}
                              onClick={() => {
                                const currentValues = field.value || [];
                                const updatedValue = isSelected
                                  ? currentValues.filter(v => v !== task.id)
                                  : [...currentValues, task.id];
                                field.onChange(updatedValue);
                              }}
                              className={cn(
                                "relative flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all",
                                isSelected
                                  ? "border-neutral-500 bg-neutral-50"
                                  : "border-neutral-200 hover:border-neutral-300"
                              )}
                            >
                              <task.icon
                                className={cn(
                                  "size-5 shrink-0",
                                  isSelected ? "text-neutral-500" : "text-neutral-400"
                                )}
                              />
                              <span className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-neutral-900" : "text-neutral-700"
                              )}>
                                {task.label}
                              </span>
                              {isSelected && (
                                <RiCheckLine className="absolute right-3 top-4 size-5 text-neutral-500" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {/* Sub-step 3: Communication Channels */}
            {subStep === 3 && (
              <motion.div
                key="communication-channels"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 mb-2">Where do you want to deploy Link AI?</h2>
                  <p className="text-neutral-600 text-sm">
                    Choose the channels where your customers can interact with Link AI.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="communicationChannels"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {communicationChannels.map((channel) => {
                          const isSelected = field.value?.includes(channel.id);
                          return (
                            <div
                              key={channel.id}
                              onClick={() => {
                                const currentValues = field.value || [];
                                const updatedValue = isSelected
                                  ? currentValues.filter(v => v !== channel.id)
                                  : [...currentValues, channel.id];
                                field.onChange(updatedValue);
                              }}
                              className={cn(
                                "relative flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all",
                                isSelected
                                  ? "border-neutral-500 bg-neutral-50"
                                  : "border-neutral-200 hover:border-neutral-300"
                              )}
                            >
                              <channel.icon
                                className={cn(
                                  "size-5 shrink-0",
                                  isSelected ? "text-neutral-500" : "text-neutral-400"
                                )}
                              />
                              <span className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-neutral-900" : "text-neutral-700"
                              )}>
                                {channel.label}
                              </span>
                              {isSelected && (
                                <RiCheckLine className="absolute right-3 top-4 size-5 text-neutral-500" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={handlePrevSubStep}
              variant="secondary"
              className="px-6"
              disabled={isSubmitting}
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleNextSubStep}
              disabled={isSubmitting}
              className="px-6"
            >
              {isSubmitting ? 'Saving...' : subStep === 3 ? 'Next: Subscription' : 'Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 