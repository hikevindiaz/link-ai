'use client';

import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Label } from '@/components/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function BusinessInformationTab() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [businessWebsite, setBusinessWebsite] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industryType, setIndustryType] = useState('');

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

  useEffect(() => {
    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();
      
      if (data.success) {
        setCompanyName(data.profile.companyName || '');
        setBusinessWebsite(data.profile.businessWebsite || '');
        setCompanySize(data.profile.companySize || '');
        setIndustryType(data.profile.industryType || '');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleUpdateBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/user/update-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          businessWebsite,
          companySize,
          industryType
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Business information updated successfully');
      } else {
        toast.error(data.message || 'Failed to update business information');
      }
    } catch (error) {
      console.error('Error updating business information:', error);
      toast.error('Failed to update business information');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleUpdateBusinessInfo}>
        <h2 className="font-semibold text-neutral-900 dark:text-neutral-50">
          Business Information
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
          Update your company details to help us customize your experience.
        </p>
        
        <div className="grid grid-cols-1 gap-6 mt-8 md:grid-cols-2">
          <div>
            <Label htmlFor="companyName" className="font-medium">
              Company Name
            </Label>
            <Input
              type="text"
              id="companyName"
              name="companyName"
              placeholder="Acme Inc."
              className="mt-2 w-full"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="businessWebsite" className="font-medium">
              Business Website (Optional)
            </Label>
            <Input
              type="text"
              id="businessWebsite"
              name="businessWebsite"
              placeholder="https://example.com"
              className="mt-2 w-full"
              value={businessWebsite}
              onChange={(e) => setBusinessWebsite(e.target.value)}
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2">
          <div>
            <Label htmlFor="companySize" className="font-medium">
              Company Size
            </Label>
            <Select 
              value={companySize} 
              onValueChange={setCompanySize}
            >
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {companySizes.map(size => (
                  <SelectItem key={size.id} value={size.id}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="industryType" className="font-medium">
              Industry Type
            </Label>
            <Select 
              value={industryType} 
              onValueChange={setIndustryType}
            >
              <SelectTrigger className="mt-2 w-full">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industryTypes.map(industry => (
                  <SelectItem key={industry.id} value={industry.id}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Button type="submit" className="mt-8" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Business Information'}
        </Button>
      </form>
    </div>
  );
} 