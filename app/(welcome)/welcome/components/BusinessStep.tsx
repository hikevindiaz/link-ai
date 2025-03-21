'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  { id: 'customer-support', label: 'Customer Support' },
  { id: 'lead-generation', label: 'Lead Generation' },
  { id: 'appointment-booking', label: 'Appointment Booking' },
  { id: 'product-recommendations', label: 'Product Recommendations' },
  { id: 'faq-answering', label: 'FAQ Answering' },
  { id: 'data-collection', label: 'Data Collection' },
];

const communicationChannels = [
  { id: 'website', label: 'Website' },
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'facebook', label: 'Facebook Messenger' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'sms', label: 'SMS' },
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
}

export function BusinessStep({ initialValues, onNext, onPrev, isSubmitting = false }: BusinessStepProps) {
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

  const onSubmit = (data: BusinessFormValues) => {
    onNext(data);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Business Information</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Tell us about your company to help us customize your experience.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 dark:text-gray-50">Company Name</FormLabel>
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
                  <FormLabel className="text-gray-900 dark:text-gray-50">Business Website (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} className="h-12" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="companySize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 dark:text-gray-50">Company Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                  <FormLabel className="text-gray-900 dark:text-gray-50">Industry</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
          </div>

          <FormField
            control={form.control}
            name="businessTasks"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-gray-900 dark:text-gray-50">What tasks do you want Link AI to perform?</FormLabel>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {businessTasks.map((task) => (
                    <FormField
                      key={task.id}
                      control={form.control}
                      name="businessTasks"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={task.id}
                            className="flex items-start space-x-3 space-y-0 rounded-md border p-4"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(task.id)}
                                onCheckedChange={(checked) => {
                                  const updatedValue = checked
                                    ? [...field.value, task.id]
                                    : field.value?.filter(
                                        (value) => value !== task.id
                                      );
                                  field.onChange(updatedValue);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer text-gray-700 dark:text-gray-300">
                              {task.label}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="communicationChannels"
            render={() => (
              <FormItem>
                <div className="mb-4">
                  <FormLabel className="text-gray-900 dark:text-gray-50">Where do you want to deploy Link AI?</FormLabel>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {communicationChannels.map((channel) => (
                    <FormField
                      key={channel.id}
                      control={form.control}
                      name="communicationChannels"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={channel.id}
                            className="flex items-start space-x-3 space-y-0 rounded-md border p-4"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(channel.id)}
                                onCheckedChange={(checked) => {
                                  const updatedValue = checked
                                    ? [...field.value, channel.id]
                                    : field.value?.filter(
                                        (value) => value !== channel.id
                                      );
                                  field.onChange(updatedValue);
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer text-gray-700 dark:text-gray-300">
                              {channel.label}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={onPrev}
              variant="secondary"
              className="px-6"
              disabled={isSubmitting}
            >
              Previous
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-6"
            >
              {isSubmitting ? 'Saving...' : 'Next: Subscription'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 