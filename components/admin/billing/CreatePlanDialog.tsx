'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/Select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { IconCheck, IconX, IconLoader2, IconPlus, IconTrash, IconCurrencyDollar, IconInfoCircle } from "@tabler/icons-react";
import { toast } from "sonner";

interface CreatePlanDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  templatePlan?: any;
  onPlanCreated?: () => void;
}

interface OverageRate {
  type: string;
  name: string;
  rate: number; // in cents
  enabled: boolean;
}

interface AddOnProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  enabled: boolean;
}

interface PlanConfiguration {
  // Basic Info
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: string;
  
  // Core Limits
  maxAgents: number;
  maxMessages: number;
  maxSMS: number;
  maxFiles: number;
  maxStorage: number; // in GB
  
  // Advanced Features
  maxWebSearches: number;
  maxVoiceMinutes: number;
  maxWhatsAppConversations: number;
  maxConversationSummaries: number;
  maxVoices: number;
  maxOrders: number; // -1 for unlimited
  maxForms: number;
  maxAppointments: number; // -1 for unlimited
  maxTickets: number; // -1 for unlimited
  maxKnowledgeSources: number;
  maxIntegrations: number;
  
  // Overage Pricing (in cents)
  overageRates: OverageRate[];
  
  // Add-on Products
  includedAddOns: string[]; // Array of add-on IDs
  
  // Feature Toggles
  features: {
    premiumSupport: boolean;
    brandingCustomization: boolean;
    advancedAnalytics: boolean;
    customTraining: boolean;
    prioritySupport: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    sso: boolean;
    customDomain: boolean;
  };
}

const defaultOverageRates: OverageRate[] = [
  { type: 'messages', name: 'Messages', rate: 3, enabled: true },
  { type: 'sms', name: 'SMS Messages', rate: 8, enabled: true },
  { type: 'webSearches', name: 'Web Searches', rate: 10, enabled: true },
  { type: 'voiceMinutes', name: 'Voice Minutes', rate: 15, enabled: true },
  { type: 'whatsappConversations', name: 'WhatsApp Conversations', rate: 7, enabled: true },
  { type: 'summaries', name: 'Conversation Summaries', rate: 5, enabled: true },
  { type: 'storage', name: 'Storage (per GB)', rate: 50, enabled: true },
  { type: 'apiCalls', name: 'API Calls (per 1000)', rate: 100, enabled: false },
];

const defaultConfiguration: PlanConfiguration = {
  name: '',
  description: '',
  price: 2900, // $29.00 in cents
  currency: 'usd',
  interval: 'month',
  
  maxAgents: 1,
  maxMessages: 1000,
  maxSMS: 25,
  maxFiles: 5,
  maxStorage: 1, // 1 GB
  
  maxWebSearches: 50,
  maxVoiceMinutes: 0,
  maxWhatsAppConversations: 25,
  maxConversationSummaries: 25,
  maxVoices: 1,
  maxOrders: 5,
  maxForms: 1,
  maxAppointments: 5,
  maxTickets: 0,
  maxKnowledgeSources: 3,
  maxIntegrations: 1,
  
  overageRates: [...defaultOverageRates],
  includedAddOns: [],
  
  features: {
    premiumSupport: false,
    brandingCustomization: false,
    advancedAnalytics: false,
    customTraining: false,
    prioritySupport: false,
    apiAccess: false,
    webhooks: false,
    sso: false,
    customDomain: false,
  },
};

