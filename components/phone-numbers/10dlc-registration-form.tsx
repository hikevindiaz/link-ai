"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icons } from '@/components/icons';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiTimeLine, RiErrorWarningFill, RiShieldCheckLine } from '@remixicon/react';
import axios from 'axios';

interface PhoneNumber10DLCFormProps {
  phoneNumber: {
    id: string;
    number: string;
    a2pRegistrationStatus?: string | null;
    a2pRegistrationError?: string | null;
    a2pRegisteredAt?: string | null;
  };
  onStatusUpdate?: () => void;
}

interface BusinessInfo {
  companyName: string;
  businessWebsite: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  industryType: string;
}

export function PhoneNumber10DLCForm({ phoneNumber, onStatusUpdate }: PhoneNumber10DLCFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBusinessInfo, setIsLoadingBusinessInfo] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    companyName: '',
    businessWebsite: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    industryType: 'other'
  });

  const registrationStatus = phoneNumber.a2pRegistrationStatus || 'not_started';
  
  // Load existing business info
  useEffect(() => {
    loadBusinessInfo();
  }, []);

  const loadBusinessInfo = async () => {
    try {
      setIsLoadingBusinessInfo(true);
      const response = await axios.get('/api/user/business-info');
      if (response.data.success) {
        const data = response.data.businessInfo;
        setBusinessInfo({
          companyName: data.companyName || '',
          businessWebsite: data.businessWebsite || '',
          addressLine1: data.addressLine1 || '',
          addressLine2: data.addressLine2 || '',
          city: data.city || '',
          state: data.state || '',
          postalCode: data.postalCode || '',
          country: data.country || 'US',
          industryType: data.industryType || 'other'
        });
      }
    } catch (error) {
      console.error('Error loading business info:', error);
    } finally {
      setIsLoadingBusinessInfo(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!businessInfo.companyName || !businessInfo.addressLine1 || !businessInfo.city || 
        !businessInfo.state || !businessInfo.postalCode) {
      toast.error('Please fill in all required business information fields');
      return;
    }

    setIsLoading(true);
    try {
      // First update business info
      const businessInfoResponse = await axios.post('/api/user/business-info', businessInfo);
      if (!businessInfoResponse.data.success) {
        throw new Error('Failed to update business information');
      }

      // Then submit 10DLC registration
      const registrationResponse = await axios.post(`/api/twilio/phone-numbers/${phoneNumber.id}/register-10dlc`);
      
      if (registrationResponse.data.success) {
        toast.success('10DLC registration submitted successfully! We\'ll notify you once it\'s approved.');
        if (onStatusUpdate) {
          onStatusUpdate();
        }
      } else {
        throw new Error(registrationResponse.data.error || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Error submitting 10DLC registration:', error);
      toast.error(error.response?.data?.error || 'Failed to submit registration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = () => {
    switch (registrationStatus) {
      case 'not_started':
        return (
          <div className="flex items-center gap-2 text-gray-500">
            <RiShieldCheckLine className="h-5 w-5" />
            <span>Not Started</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 text-indigo-600">
            <RiTimeLine className="h-5 w-5 animate-pulse" />
            <span>Registration Pending</span>
          </div>
        );
      case 'approved':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <RiCheckboxCircleFill className="h-5 w-5" />
            <span>Verified</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <RiErrorWarningFill className="h-5 w-5" />
            <span>Registration Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card id="verification-section" className="overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icons.lock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Phone Number Verification (10DLC)
            </h4>
          </div>
          {getStatusDisplay()}
        </div>
      </div>

      <div className="p-4">
        {registrationStatus === 'approved' ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <RiCheckboxCircleFill className="mx-auto h-12 w-12 text-green-500 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">Verification Complete!</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Your phone number is verified and ready to send SMS messages.
              </p>
              {phoneNumber.a2pRegisteredAt && (
                <p className="mt-4 text-xs text-gray-400">
                  Verified on {new Date(phoneNumber.a2pRegisteredAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ) : registrationStatus === 'pending' ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600"></div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-50">Verification In Progress</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Your verification is being processed. This typically takes 1-2 business days.
              </p>
              <p className="mt-4 text-xs text-gray-400">
                We'll notify you via email once your verification is complete.
              </p>
            </div>
          </div>
        ) : registrationStatus === 'rejected' ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
              <div className="flex">
                <RiErrorWarningFill className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    Verification Rejected
                  </h3>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {phoneNumber.a2pRegistrationError || 'Your verification was rejected. Please review your business information and try again.'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-50 mb-4">
                Update Your Business Information
              </h5>
              {/* Form continues below */}
            </div>
          </div>
        ) : null}

        {(registrationStatus === 'not_started' || registrationStatus === 'rejected' || registrationStatus === 'requires_attention') && (
          <div className="space-y-4">
            {registrationStatus === 'not_started' && (
              <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-200 dark:border-indigo-800">
                <h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200 mb-2">
                  Why is verification required?
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  Mobile carriers require businesses to verify their identity to send SMS messages. This one-time process helps prevent spam and ensures your messages reach your customers.
                </p>
              </div>
            )}

            {isLoadingBusinessInfo ? (
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="companyName" className="text-sm">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={businessInfo.companyName}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, companyName: e.target.value })}
                    placeholder="Your Company Name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="businessWebsite" className="text-sm">
                    Business Website
                  </Label>
                  <Input
                    id="businessWebsite"
                    type="url"
                    value={businessInfo.businessWebsite}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, businessWebsite: e.target.value })}
                    placeholder="https://www.example.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="industryType" className="text-sm">
                    Industry Type <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={businessInfo.industryType}
                    onValueChange={(value) => setBusinessInfo({ ...businessInfo, industryType: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select your industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="consulting">Consulting</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="addressLine1" className="text-sm">
                      Address Line 1 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="addressLine1"
                      value={businessInfo.addressLine1}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, addressLine1: e.target.value })}
                      placeholder="123 Main Street"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine2" className="text-sm">
                      Address Line 2
                    </Label>
                    <Input
                      id="addressLine2"
                      value={businessInfo.addressLine2}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, addressLine2: e.target.value })}
                      placeholder="Suite 100"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="city" className="text-sm">
                      City <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="city"
                      value={businessInfo.city}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, city: e.target.value })}
                      placeholder="San Francisco"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-sm">
                      State <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="state"
                      value={businessInfo.state}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, state: e.target.value })}
                      placeholder="CA"
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="postalCode" className="text-sm">
                      Postal Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="postalCode"
                      value={businessInfo.postalCode}
                      onChange={(e) => setBusinessInfo({ ...businessInfo, postalCode: e.target.value })}
                      placeholder="94105"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This information will be used to verify your business with mobile carriers. Ensure all details are accurate.
                  </p>
                </div>

                <div className="flex justify-end mt-4">
                  <Button 
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Verification'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
} 