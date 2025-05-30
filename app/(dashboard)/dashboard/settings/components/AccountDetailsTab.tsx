'use client';

import { Button } from '@/components/Button';
import { Divider } from '@/components/Divider';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function AccountDetailsTab() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');

  useEffect(() => {
    if (session?.user) {
      setEmail(session.user.email || '');
      setName(session.user.name || '');
      fetchUserPreferences();
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      const data = await response.json();
      
      if (data.success) {
        setNotificationsEnabled(data.preferences.inquiryEmailEnabled);
        setMarketingEnabled(data.preferences.marketingEmailEnabled);
      }
    } catch (error) {
      console.error('Failed to fetch user preferences:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      
      if (data.success) {
        setName(data.profile.fullName || '');
        setAddressLine1(data.profile.addressLine1 || '');
        setAddressLine2(data.profile.addressLine2 || '');
        setCity(data.profile.city || '');
        setState(data.profile.state || '');
        setPostalCode(data.profile.postalCode || '');
        setCountry(data.profile.country || '');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          name,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/update-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inquiryEmailEnabled: notificationsEnabled,
          marketingEmailEnabled: marketingEnabled,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Notification preferences updated successfully');
      } else {
        toast.error(data.message || 'Failed to update notification preferences');
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleUpdateProfile}>
        <h2 className="font-semibold text-gray-900 dark:text-gray-50">
          Personal Information
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
          Update your personal information associated with this account.
        </p>
        <div className="mt-6">
          <Label htmlFor="fullName" className="font-medium">
            Full Name
          </Label>
          <Input
            type="text"
            id="fullName"
            name="fullName"
            placeholder="John Smith"
            className="mt-2 w-full sm:max-w-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mt-6">
          <Label htmlFor="email" className="font-medium">
            Email Address
          </Label>
          <Input
            type="email"
            id="email"
            name="email"
            placeholder="john@company.com"
            className="mt-2 w-full sm:max-w-lg"
            value={email}
            disabled
          />
          <p className="mt-1 text-xs text-gray-500">
            Your email is used for login and cannot be changed.
          </p>
        </div>

        <div className="space-y-6 mt-8">
          <h3 className="text-lg font-medium">Address Information</h3>
          
          <div>
            <Label htmlFor="addressLine1" className="font-medium">
              Address Line 1
            </Label>
            <Input
              type="text"
              id="addressLine1"
              name="addressLine1"
              placeholder="123 Main St"
              className="mt-2 w-full sm:max-w-lg"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="addressLine2" className="font-medium">
              Address Line 2 (Optional)
            </Label>
            <Input
              type="text"
              id="addressLine2"
              name="addressLine2"
              placeholder="Apartment, suite, etc."
              className="mt-2 w-full sm:max-w-lg"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <Label htmlFor="city" className="font-medium">
                City
              </Label>
              <Input
                type="text"
                id="city"
                name="city"
                placeholder="New York"
                className="mt-2 w-full"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="state" className="font-medium">
                State/Province
              </Label>
              <Input
                type="text"
                id="state"
                name="state"
                placeholder="NY"
                className="mt-2 w-full"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="postalCode" className="font-medium">
                Postal Code
              </Label>
              <Input
                type="text"
                id="postalCode"
                name="postalCode"
                placeholder="10001"
                className="mt-2 w-full"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="country" className="font-medium">
              Country
            </Label>
            <Select 
              value={country} 
              onValueChange={setCountry}
            >
              <SelectTrigger className="mt-2 w-full sm:max-w-lg">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="GB">United Kingdom</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="DE">Germany</SelectItem>
                <SelectItem value="FR">France</SelectItem>
                <SelectItem value="JP">Japan</SelectItem>
                <SelectItem value="CN">China</SelectItem>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="BR">Brazil</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button type="submit" className="mt-6" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Information'}
        </Button>
      </form>

      <Divider className="my-8" />
      
      <form onSubmit={handleUpdateNotifications}>
        <h2 className="font-semibold text-gray-900 dark:text-gray-50">
          Notification Settings
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-500">
          Configure how and when you receive notifications.
        </p>
        
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1 mr-4">
              <Label htmlFor="notifications" className="text-sm font-medium">
                Inquiry Notifications
              </Label>
              <p className="text-xs text-gray-500">
                Receive email notifications when there are new inquiries.
              </p>
            </div>
            <Switch 
              id="notifications" 
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1 mr-4">
              <Label htmlFor="marketing" className="text-sm font-medium">
                Marketing Emails
              </Label>
              <p className="text-xs text-gray-500">
                Receive emails about new features and product updates.
              </p>
            </div>
            <Switch 
              id="marketing" 
              checked={marketingEnabled}
              onCheckedChange={setMarketingEnabled}
            />
          </div>
        </div>
        
        <Button type="submit" className="mt-6" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Notification Settings'}
        </Button>
      </form>
    </>
  );
} 