export function CreatePlanDialog({ open, setOpen, templatePlan, onPlanCreated }: CreatePlanDialogProps) {
  const [config, setConfig] = useState<PlanConfiguration>(defaultConfiguration);
  const [availableAddOns, setAvailableAddOns] = useState<AddOnProduct[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch available add-ons
  useEffect(() => {
    if (open) {
      fetchAvailableAddOns();
    }
  }, [open]);

  const fetchAvailableAddOns = async () => {
    try {
      const response = await fetch('/api/admin/billing/add-ons');
      if (response.ok) {
        const data = await response.json();
        setAvailableAddOns(data.addOns || []);
      }
    } catch (error) {
      console.error('Error fetching add-ons:', error);
    }
  };

  // Initialize with template plan if provided
  useEffect(() => {
    if (open && templatePlan) {
      setConfig({
        ...defaultConfiguration,
        name: `${templatePlan.name} (Copy)`,
        description: templatePlan.description,
        price: templatePlan.price,
        currency: templatePlan.currency,
        interval: templatePlan.interval,
        maxAgents: parseInt(templatePlan.metadata.agents || '1'),
        maxMessages: parseInt(templatePlan.metadata.messagesIncluded || '1000'),
        maxSMS: parseInt(templatePlan.metadata.smsIncluded || '25'),
        maxWebSearches: parseInt(templatePlan.metadata.webSearchesIncluded || '50'),
        maxStorage: parseInt(templatePlan.metadata.storageIncluded || '1'),
      });
    } else if (open) {
      setConfig(defaultConfiguration);
    }
  }, [open, templatePlan]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSaveStatus('idle');
      setCurrentStep(1);
      setConfig(defaultConfiguration);
    }
  }, [open]);

  const handleSave = async () => {
    if (!config.name.trim()) {
      toast.error('Plan name is required');
      return;
    }

    setSaveStatus('saving');

    try {
      const response = await fetch('/api/admin/billing/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setSaveStatus('success');
        toast.success('Plan created successfully');
        
        setTimeout(() => {
          setOpen(false);
          onPlanCreated?.();
        }, 1500);
      } else {
        const error = await response.json();
        setSaveStatus('error');
        toast.error(error.message || 'Failed to create plan');
      }
    } catch (error) {
      setSaveStatus('error');
      toast.error('Failed to create plan');
      console.error('Error creating plan:', error);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const getSaveButtonContent = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <>
            <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Plan...
          </>
        );
      case 'success':
        return (
          <>
            <IconCheck className="h-4 w-4 mr-2" />
            Created
          </>
        );
      case 'error':
        return (
          <>
            <IconX className="h-4 w-4 mr-2" />
            Error
          </>
        );
      default:
        return 'Create Plan';
    }
  };

  const getSaveButtonClass = () => {
    switch (saveStatus) {
      case 'saving':
        return 'bg-neutral-600 text-white cursor-not-allowed';
      case 'success':
        return 'bg-emerald-600 text-white';
      case 'error':
        return 'bg-red-600 text-white';
      default:
        return '';
    }
  };

  const formatPrice = () => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: config.currency.toUpperCase(),
    }).format(config.price / 100);
  };

  const updateOverageRate = (type: string, field: 'rate' | 'enabled', value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      overageRates: prev.overageRates.map(rate => 
        rate.type === type ? { ...rate, [field]: value } : rate
      )
    }));
  };

  const addCustomOverage = () => {
    const customOverage: OverageRate = {
      type: `custom_${Date.now()}`,
      name: 'Custom Overage',
      rate: 10,
      enabled: true,
    };
    setConfig(prev => ({
      ...prev,
      overageRates: [...prev.overageRates, customOverage]
    }));
  };

  const removeOverage = (type: string) => {
    setConfig(prev => ({
      ...prev,
      overageRates: prev.overageRates.filter(rate => rate.type !== type)
    }));
  };

  const toggleAddOn = (addOnId: string) => {
    setConfig(prev => ({
      ...prev,
      includedAddOns: prev.includedAddOns.includes(addOnId)
        ? prev.includedAddOns.filter(id => id !== addOnId)
        : [...prev.includedAddOns, addOnId]
    }));
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
          Plan Information
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Set up the basic details for your new plan
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="plan-name" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Plan Name *
          </Label>
          <Input
            id="plan-name"
            value={config.name}
            onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Professional Plan"
            disabled={saveStatus === 'saving'}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan-description" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Description
          </Label>
          <Textarea
            id="plan-description"
            value={config.description}
            onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this plan includes and who it's for"
            disabled={saveStatus === 'saving'}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="plan-price" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Price (cents) *
            </Label>
            <Input
              id="plan-price"
              type="number"
              value={config.price}
              onChange={(e) => setConfig(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
              placeholder="2900"
              disabled={saveStatus === 'saving'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-currency" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Currency
            </Label>
            <Select value={config.currency} onValueChange={(value) => setConfig(prev => ({ ...prev, currency: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usd">USD ($)</SelectItem>
                <SelectItem value="eur">EUR (€)</SelectItem>
                <SelectItem value="gbp">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-interval" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Billing Interval
            </Label>
            <Select value={config.interval} onValueChange={(value) => setConfig(prev => ({ ...prev, interval: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2">
            <IconCurrencyDollar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Price Preview: {formatPrice()}/{config.interval}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCoreLimits = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
          Core Usage Limits
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Set the included amounts for core features
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Agents: {config.maxAgents}
          </Label>
          <Slider
            value={[config.maxAgents]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxAgents: value }))}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Number of AI agents users can create
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Messages: {config.maxMessages.toLocaleString()}
          </Label>
          <Slider
            value={[config.maxMessages]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxMessages: value }))}
            max={100000}
            min={100}
            step={100}
            className="w-full"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Monthly message quota included
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            SMS Messages: {config.maxSMS}
          </Label>
          <Slider
            value={[config.maxSMS]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxSMS: value }))}
            max={2000}
            min={0}
            step={25}
            className="w-full"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            SMS messages per month
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Documents: {config.maxFiles}
          </Label>
          <Slider
            value={[config.maxFiles]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxFiles: value }))}
            max={100}
            min={1}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Documents that can be uploaded
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Storage: {config.maxStorage} GB
          </Label>
          <Slider
            value={[config.maxStorage]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxStorage: value }))}
            max={1000}
            min={1}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Total storage space for files and data
          </p>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Knowledge Sources: {config.maxKnowledgeSources}
          </Label>
          <Slider
            value={[config.maxKnowledgeSources]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxKnowledgeSources: value }))}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Websites, documents, and data sources
          </p>
        </div>
      </div>
    </div>
  );

  const renderAdvancedLimits = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
          Advanced Features
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Configure advanced feature limits and capabilities
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Web Searches: {config.maxWebSearches}
          </Label>
          <Slider
            value={[config.maxWebSearches]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxWebSearches: value }))}
            max={5000}
            min={0}
            step={50}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Voice Minutes: {config.maxVoiceMinutes}
          </Label>
          <Slider
            value={[config.maxVoiceMinutes]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxVoiceMinutes: value }))}
            max={1000}
            min={0}
            step={10}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            WhatsApp Conversations: {config.maxWhatsAppConversations}
          </Label>
          <Slider
            value={[config.maxWhatsAppConversations]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxWhatsAppConversations: value }))}
            max={2000}
            min={0}
            step={25}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Conversation Summaries: {config.maxConversationSummaries}
          </Label>
          <Slider
            value={[config.maxConversationSummaries]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxConversationSummaries: value }))}
            max={5000}
            min={0}
            step={25}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Forms: {config.maxForms === -1 ? 'Unlimited' : config.maxForms}
          </Label>
          <div className="flex items-center space-x-2">
            <Slider
              value={[config.maxForms === -1 ? 100 : config.maxForms]}
              onValueChange={([value]) => setConfig(prev => ({ ...prev, maxForms: value }))}
              max={100}
              min={1}
              step={1}
              className="flex-1"
              disabled={config.maxForms === -1}
            />
            <Checkbox
              checked={config.maxForms === -1}
              onCheckedChange={(checked) => setConfig(prev => ({ 
                ...prev, 
                maxForms: checked ? -1 : 10 
              }))}
            />
            <Label className="text-xs">Unlimited</Label>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            Integrations: {config.maxIntegrations}
          </Label>
          <Slider
            value={[config.maxIntegrations]}
            onValueChange={([value]) => setConfig(prev => ({ ...prev, maxIntegrations: value }))}
            max={20}
            min={1}
            step={1}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );

  const renderOveragePricing = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
          Overage Pricing
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Set per-unit pricing when users exceed their limits
        </p>
      </div>

      <div className="space-y-4">
        {config.overageRates.map((rate, index) => (
          <div key={rate.type} className="flex items-center justify-between p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <Checkbox
                checked={rate.enabled}
                onCheckedChange={(checked) => updateOverageRate(rate.type, 'enabled', !!checked)}
              />
              <div>
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {rate.name}
                </Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Charged when users exceed their {rate.name.toLowerCase()} limit
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={rate.rate}
                onChange={(e) => updateOverageRate(rate.type, 'rate', parseInt(e.target.value) || 0)}
                className="w-20 text-right"
                disabled={!rate.enabled}
              />
              <span className="text-sm text-neutral-500">¢</span>
              {rate.type.startsWith('custom_') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => removeOverage(rate.type)}
                  className="p-1"
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        
        <Button
          variant="secondary"
          onClick={addCustomOverage}
          className="w-full"
        >
          <IconPlus className="h-4 w-4 mr-2" />
          Add Custom Overage
        </Button>
      </div>
    </div>
  );

  const renderAddOnsAndFeatures = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
          Add-ons & Features
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Include add-on products and enable premium features
        </p>
      </div>

      {/* Included Add-ons */}
      <div className="space-y-4">
        <h4 className="text-base font-normal text-neutral-700 dark:text-neutral-200">
          Included Add-on Products
        </h4>
        <div className="grid grid-cols-1 gap-3">
          {availableAddOns.map((addOn) => (
            <div key={addOn.id} className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={config.includedAddOns.includes(addOn.id)}
                  onCheckedChange={() => toggleAddOn(addOn.id)}
                />
                <div>
                  <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {addOn.name}
                  </Label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {addOn.description}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  ${addOn.price}/month
                </span>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {addOn.category}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Premium Features */}
      <div className="space-y-4">
        <h4 className="text-base font-normal text-neutral-700 dark:text-neutral-200">
          Premium Features
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(config.features).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div>
                <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {getFeatureDescription(key)}
                </p>
              </div>
              <Switch
                checked={value}
                onCheckedChange={(checked) => setConfig(prev => ({
                  ...prev,
                  features: { ...prev.features, [key]: checked }
                }))}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const getFeatureDescription = (feature: string) => {
    const descriptions: Record<string, string> = {
      premiumSupport: 'Priority email and chat support',
      brandingCustomization: 'Remove Link AI branding',
      advancedAnalytics: 'Detailed usage and performance analytics',
      customTraining: 'Train custom AI models on your data',
      prioritySupport: 'Dedicated support representative',
      apiAccess: 'Full API access for integrations',
      webhooks: 'Real-time webhook notifications',
      sso: 'Single Sign-On (SSO) authentication',
      customDomain: 'Custom domain for agent interfaces',
    };
    return descriptions[feature] || '';
  };

  const renderStepNavigation = () => (
    <div className="flex space-x-1 border-b border-neutral-200 dark:border-neutral-700">
      {[
        { step: 1, label: 'Basic Info', icon: IconInfoCircle },
        { step: 2, label: 'Core Limits', icon: IconCurrencyDollar },
        { step: 3, label: 'Advanced', icon: IconPlus },
        { step: 4, label: 'Overages', icon: IconCurrencyDollar },
        { step: 5, label: 'Add-ons', icon: IconPlus },
      ].map(({ step, label, icon: Icon }) => (
        <button
          key={step}
          onClick={() => setCurrentStep(step)}
          className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            currentStep === step
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 hover:bg-neutral-50 dark:hover:bg-neutral-800'
          }`}
        >
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal text-neutral-700 dark:text-neutral-200">
            {templatePlan ? 'Duplicate Plan' : 'Create Custom Plan'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step Navigation */}
          {renderStepNavigation()}

          {/* Step Content */}
          <div className="min-h-[500px] p-6">
            {currentStep === 1 && renderBasicInfo()}
            {currentStep === 2 && renderCoreLimits()}
            {currentStep === 3 && renderAdvancedLimits()}
            {currentStep === 4 && renderOveragePricing()}
            {currentStep === 5 && renderAddOnsAndFeatures()}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex space-x-3">
              {currentStep > 1 && (
                <Button
                  variant="secondary"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  disabled={saveStatus === 'saving'}
                >
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={handleCancel}
                disabled={saveStatus === 'saving'}
              >
                Cancel
              </Button>
              
              {currentStep < 5 ? (
                <Button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={saveStatus === 'saving'}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saveStatus === 'saving' || !config.name.trim()}
                  className={`transition-all duration-200 ${getSaveButtonClass()}`}
                >
                  {getSaveButtonContent()}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 