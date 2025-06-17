'use client';

import React, { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { countries } from '@/config/countries';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const accountFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface AccountStepProps {
  initialValues?: Partial<AccountFormValues>;
  onNext: (data: AccountFormValues) => void;
  isSubmitting?: boolean;
  onSubstepChange?: (substep: number) => void;
  onSaveProgress?: (data: Partial<AccountFormValues>) => Promise<void>;
}

export function AccountStep({ initialValues, onNext, isSubmitting = false, onSubstepChange, onSaveProgress }: AccountStepProps) {
  const [subStep, setSubStep] = useState(0);
  
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: initialValues || {
      fullName: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    },
  });

  // Update form when initialValues change (like when email is loaded)
  useEffect(() => {
    if (initialValues && initialValues.email) {
      form.setValue('email', initialValues.email);
    }
  }, [initialValues, form]);

  // Notify parent of substep changes
  useEffect(() => {
    onSubstepChange?.(subStep);
  }, [subStep, onSubstepChange]);

  const handleNextSubStep = async () => {
    let fieldsToValidate: (keyof AccountFormValues)[] = [];
    
    switch (subStep) {
      case 0:
        fieldsToValidate = ['fullName', 'email'];
        break;
      case 1:
        fieldsToValidate = ['addressLine1', 'addressLine2'];
        break;
      case 2:
        fieldsToValidate = ['city', 'state', 'postalCode', 'country'];
        break;
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      // Save progress for current substep
      const currentData = form.getValues();
      await onSaveProgress?.(currentData);
      
      if (subStep === 2) {
        // Last substep, submit the form
        form.handleSubmit(onNext)();
      } else {
        setSubStep(subStep + 1);
      }
    }
  };

  const handlePrevSubStep = () => {
    if (subStep > 0) {
      setSubStep(subStep - 1);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          <AnimatePresence mode="wait">
            {/* Sub-step 0: Personal Information */}
            {subStep === 0 && (
              <motion.div
                key="personal-info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">Personal Information</h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Let's start with your basic information.
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900 dark:text-neutral-50">Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          {...field} 
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900 dark:text-neutral-50">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          value={field.value}
                          disabled={!!initialValues?.email}
                          className={cn(
                            "h-12",
                            initialValues?.email && "text-neutral-500 cursor-not-allowed"
                          )}
                          {...field}
                        />
                      </FormControl>
                      {initialValues?.email && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                          Your email is used for login and cannot be changed.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {/* Sub-step 1: Address Information */}
            {subStep === 1 && (
              <motion.div
                key="address-info"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">Address Information</h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Where should we send important correspondence?
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900 dark:text-neutral-50">Address Line 1</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="123 Main St" 
                          {...field} 
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="addressLine2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-neutral-900 dark:text-neutral-50">Address Line 2 (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Apartment, suite, etc." 
                          {...field} 
                          className="h-12"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {/* Sub-step 2: Location Details */}
            {subStep === 2 && (
              <motion.div
                key="location-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">Location Details</h2>
                  <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                    Complete your address information.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-neutral-900 dark:text-neutral-50">City</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="New York" 
                            {...field} 
                            className="h-12"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-neutral-900 dark:text-neutral-50">State/Province</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="NY" 
                            {...field} 
                            className="h-12"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-neutral-900 dark:text-neutral-50">Postal Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="10001" 
                            {...field} 
                            className="h-12"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-neutral-900 dark:text-neutral-50">Country</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Select your country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-80">
                            {countries.map((country) => (
                              <SelectItem key={country.value} value={country.value}>
                                <span className="flex items-center">
                                  <span className="mr-2">{country.flag}</span>
                                  {country.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            {subStep > 0 && (
              <Button
                type="button"
                onClick={handlePrevSubStep}
                variant="secondary"
                className="px-6"
                disabled={isSubmitting}
              >
                Previous
              </Button>
            )}
            {subStep === 0 && <div />}
            <Button
              type="button"
              onClick={handleNextSubStep}
              disabled={isSubmitting}
              className="px-6"
            >
              {isSubmitting ? 'Saving...' : subStep === 2 ? 'Next: Business Info' : 'Continue'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
} 