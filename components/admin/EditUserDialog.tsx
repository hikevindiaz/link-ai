'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  IconAlertTriangle, 
  IconMail, 
  IconUser, 
  IconBuilding, 
  IconWorld, 
  IconMapPin,
  IconCheck,
  IconX
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface EditUserDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  user: any;
  onUserUpdated?: (updatedUser: any) => void;
}

const roleOptions = [
  { label: 'User', value: 'USER' },
  { label: 'Admin', value: 'ADMIN' },
];

const companySizeOptions = [
  { label: 'Just me', value: 'just_me' },
  { label: '2-10 employees', value: '2_10' },
  { label: '11-50 employees', value: '11_50' },
  { label: '51-200 employees', value: '51_200' },
  { label: '201-500 employees', value: '201_500' },
  { label: '500+ employees', value: '500_plus' },
];

const industryOptions = [
  { label: 'Technology', value: 'technology' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Finance', value: 'finance' },
  { label: 'Education', value: 'education' },
  { label: 'Retail', value: 'retail' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Real Estate', value: 'real_estate' },
  { label: 'Other', value: 'other' },
];

const countryOptions = [
  { label: 'United States', value: 'US' },
  { label: 'Canada', value: 'CA' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'Australia', value: 'AU' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Other', value: 'other' },
];

export function EditUserDialog({ open, setOpen, user, onUserUpdated }: EditUserDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'USER',
    onboardingCompleted: false,
    inquiryEmailEnabled: true,
    marketingEmailEnabled: true,
    companyName: '',
    companySize: '',
    businessWebsite: '',
    industryType: 'other',
    country: 'US',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [mounted, setMounted] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(false);

  // Fetch complete user data when dialog opens
  useEffect(() => {
    if (open && user?.id) {
      const fetchCompleteUserData = async () => {
        setFetchingUser(true);
        try {
          const response = await fetch(`/api/admin/users/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            const completeUser = data.user;
            console.log('EditUserDialog - Complete user data fetched:', completeUser);
            
            setFormData({
              name: completeUser.name || '',
              email: completeUser.email || '',
              role: completeUser.role || 'USER',
              onboardingCompleted: completeUser.onboardingCompleted || false,
              inquiryEmailEnabled: completeUser.inquiryEmailEnabled ?? true,
              marketingEmailEnabled: completeUser.marketingEmailEnabled ?? true,
              companyName: completeUser.companyName || '',
              companySize: completeUser.companySize || '',
              businessWebsite: completeUser.businessWebsite || '',
              industryType: completeUser.industryType || 'other',
              country: completeUser.country || 'US',
              addressLine1: completeUser.addressLine1 || '',
              addressLine2: completeUser.addressLine2 || '',
              city: completeUser.city || '',
              state: completeUser.state || '',
              postalCode: completeUser.postalCode || '',
            });
          }
        } catch (error) {
          console.error('Error fetching complete user data:', error);
        } finally {
          setFetchingUser(false);
        }
      };

      fetchCompleteUserData();
    }
  }, [open, user?.id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !user) return null;

  if (fetchingUser) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
          <DialogHeader>
            <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
              Edit User Profile
            </DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 dark:text-neutral-400">
              Loading user information...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus('saving');

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          role: formData.role,
          onboardingCompleted: formData.onboardingCompleted,
          inquiryEmailEnabled: formData.inquiryEmailEnabled,
          marketingEmailEnabled: formData.marketingEmailEnabled,
          companyName: formData.companyName,
          companySize: formData.companySize,
          businessWebsite: formData.businessWebsite,
          industryType: formData.industryType,
          country: formData.country,
          addressLine1: formData.addressLine1,
          addressLine2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          postalCode: formData.postalCode,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setSaveStatus('success');
        onUserUpdated?.(updatedUser.user);
        
        // Show success state for 1.5 seconds before closing
        setTimeout(() => {
          setOpen(false);
          setSaveStatus('idle');
        }, 1500);
      } else {
        const error = await response.json();
        console.error('Failed to update user:', error);
        setSaveStatus('error');
        
        // Reset to idle after showing error for 2 seconds
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      setSaveStatus('error');
      
      // Reset to idle after showing error for 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge className="bg-neutral-100 text-neutral-800 dark:bg-neutral-400/10 dark:text-neutral-400">Admin</Badge>;
      case 'USER':
      default:
        return <Badge className="bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300">User</Badge>;
    }
  };

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Saving...</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2">
            <IconCheck className="h-4 w-4 shrink-0" />
            <span>Saved</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2">
            <IconX className="h-4 w-4 shrink-0" />
            <span>Error</span>
          </div>
        );
      default:
        return 'Save Changes';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            Edit User Profile
          </DialogTitle>
          <DialogDescription className="pb-4 text-sm text-neutral-500 dark:text-neutral-400">
            Update user information and account settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconUser className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
              <h3 className="text-base font-normal text-neutral-700 dark:text-neutral-200">
                Basic Information
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="mt-1"
                />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="email" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    Email Address
                  </Label>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
                    <IconAlertTriangle className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span className="text-[10px] text-amber-700 dark:text-amber-300">
                      Cannot be changed
                    </span>
                  </div>
                </div>
                <div className="relative mt-1">
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="bg-white dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500 cursor-not-allowed pl-10 opacity-60"
                  />
                  <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 shrink-0 text-neutral-400 opacity-60" />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="role" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Role
              </Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className="bg-neutral-200 dark:bg-neutral-700" />

          {/* Company Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconBuilding className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
              <h3 className="text-base font-normal text-neutral-700 dark:text-neutral-200">
                Company Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Company Name
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Enter company name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="businessWebsite" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Business Website
                </Label>
                <div className="relative">
                  <Input
                    id="businessWebsite"
                    value={formData.businessWebsite}
                    onChange={(e) => setFormData({ ...formData, businessWebsite: e.target.value })}
                    placeholder="https://example.com"
                    className="mt-1 pl-10"
                  />
                  <IconWorld className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 shrink-0 text-neutral-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companySize" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Company Size
                </Label>
                <Select value={formData.companySize} onValueChange={(value) => setFormData({ ...formData, companySize: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySizeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="industryType" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Industry
                </Label>
                <Select value={formData.industryType} onValueChange={(value) => setFormData({ ...formData, industryType: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-neutral-200 dark:bg-neutral-700" />

          {/* Address Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <IconMapPin className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
              <h3 className="text-base font-normal text-neutral-700 dark:text-neutral-200">
                Address Information
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="addressLine1" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Address Line 1
                </Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  placeholder="Street address"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="addressLine2" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Address Line 2 (Optional)
                </Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  placeholder="Apartment, suite, etc."
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="city" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  City
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="state" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  State/Province
                </Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="postalCode" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Postal Code
                </Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder="ZIP/Postal"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="country" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  Country
                </Label>
                <Select value={formData.country} onValueChange={(value) => setFormData({ ...formData, country: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-neutral-200 dark:bg-neutral-700" />

          {/* Account Settings */}
          <div className="space-y-4">
            <h3 className="text-base font-normal text-neutral-700 dark:text-neutral-200">
              Account Settings
            </h3>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="onboardingCompleted"
                  checked={formData.onboardingCompleted}
                  onCheckedChange={(checked) => setFormData({ ...formData, onboardingCompleted: checked })}
                />
                <Label htmlFor="onboardingCompleted" className="text-sm text-neutral-700 dark:text-neutral-200">
                  Onboarding Complete
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="inquiryEmailEnabled"
                  checked={formData.inquiryEmailEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, inquiryEmailEnabled: checked })}
                />
                <Label htmlFor="inquiryEmailEnabled" className="text-sm text-neutral-700 dark:text-neutral-200">
                  Enable inquiry emails
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="marketingEmailEnabled"
                  checked={formData.marketingEmailEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, marketingEmailEnabled: checked })}
                />
                <Label htmlFor="marketingEmailEnabled" className="text-sm text-neutral-700 dark:text-neutral-200">
                  Enable marketing emails
                </Label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || saveStatus === 'success'}
              className={cn(
                "transition-all duration-200 min-w-[120px]",
                saveStatus === 'success' && "bg-green-600 hover:bg-green-600 text-white",
                saveStatus === 'error' && "bg-red-600 hover:bg-red-600 text-white",
                (saveStatus === 'idle' || saveStatus === 'saving') && "bg-neutral-800 hover:bg-neutral-700 text-white"
              )}
            >
              {getSaveButtonContent()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 